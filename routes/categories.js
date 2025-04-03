// Helper function to sanitize category data
const sanitizeCategoryData = (category) => ({
  _id: category.id, // Use _id for CouchDB/PouchDB
  branchId: category.branchId,
  departmentId: category.departmentId,
  name: category.name || "Unnamed",
  description: category.description || null,
  createdBy: category.createdBy || "unknown",
  createdAt: category.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Fastify plugin export
export default async function (fastify, opts) {
  // GET - Fetch all categories by branchId and departmentId
  fastify.get("/", async (req, reply) => {
    const { branchId, departmentId } = req.query;
    const db = req.pouchDB; // Use PouchDB instance from main/index.js

    if (!branchId || !departmentId) {
      return reply.status(400).send({ message: "Branch ID and Department ID are required" });
    }

    try {
      const result = await db.allDocs({
        include_docs: true,
        attachments: false,
      });

      const categories = result.rows
        .map((row) => {
          const doc = row.doc;
          return {
            id: doc._id,
            branchId: doc.branchId,
            departmentId: doc.departmentId,
            name: doc.name,
            description: doc.description,
            createdBy: doc.createdBy,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
          };
        })
        .filter((cat) => cat.branchId === branchId && cat.departmentId === departmentId);

      return reply.send(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      return reply.status(500).send({ message: "Error fetching categories", error: error.message });
    }
  });

  // POST - Add a new category
  fastify.post("/", async (req, reply) => {
    const db = req.pouchDB; // Use PouchDB instance from main/index.js

    try {
      const categoryData = req.body;

      if (!categoryData.id || !categoryData.branchId || !categoryData.departmentId || !categoryData.name) {
        return reply.status(400).send({
          message: "Required fields missing: id, branchId, departmentId, name",
        });
      }

      // Check if document with this ID already exists
      try {
        await db.get(categoryData.id);
        return reply.status(409).send({ message: "Category with this ID already exists" });
      } catch (err) {
        if (err.name !== "not_found") {
          throw err;
        }
      }

      const sanitizedData = sanitizeCategoryData(categoryData);
      const response = await db.put(sanitizedData);

      return reply.send({
        id: sanitizedData.id,
        rev: response.rev,
        message: "Category added successfully",
      });
    } catch (error) {
      console.error("Error adding category:", error);
      return reply.status(500).send({ message: "Error adding category", error: error.message });
    }
  });

  // PUT - Update a category
  fastify.put("/:id", async (req, reply) => {
    const db = req.pouchDB; // Use PouchDB instance from main/index.js

    try {
      const { id } = req.params;
      const categoryData = req.body;

      // Get the current document to retrieve its revision
      let doc;
      try {
        doc = await db.get(id);
      } catch (err) {
        if (err.name === "not_found") {
          return reply.status(404).send({ message: "Category not found" });
        }
        throw err;
      }

      const sanitizedData = sanitizeCategoryData({ id, ...categoryData });

      // Keep the _rev from the existing document
      sanitizedData._rev = doc._rev;

      const response = await db.put(sanitizedData);

      return reply.send({
        message: "Category updated successfully",
        rev: response.rev,
      });
    } catch (error) {
      console.error("Error updating category:", error);
      return reply.status(500).send({ message: "Error updating category", error: error.message });
    }
  });

  // DELETE - Delete a category
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
          return reply.status(404).send({ message: "Category not found" });
        }
        throw err;
      }

      const response = await db.remove(doc);

      return reply.send({
        message: "Category deleted successfully",
        rev: response.rev,
      });
    } catch (error) {
      console.error("Error deleting category:", error);
      return reply.status(500).send({ message: "Error deleting category", error: error.message });
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