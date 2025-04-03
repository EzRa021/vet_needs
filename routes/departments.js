// Helper function to sanitize department data
const sanitizeDepartmentData = (department) => ({
  _id: department.id, // Use _id for CouchDB/PouchDB
  branchId: department.branchId,
  name: department.name || "Unnamed",
  createdBy: department.createdBy || "unknown",
  createdAt: department.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Fastify plugin export
export default async function (fastify, opts) {
  // GET - Fetch all departments by branchId
  fastify.get("/", async (req, reply) => {
    const { branchId } = req.query;
    const db = req.pouchDB; // Use PouchDB instance from main/index.js

    if (!branchId) {
      return reply.status(400).send({ message: "Branch ID is required" });
    }

    try {
      const result = await db.allDocs({
        include_docs: true,
        attachments: false,
      });

      const departments = result.rows
        .map((row) => {
          const doc = row.doc;
          return {
            id: doc._id,
            branchId: doc.branchId,
            name: doc.name,
            createdBy: doc.createdBy,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
          };
        })
        .filter((dept) => dept.branchId === branchId);

      return reply.send(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      return reply.status(500).send({ message: "Error fetching departments", error: error.message });
    }
  });

  // POST - Add a new department
  fastify.post("/", async (req, reply) => {
    const db = req.pouchDB; // Use PouchDB instance from main/index.js

    try {
      const departmentData = req.body;

      if (!departmentData.id || !departmentData.branchId || !departmentData.name) {
        return reply.status(400).send({ message: "Required fields missing: id, branchId, name" });
      }

      // Check if document with this ID already exists
      try {
        await db.get(departmentData.id);
        return reply.status(409).send({ message: "Department with this ID already exists" });
      } catch (err) {
        if (err.name !== "not_found") {
          throw err;
        }
      }

      const sanitizedData = sanitizeDepartmentData(departmentData);
      const response = await db.put(sanitizedData);

      return reply.send({
        id: sanitizedData.id,
        rev: response.rev,
        message: "Department added successfully",
      });
    } catch (error) {
      console.error("Error adding department:", error);
      return reply.status(500).send({ message: "Error adding department", error: error.message });
    }
  });

  // PUT - Update a department
  fastify.put("/:id", async (req, reply) => {
    const db = req.pouchDB; // Use PouchDB instance from main/index.js

    try {
      const { id } = req.params;
      const departmentData = req.body;

      // Get the current document to retrieve its revision
      let doc;
      try {
        doc = await db.get(id);
      } catch (err) {
        if (err.name === "not_found") {
          return reply.status(404).send({ message: "Department not found" });
        }
        throw err;
      }

      const sanitizedData = sanitizeDepartmentData({ id, ...departmentData });

      // Keep the _rev from the existing document
      sanitizedData._rev = doc._rev;

      const response = await db.put(sanitizedData);

      return reply.send({
        message: "Department updated successfully",
        rev: response.rev,
      });
    } catch (error) {
      console.error("Error updating department:", error);
      return reply.status(500).send({ message: "Error updating department", error: error.message });
    }
  });

  // DELETE - Delete a department
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
          return reply.status(404).send({ message: "Department not found" });
        }
        throw err;
      }

      const response = await db.remove(doc);

      return reply.send({
        message: "Department deleted successfully",
        rev: response.rev,
      });
    } catch (error) {
      console.error("Error deleting department:", error);
      return reply.status(500).send({ message: "Error deleting department", error: error.message });
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