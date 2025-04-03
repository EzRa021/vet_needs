// Helper function to sanitize item data
const sanitizeItemData = (item) => ({
    _id: item.id, // Use _id for CouchDB/PouchDB
    branchId: item.branchId,
    branchName: item.branchName || null,
    departmentId: item.departmentId || null,
    departmentName: item.departmentName || null,
    categoryId: item.categoryId || null,
    categoryName: item.categoryName || null,
    name: item.name || "Unnamed",
    description: item.description || null,
    costPrice: parseFloat(item.costPrice || 0),
    sellingPrice: parseFloat(item.sellingPrice || 0),
    discountPrice: parseFloat(item.discountPrice || 0),
    inStock: item.inStock ? true : false,
    stockManagement: item.stockManagement || {},
    createdBy: item.createdBy || "unknown",
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  // Fastify plugin export
  export default async function (fastify, opts) {
    // GET - Fetch items by branchId and optionally by id
    fastify.get("/", async (req, reply) => {
      const { branchId, id } = req.query;
      const db = req.pouchDB; // Use PouchDB instance from main/index.js
  
      if (!branchId) {
        return reply.status(400).send({ message: "Branch ID is required" });
      }
  
      try {
        const result = await db.allDocs({
          include_docs: true,
          attachments: false,
        });
  
        let items = result.rows
          .map((row) => {
            const doc = row.doc;
            return {
              id: doc._id,
              branchId: doc.branchId,
              branchName: doc.branchName,
              departmentId: doc.departmentId,
              departmentName: doc.departmentName,
              categoryId: doc.categoryId,
              categoryName: doc.categoryName,
              name: doc.name,
              description: doc.description,
              costPrice: doc.costPrice,
              sellingPrice: doc.sellingPrice,
              discountPrice: doc.discountPrice,
              inStock: Boolean(doc.inStock),
              stockManagement: doc.stockManagement || {},
              createdBy: doc.createdBy,
              createdAt: doc.createdAt,
              updatedAt: doc.updatedAt,
            };
          })
          .filter((item) => item.branchId === branchId);
  
        if (id) {
          const item = items.find((item) => item.id === id);
          if (!item) {
            return reply.status(404).send({ message: "Item not found" });
          }
          return reply.send(item);
        }
  
        return reply.send(items);
      } catch (error) {
        console.error("Error fetching items:", error);
        return reply.status(500).send({ message: "Error fetching items", error: error.message });
      }
    });
  
    // POST - Add a new item
    fastify.post("/", async (req, reply) => {
      const db = req.pouchDB; // Use PouchDB instance from main/index.js
  
      try {
        const itemData = req.body;
  
        if (!itemData.id || !itemData.branchId || !itemData.name) {
          return reply.status(400).send({
            message: "Required fields missing: id, branchId, name",
          });
        }
  
        // Check if document with this ID already exists
        try {
          await db.get(itemData.id);
          return reply.status(409).send({ message: "Item with this ID already exists" });
        } catch (err) {
          if (err.name !== "not_found") {
            throw err;
          }
        }
  
        const sanitizedData = sanitizeItemData(itemData);
        const response = await db.put(sanitizedData);
  
        return reply.send({
          id: sanitizedData.id,
          rev: response.rev,
          message: "Item added successfully",
        });
      } catch (error) {
        console.error("Error adding item:", error);
        return reply.status(500).send({ message: "Error adding item", error: error.message });
      }
    });
  
    // PUT - Update an item
    fastify.put("/:id", async (req, reply) => {
      const db = req.pouchDB; // Use PouchDB instance from main/index.js
  
      try {
        const { id } = req.params;
        const itemData = req.body;
  
        // Get the current document to retrieve its revision
        let doc;
        try {
          doc = await db.get(id);
        } catch (err) {
          if (err.name === "not_found") {
            return reply.status(404).send({ message: "Item not found" });
          }
          throw err;
        }
  
        const sanitizedData = sanitizeItemData({ id, ...itemData });
  
        // Keep the _rev from the existing document
        sanitizedData._rev = doc._rev;
  
        const response = await db.put(sanitizedData);
  
        return reply.send({
          message: "Item updated successfully",
          rev: response.rev,
        });
      } catch (error) {
        console.error("Error updating item:", error);
        return reply.status(500).send({ message: "Error updating item", error: error.message });
      }
    });
  
    // DELETE - Delete an item
    fastify.delete("/:id", async (req, reply) => {
      const db = req.pouchDB; // Use PouchDB instance from main/index.js
  
      try {
        const { id } = req.params;
  
        // Get the current document to retrieve its revision
        let doc;
        try {
          doc = await db.get(id);
        } catch (err) {
          if (err.name === "not_found") {
            return reply.status(404).send({ message: "Item not found" });
          }
          throw err;
        }
  
        const response = await db.remove(doc);
  
        return reply.send({
          message: "Item deleted successfully",
          rev: response.rev,
        });
      } catch (error) {
        console.error("Error deleting item:", error);
        return reply.status(500).send({ message: "Error deleting item", error: error.message });
      }
    });
  
    // DELETE - Delete all items for a branch
    fastify.delete("/all", async (req, reply) => {
      const db = req.pouchDB; // Use PouchDB instance from main/index.js
      const { branchId } = req.body;
  
      if (!branchId) {
        return reply.status(400).send({ message: "Branch ID is required" });
      }
  
      try {
        const result = await db.allDocs({
          include_docs: true,
          attachments: false,
        });
  
        const itemsToDelete = result.rows
          .filter((row) => row.doc.branchId === branchId)
          .map((row) => ({ _id: row.doc._id, _rev: row.doc._rev }));
  
        if (itemsToDelete.length === 0) {
          return reply.status(404).send({ message: "No items found for this branch" });
        }
  
        const response = await db.bulkDocs(itemsToDelete.map((item) => ({ ...item, _deleted: true })));
  
        return reply.send({
          message: "All items deleted successfully",
          deletedCount: itemsToDelete.length,
        });
      } catch (error) {
        console.error("Error deleting all items:", error);
        return reply.status(500).send({ message: "Error deleting all items", error: error.message });
      }
    });
  
    // POST - Trigger sync with remote CouchDB
    fastify.post("/sync", async (req, reply) => {
      const localDB = req.pouchDB;
      const remoteURL = req.couchDBUrl;
  
      try {
        const remoteDB = new PouchDB(remoteURL, {
          auth: {
            username: req.couchDBUsername || "admin",
            password: req.couchDBPassword || "password",
          },
        });
  
        const syncResult = await localDB.sync(remoteDB, {
          live: false,
          retry: true,
        });
  
        return reply.send({
          message: "Sync completed successfully",
          pushed: syncResult.push?.docs_written || 0,
          pulled: syncResult.pull?.docs_written || 0,
        });
      } catch (error) {
        console.error("Error syncing with remote CouchDB:", error);
        return reply.status(500).send({
          message: "Error syncing with remote CouchDB",
          error: error.message,
        });
      }
    });
  }