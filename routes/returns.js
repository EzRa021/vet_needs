import { v4 as uuidv4 } from "uuid";

// Helper function to sanitize return data
const sanitizeReturnData = (returnData) => ({
  _id: returnData.id || uuidv4(),
  branchId: returnData.branchId,
  transactionId: returnData.transactionId,
  items: returnData.items || [],
  total: parseFloat(returnData.total || 0),
  reason: returnData.reason || null,
  status: returnData.status || "completed",
  createdBy: returnData.createdBy || "unknown",
  createdAt: returnData.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Fastify plugin export
export default async function (fastify, opts) {
  // GET returns
  fastify.get("/", async (req, reply) => {
    const db = req.pouchDB;
    const { branchId, transactionId } = req.query;

    if (!branchId) {
      return reply.status(400).send({ error: "Branch ID is required" });
    }

    try {
      const result = await db.allDocs({
        include_docs: true,
        attachments: false,
      });

      let returnsData = result.rows
        .map((row) => ({
          id: row.doc._id,
          branchId: row.doc.branchId,
          transactionId: row.doc.transactionId,
          items: row.doc.items || [],
          total: row.doc.total,
          reason: row.doc.reason,
          status: row.doc.status,
          createdAt: row.doc.createdAt,
          updatedAt: row.doc.updatedAt,
        }))
        .filter((ret) => ret.branchId === branchId);

      if (transactionId) {
        returnsData = returnsData.filter((ret) => ret.transactionId === transactionId);
      }

      return reply.send(returnsData);
    } catch (error) {
      console.error("GET Returns Error:", error);
      return reply.status(500).send({
        error: "Failed to fetch returns",
        details: error.message,
      });
    }
  });

  // POST returns
  fastify.post("/", async (req, reply) => {
    const db = req.pouchDB;
    const { branchId, transactionId, returnItems, reason } = req.body;

    try {
      if (!branchId || !transactionId || !returnItems?.length) {
        return reply.status(400).send({ error: "Missing required fields" });
      }

      // Validate transaction exists
      const transactionRes = await fetch(
        `http://localhost:8000/api/transactions?id=${transactionId}&branchId=${branchId}`
      );
      if (!transactionRes.ok) throw new Error("Transaction not found");
      const transaction = await transactionRes.json();

      let totalReturn = 0;
      const updatedItems = [...transaction.items];

      // Process each return item
      for (const returnItem of returnItems) {
        const itemRes = await fetch(
          `http://localhost:8000/api/items?id=${returnItem.id}&branchId=${branchId}`
        );
        if (!itemRes.ok) throw new Error(`Item ${returnItem.id} not found`);
        const item = await itemRes.json();

        const stockManagement = item.stockManagement || { type: "quantity", quantity: 0 };
        const newStock =
          stockManagement.type === "weight"
            ? stockManagement.totalWeight + returnItem.returnQuantity
            : stockManagement.quantity + returnItem.returnQuantity;
        stockManagement[stockManagement.type === "weight" ? "totalWeight" : "quantity"] = newStock;
        stockManagement.inStock = newStock > 0;

        const updateItemRes = await fetch(`http://localhost:8000/api/items/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...item,
            stockManagement,
            inStock: stockManagement.inStock,
          }),
        });
        if (!updateItemRes.ok) throw new Error(`Failed to update item ${item.id}`);

        const itemIndex = updatedItems.findIndex((i) => i.id === returnItem.id);
        if (itemIndex === -1) throw new Error(`Item ${returnItem.id} not in transaction`);
        updatedItems[itemIndex].quantitySold -= returnItem.returnQuantity;
        totalReturn += updatedItems[itemIndex].sellingPrice * returnItem.returnQuantity;
      }

      // Update or delete transaction
      const validItems = updatedItems.filter((item) => item.quantitySold > 0);
      if (validItems.length === 0) {
        await fetch(`http://localhost:8000/api/transactions/${transactionId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ branchId }),
        });
      } else {
        const newTotal = validItems.reduce((sum, item) => sum + item.sellingPrice * item.quantitySold, 0);
        await fetch(`http://localhost:8000/api/transactions/${transactionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ branchId, items: validItems, total: newTotal }),
        });
      }

      // Create return record
      const returnDoc = sanitizeReturnData({
        branchId,
        transactionId,
        items: returnItems,
        total: totalReturn,
        reason,
      });

      const response = await db.put(returnDoc);

      return reply.send({
        success: true,
        returnId: returnDoc._id,
        message: "Return processed successfully",
        rev: response.rev,
      });
    } catch (error) {
      console.error("POST Returns Error:", error);
      return reply.status(500).send({
        error: error.message || "Internal server error",
      });
    }
  });

  // PUT - Update existing return
  fastify.put("/:id", async (req, reply) => {
    const db = req.pouchDB;
    const { id } = req.params;
    const returnData = req.body;

    try {
      if (!id || !returnData.branchId) {
        return reply.status(400).send({
          message: "Return ID and Branch ID are required",
        });
      }

      const doc = await db.get(id);
      const sanitizedData = sanitizeReturnData({ ...doc, ...returnData });

      const response = await db.put({ ...sanitizedData, _rev: doc._rev });

      return reply.send({
        message: "Return updated successfully",
        return: sanitizedData,
        rev: response.rev,
      });
    } catch (error) {
      console.error("Error updating return:", error);
      return reply.status(500).send({
        message: "Error updating return",
        error: error.message,
      });
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