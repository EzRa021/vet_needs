import { v4 as uuidv4 } from "uuid";

// Helper function to sanitize expense data
const sanitizeExpenseData = (expense) => ({
  _id: expense.id || uuidv4(),
  branchId: expense.branchId,
  name: expense.name || "",
  description: expense.description || "",
  type: expense.type || "other",
  amount: parseFloat(expense.amount) || 0,
  date: expense.date || new Date().toISOString(),
  createdAt: expense.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Fastify plugin export
export default async function (fastify, opts) {
  // GET - Fetch expenses by branchId and optional date range
  fastify.get("/", async (req, reply) => {
    const { branchId, startDate, endDate } = req.query;
    const db = req.pouchDB;

    if (!branchId) {
      return reply.status(400).send({ message: "Branch ID is required" });
    }

    try {
      const result = await db.allDocs({
        include_docs: true,
        attachments: false,
      });

      let expenses = result.rows
        .map((row) => ({
          id: row.doc._id,
          branchId: row.doc.branchId,
          name: row.doc.name,
          description: row.doc.description,
          type: row.doc.type,
          amount: row.doc.amount,
          date: row.doc.date,
          createdAt: row.doc.createdAt,
          updatedAt: row.doc.updatedAt,
        }))
        .filter((exp) => exp.branchId === branchId);

      if (startDate && endDate) {
        const startTimestamp = new Date(startDate).getTime();
        const endTimestamp = new Date(endDate).getTime();

        expenses = expenses.filter((expense) => {
          const expenseDate = new Date(expense.date).getTime();
          return expenseDate >= startTimestamp && expenseDate <= endTimestamp;
        });
      }

      return reply.send(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      return reply.status(500).send({
        message: "Error fetching expenses",
        error: error.message,
      });
    }
  });

  // POST - Create a new expense
  fastify.post("/", async (req, reply) => {
    const { branchId, name, description, amount, type, date } = req.body;
    const db = req.pouchDB;

    if (!branchId || !name || !amount || !date) {
      return reply.status(400).send({
        message: "Required fields missing: branchId, name, amount, date",
      });
    }

    try {
      const sanitizedData = sanitizeExpenseData({
        branchId,
        name,
        description,
        amount,
        type,
        date,
      });

      const response = await db.put(sanitizedData);

      return reply.send({
        message: "Expense created successfully",
        expense: { ...sanitizedData, id: sanitizedData._id },
        rev: response.rev,
      });
    } catch (error) {
      console.error("Error creating expense:", error);
      return reply.status(500).send({
        message: "Error creating expense",
        error: error.message,
      });
    }
  });

  // PUT - Update an existing expense
  fastify.put("/:id", async (req, reply) => {
    const { id } = req.params;
    const { branchId, name, amount, description, type, date } = req.body;
    const db = req.pouchDB;

    if (!id || !branchId || !name || !amount || !date) {
      return reply.status(400).send({
        message: "Required fields missing: id, branchId, name, amount, date",
      });
    }

    try {
      const doc = await db.get(id);
      if (doc.branchId !== branchId) {
        return reply.status(403).send({ message: "Branch ID mismatch" });
      }

      const sanitizedData = sanitizeExpenseData({
        ...doc,
        branchId,
        name,
        description,
        amount,
        type,
        date,
      });

      const response = await db.put({ ...sanitizedData, _rev: doc._rev });

      return reply.send({
        message: "Expense updated successfully",
        expense: { ...sanitizedData, id: sanitizedData._id },
        rev: response.rev,
      });
    } catch (error) {
      console.error("Error updating expense:", error);
      return reply.status(500).send({
        message: "Error updating expense",
        error: error.message,
      });
    }
  });

  // DELETE - Remove an expense
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
        message: "Expense deleted successfully",
        rev: response.rev,
      });
    } catch (error) {
      console.error("Error deleting expense:", error);
      return reply.status(500).send({
        message: "Error deleting expense",
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