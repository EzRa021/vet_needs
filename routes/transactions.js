import { v4 as uuidv4 } from "uuid";

// Helper function to sanitize transaction data
const sanitizeTransactionData = (transaction) => ({
  _id: transaction.id || uuidv4(),
  branchId: transaction.branchId,
  salesId: transaction.salesId,
  paymentMethod: transaction.paymentMethod || "unknown",
  total: parseFloat(transaction.total || 0),
  items: transaction.items || [],
  number: transaction.number || transaction.salesId,
  createdBy: transaction.createdBy || "unknown",
  createdAt: transaction.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Fastify plugin export
export default async function (fastify, opts) {
  // Helper to get next salesId
  const getNextSalesId = async (db, branchId) => {
    const result = await db.allDocs({
      include_docs: true,
      attachments: false,
    });
    const branchTransactions = result.rows
      .map((row) => row.doc)
      .filter((doc) => doc.branchId === branchId && doc.salesId !== undefined);
    const maxSalesId = branchTransactions.length
      ? Math.max(...branchTransactions.map((t) => parseInt(t.salesId || 0)))
      : 0;
    return (maxSalesId + 1).toString();
  };

  // GET - Fetch transactions by branchId or specific ID
  fastify.get("/", async (req, reply) => {
    const { branchId, id, start, end } = req.query;
    const db = req.pouchDB;

    if (!branchId) {
      return reply.status(400).send({ message: "Branch ID is required" });
    }

    try {
      const result = await db.allDocs({
        include_docs: true,
        attachments: false,
      });

      let transactions = result.rows
        .map((row) => ({
          id: row.doc._id,
          branchId: row.doc.branchId,
          salesId: row.doc.salesId,
          paymentMethod: row.doc.paymentMethod,
          total: row.doc.total,
          items: row.doc.items,
          number: row.doc.number || row.doc.salesId,
          createdAt: row.doc.createdAt,
          updatedAt: row.doc.updatedAt,
        }))
        .filter((txn) => txn.branchId === branchId);

      if (id) {
        const transaction = transactions.find((txn) => txn.id === id);
        if (!transaction) {
          return reply.status(404).send({ message: "Transaction not found" });
        }
        return reply.send(transaction);
      }

      if (start && end) {
        const startDate = new Date(parseInt(start)).toISOString();
        const endDate = new Date(parseInt(end)).toISOString();
        transactions = transactions.filter(
          (txn) => txn.createdAt >= startDate && txn.createdAt <= endDate
        );
      }

      return reply.send(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return reply.status(500).send({ message: "Error fetching transactions", error: error.message });
    }
  });

  // POST - Create new transaction with stock update
  fastify.post("/", async (req, reply) => {
    const db = req.pouchDB;
    const transaction = req.body;

    try {
      if (!transaction.branchId) {
        return reply.status(400).send({ message: "Required fields missing: branchId" });
      }

      const nextSalesId = await getNextSalesId(db, transaction.branchId);
      const sanitizedData = sanitizeTransactionData({
        ...transaction,
        id: uuidv4(), // Unique ID
        salesId: nextSalesId, // Incremental invoice number
      });

      // Update stock for items
      for (const item of transaction.items) {
        const itemRes = await fetch(
          `http://localhost:8000/api/items?id=${item.id}&branchId=${transaction.branchId}`
        );
        if (!itemRes.ok) throw new Error(`Failed to fetch item ${item.id}: ${itemRes.statusText}`);
        const itemData = await itemRes.json();
        if (!itemData) throw new Error(`Item ${item.id} not found`);

        const stockManagement = itemData.stockManagement || { type: "quantity", quantity: 0 };
        let updatedStock;

        if (stockManagement.type === "weight") {
          const currentWeight = Number(stockManagement.totalWeight || 0);
          const soldWeight = Number(item.quantitySold || 0);
          updatedStock = { ...stockManagement, totalWeight: currentWeight - soldWeight };
        } else {
          const currentQuantity = Number(stockManagement.quantity || 0);
          const soldQuantity = Number(item.quantitySold || 0);
          updatedStock = { ...stockManagement, quantity: currentQuantity - soldQuantity };
        }

        const updateRes = await fetch(`http://localhost:8000/api/items/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...itemData,
            stockManagement: updatedStock,
            inStock: updatedStock.type === "weight" ? updatedStock.totalWeight > 0 : updatedStock.quantity > 0,
          }),
        });

        if (!updateRes.ok) throw new Error(`Failed to update item ${item.id}`);
      }

      const response = await db.put(sanitizedData);

      return reply.send({
        message: "Transaction created successfully",
        transaction: { ...sanitizedData, id: sanitizedData._id },
        rev: response.rev,
      });
    } catch (error) {
      console.error("Error creating transaction:", error);
      return reply.status(500).send({ message: "Error creating transaction", error: error.message });
    }
  });

  // PUT - Update transaction
  fastify.put("/:id", async (req, reply) => {
    const db = req.pouchDB;
    const { id } = req.params;
    const transaction = req.body;

    try {
      if (!id) {
        return reply.status(400).send({ message: "Transaction ID is required" });
      }

      const doc = await db.get(id);
      const sanitizedData = sanitizeTransactionData({ ...doc, ...transaction });

      const response = await db.put({ ...sanitizedData, _rev: doc._rev });

      return reply.send({
        message: "Transaction updated successfully",
        transaction: { ...sanitizedData, id: sanitizedData._id },
        rev: response.rev,
      });
    } catch (error) {
      console.error("Error updating transaction:", error);
      return reply.status(500).send({ message: "Error updating transaction", error: error.message });
    }
  });

  // DELETE - Remove transaction
  fastify.delete("/:id", async (req, reply) => {
    const db = req.pouchDB;
    const { id } = req.params;

    try {
      if (!id) {
        return reply.status(400).send({ message: "Transaction ID is required" });
      }

      const doc = await db.get(id);
      const response = await db.remove(doc);

      return reply.send({
        message: "Transaction deleted successfully",
        rev: response.rev,
      });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      return reply.status(500).send({ message: "Error deleting transaction", error: error.message });
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