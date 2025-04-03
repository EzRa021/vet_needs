import { v4 as uuidv4 } from "uuid";

// Helper function to sanitize report data
const sanitizeReportData = (report) => ({
  _id: report.id || uuidv4(),
  branchId: report.branchId,
  content: report.content || "",
  createdAt: report.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Fastify plugin export
export default async function (fastify, opts) {
  // GET - Fetch reports by branchId and optional date range
  fastify.get("/", async (req, reply) => {
    const { branchId, date } = req.query;
    const db = req.pouchDB;

    if (!branchId) {
      return reply.status(400).send({ message: "Branch ID is required" });
    }

    try {
      const result = await db.allDocs({
        include_docs: true,
        attachments: false,
      });

      let reports = result.rows
        .map((row) => ({
          id: row.doc._id,
          branchId: row.doc.branchId,
          content: row.doc.content,
          createdAt: row.doc.createdAt,
          updatedAt: row.doc.updatedAt,
        }))
        .filter((rep) => rep.branchId === branchId);

      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        reports = reports.filter((report) => {
          const reportDate = new Date(report.createdAt);
          return reportDate >= startOfDay && reportDate <= endOfDay;
        });
      }

      // Sort descending by createdAt
      reports = reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return reply.send(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      return reply.status(500).send({
        message: "Error fetching reports",
        error: error.message,
      });
    }
  });

  // POST - Create a new report
  fastify.post("/", async (req, reply) => {
    const { branchId, content } = req.body;
    const db = req.pouchDB;

    if (!branchId || !content) {
      return reply.status(400).send({
        message: "Required fields missing: branchId, content",
      });
    }

    try {
      const sanitizedData = sanitizeReportData({
        branchId,
        content,
      });

      const response = await db.put(sanitizedData);

      return reply.send({
        message: "Report created successfully",
        report: { ...sanitizedData, id: sanitizedData._id },
        rev: response.rev,
      });
    } catch (error) {
      console.error("Error creating report:", error);
      return reply.status(500).send({
        message: "Error creating report",
        error: error.message,
      });
    }
  });

  // PUT - Update an existing report
  fastify.put("/:id", async (req, reply) => {
    const { id } = req.params;
    const { branchId, content } = req.body;
    const db = req.pouchDB;

    if (!id || !branchId || !content) {
      return reply.status(400).send({
        message: "Required fields missing: id, branchId, content",
      });
    }

    try {
      const doc = await db.get(id);
      if (doc.branchId !== branchId) {
        return reply.status(403).send({ message: "Branch ID mismatch" });
      }

      const sanitizedData = sanitizeReportData({
        ...doc,
        branchId,
        content,
        createdAt: doc.createdAt, // Preserve original creation timestamp
      });

      const response = await db.put({ ...sanitizedData, _rev: doc._rev });

      return reply.send({
        message: "Report updated successfully",
        report: { ...sanitizedData, id: sanitizedData._id },
        rev: response.rev,
      });
    } catch (error) {
      console.error("Error updating report:", error);
      return reply.status(500).send({
        message: "Error updating report",
        error: error.message,
      });
    }
  });

  // DELETE - Remove a report
  fastify.delete("/:id", async (req, reply) => {
    const { id } = req.params;
    const { branchId } = req.body;
    const db = req.pouchDB;

    if (!id || !branchId) {
      return reply.status(400).send({
        message: "Required fields missing: id, branchId",
      });
    }

    try {
      const doc = await db.get(id);
      if (doc.branchId !== branchId) {
        return reply.status(403).send({ message: "Branch ID mismatch" });
      }

      const response = await db.remove(doc);

      return reply.send({
        message: "Report deleted successfully",
        rev: response.rev,
      });
    } catch (error) {
      console.error("Error deleting report:", error);
      return reply.status(500).send({
        message: "Error deleting report",
        error: error.message,
      });
    }
  });

  // POST - Sync with remote CouchDB
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