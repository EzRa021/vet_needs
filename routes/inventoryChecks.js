import { v4 as uuidv4 } from "uuid";

// Helper function to sanitize inventory check data
const sanitizeCheckData = (check) => ({
  _id: check.id || uuidv4(),
  branchId: check.branchId,
  checkData: check.checkData || {},
  timestamp: check.timestamp || new Date().toISOString(),
  synced: check.synced || false, // Boolean to track sync status
});

// Fastify plugin export
export default async function (fastify, opts) {
  // GET - Fetch inventory checks for a branch on a specific date
  fastify.get("/:branchId", async (req, reply) => {
    const { branchId } = req.params;
    const { date } = req.query;
    const db = req.pouchDB;

    if (!branchId || !date) {
      return reply.status(400).send({ message: "Branch ID and date are required" });
    }

    try {
      const requestDate = new Date(date);
      if (isNaN(requestDate.getTime())) {
        throw new Error("Invalid date format");
      }

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const startTimestamp = startOfDay.getTime();

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      const endTimestamp = endOfDay.getTime();

      // Fetch all inventory checks for the branch
      const result = await db.allDocs({
        include_docs: true,
        attachments: false,
      });

      const checks = result.rows
        .map((row) => ({
          id: row.doc._id,
          branchId: row.doc.branchId,
          checkData: row.doc.checkData,
          timestamp: new Date(row.doc.timestamp).getTime(),
          synced: row.doc.synced,
        }))
        .filter((check) => check.branchId === branchId)
        .filter((check) => check.timestamp >= startTimestamp && check.timestamp <= endTimestamp);

      return reply.status(200).send({ checks });
    } catch (error) {
      console.error("Error fetching inventory checks:", error);
      return reply.status(500).send({
        message: "Failed to fetch inventory checks",
        error: error.message,
      });
    }
  });

  // POST - Submit an inventory check for a branch
  fastify.post("/:branchId", async (req, reply) => {
    const { branchId } = req.params;
    const { checkData } = req.body;
    const db = req.pouchDB;

    if (!branchId || !checkData || typeof checkData !== "object") {
      return reply.status(400).send({ message: "Branch ID and check data are required" });
    }

    try {
      const checkPayload = sanitizeCheckData({
        branchId,
        checkData,
      });

      const response = await db.put(checkPayload);

      return reply.status(201).send({
        message: "Inventory check submitted successfully",
        checkId: checkPayload._id,
        rev: response.rev,
      });
    } catch (error) {
      console.error("Error submitting inventory check to PouchDB:", error);
      return reply.status(500).send({
        message: "Failed to submit inventory check",
        error: error.message,
      });
    }
  });

  // POST - Sync inventory checks with remote CouchDB
  fastify.post("/sync", async (req, reply) => {
    const { branchId } = req.body;
    const localDB = req.pouchDB;
    const remoteURL = req.couchDBUrl;

    if (!branchId) {
      return reply.status(400).send({ message: "Branch ID is required" });
    }

    try {
      const remoteDB = new PouchDB(remoteURL, {
        auth: {
          username: req.couchDBUsername || "admin",
          password: req.couchDBPassword || "password",
        },
      });

      // Fetch unsynced checks
      const result = await localDB.allDocs({
        include_docs: true,
        attachments: false,
      });

      const unsyncedChecks = result.rows
        .map((row) => row.doc)
        .filter((check) => check.branchId === branchId && !check.synced);

      if (unsyncedChecks.length === 0) {
        return reply.status(200).send({ message: "No inventory checks to sync" });
      }

      // Mark as synced
      const updatedChecks = unsyncedChecks.map((check) => ({
        ...check,
        synced: true,
      }));

      await localDB.bulkDocs(updatedChecks);

      // Sync with remote CouchDB
      const syncResult = await localDB.sync(remoteDB, {
        live: false,
        retry: true,
      });

      return reply.status(200).send({
        message: `Synced ${unsyncedChecks.length} inventory checks to CouchDB`,
        pushed: syncResult.push?.docs_written || 0,
        pulled: syncResult.pull?.docs_written || 0,
      });
    } catch (error) {
      console.error("Error syncing inventory checks to CouchDB:", error);
      return reply.status(500).send({
        message: "Failed to sync inventory checks",
        error: error.message,
      });
    }
  });
}