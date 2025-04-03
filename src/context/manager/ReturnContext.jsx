"use client"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/AuthContext"
import { v4 as uuidv4 } from "uuid"

const ReturnsContext = createContext()
const COUCHDB_URL = "https://database-production-0fe5.up.railway.app/returns"
const COUCHDB_USERNAME = "admin"
const COUCHDB_PASSWORD = "TVYndeHsIB1F"

export const useReturns = () => {
  const context = useContext(ReturnsContext)
  if (!context) {
    throw new Error("useReturns must be used within a ReturnsProvider")
  }
  return context
}

export function ReturnsProvider({ children }) {
  const { toast } = useToast()
  const { userDetails } = useAuth()
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState("idle") // idle, syncing, error
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true)
  const [localDB, setLocalDB] = useState(null)
  const [remoteDB, setRemoteDB] = useState(null)
  const [unsyncedCount, setUnsyncedCount] = useState(0)

  // Initialize PouchDB
  useEffect(() => {
    const initializePouchDB = async () => {
      try {
        const PouchDB = (await import("pouchdb-browser")).default
        const local = new PouchDB("returns")
        const remote = new PouchDB(COUCHDB_URL, {
          auth: {
            username: COUCHDB_USERNAME,
            password: COUCHDB_PASSWORD,
          },
          ajax: {
            withCredentials: true,
          },
        })

        setLocalDB(local)
        setRemoteDB(remote)
      } catch (err) {
        console.error("PouchDB initialization error:", err)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to initialize database",
        })
        setLoading(false)
      }
    }

    initializePouchDB()
  }, [toast])

  // Error handler
  const handleError = useCallback(
    (error, message) => {
      console.error(message, error)
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      })
      throw error
    },
    [toast],
  )

  // Check for unsynced returns
  const checkUnsyncedCount = useCallback(async () => {
    if (!localDB) return 0

    try {
      const result = await localDB.allDocs({
        include_docs: true,
        attachments: false,
      })

      const unsynced = result.rows.filter((row) => row.doc.syncStatus === "pending").length

      setUnsyncedCount(unsynced)
      return unsynced
    } catch (err) {
      console.error("Failed to check unsynced count:", err)
      return 0
    }
  }, [localDB])

  const fetchReturns = useCallback(
    async (transactionId = null) => {
      if (!localDB || !userDetails?.branchId) return

      setLoading(true)
      try {
        const result = await localDB.allDocs({
          include_docs: true,
          attachments: false,
        })

        let returnsData = result.rows
          .map((row) => ({
            id: row.doc._id,
            branchId: row.doc.branchId,
            salesId:row.doc.salesId,
            transactionId: row.doc.transactionId,
            items: row.doc.items || [],
            total: Number.parseFloat(row.doc.total || 0),
            reason: row.doc.reason || null,
            status: row.doc.status || "completed",
            syncStatus: row.doc.syncStatus || "synced",
            createdAt: row.doc.createdAt || "",
            updatedAt: row.doc.updatedAt || "",
          }))
          .filter((ret) => ret.branchId === userDetails?.branchId)

        if (transactionId) {
          returnsData = returnsData.filter((ret) => ret.transactionId === transactionId)
        }

        // Sort by date (newest first)
        returnsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

        setReturns(returnsData)
        await checkUnsyncedCount()
      } catch (error) {
        handleError(error, "Failed to fetch returns")
      } finally {
        setLoading(false)
      }
    },
    [localDB, userDetails?.branchId, handleError, checkUnsyncedCount],
  )

  // Trigger manual sync
  const triggerSync = useCallback(async () => {
    if (!localDB || !remoteDB) {
      toast({
        title: "Error",
        description: "Database not initialized",
        variant: "destructive",
      })
      return
    }

    if (!isOnline) {
      toast({
        variant: "warning",
        title: "Offline Mode",
        description: "You're working offline. Cannot sync now.",
      })
      return
    }

    try {
      setSyncStatus("syncing")
      const syncResult = await localDB.sync(remoteDB)
      setSyncStatus("idle")
      toast({
        title: "Sync Complete",
        description: `Synced ${syncResult.pull.docs_written + syncResult.push.docs_written} returns.`,
      })
      await fetchReturns()
      await checkUnsyncedCount()
    } catch (error) {
      setSyncStatus("error")
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message,
      })
    }
  }, [localDB, remoteDB, isOnline, toast, fetchReturns, checkUnsyncedCount])

  // Sync setup
  useEffect(() => {
    if (!localDB || !remoteDB) return

    let sync = null

    if (isOnline && userDetails?.branchId) {
      setSyncStatus("syncing")
      sync = localDB
        .sync(remoteDB, {
          live: true,
          retry: true,
        })
        .on("change", () => {
          fetchReturns()
          checkUnsyncedCount()
        })
        .on("paused", () => setSyncStatus("idle"))
        .on("active", () => setSyncStatus("syncing"))
        .on("error", (err) => {
          console.error("Returns sync error:", err)
          setSyncStatus("error")
          toast({
            variant: "destructive",
            title: "Sync Error",
            description: "Failed to sync returns with the server.",
          })
        })
    }

    const handleOnline = () => {
      setIsOnline(true)
      toast({
        title: "Back Online",
        description: "Your changes will now sync to the server.",
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast({
        variant: "warning",
        title: "Offline Mode",
        description: "You're working offline. Changes will sync when you're back online.",
      })
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      if (sync) sync.cancel()
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [isOnline, userDetails?.branchId, localDB, remoteDB, toast, fetchReturns, checkUnsyncedCount])

  const processReturn = async (branchId, transactionId, returnItems, reason) => {
    if (!localDB || !branchId || branchId !== userDetails?.branchId) {
      throw new Error("Invalid or no active branch selected")
    }

    try {
      setLoading(true)

      // Initialize additional PouchDB instances
      const PouchDB = (await import("pouchdb-browser")).default
      const itemsDB = new PouchDB("items")
      const transactionsDB = new PouchDB("transactions")

      // Get transaction directly from transactions DB
      let transactionDoc
      try {
        transactionDoc = await transactionsDB.get(transactionId)
        if (transactionDoc.branchId !== branchId) {
          throw new Error("Transaction does not belong to this branch")
        }
      } catch (err) {
        throw new Error("Transaction not found")
      }

      const transaction = {
        id: transactionDoc._id,
        branchId: transactionDoc.branchId,
        saleId: transactionDoc.salesId,
        total: Number.parseFloat(transactionDoc.total || 0),
        items: transactionDoc.items || [],
      }

      let totalReturn = 0
      const updatedItems = [...transaction.items]

      // Process each return item
      for (const returnItem of returnItems) {
        // Get item directly from items DB
        let itemDoc
        try {
          itemDoc = await itemsDB.get(returnItem.id)
          if (itemDoc.branchId !== branchId) {
            throw new Error(`Item ${returnItem.id} not in active branch`)
          }
        } catch (err) {
          throw new Error(`Item ${returnItem.id} not found`)
        }

        // Update item stock
        const stockManagement = itemDoc.stockManagement || { type: "quantity", quantity: 0 }
        const newStock =
          stockManagement.type === "weight"
            ? (stockManagement.totalWeight || 0) + returnItem.returnQuantity
            : (stockManagement.quantity || 0) + returnItem.returnQuantity

        const updatedItemDoc = {
          ...itemDoc,
          stockManagement: {
            ...stockManagement,
            [stockManagement.type === "weight" ? "totalWeight" : "quantity"]: newStock,
            inStock: newStock > 0,
          },
          updatedAt: new Date().toISOString(),
        }

        await itemsDB.put(updatedItemDoc)

        // Update transaction items
        const itemIndex = updatedItems.findIndex((i) => i.id === returnItem.id)
        if (itemIndex === -1) throw new Error(`Item ${returnItem.id} not in transaction`)

        updatedItems[itemIndex].quantitySold -= returnItem.returnQuantity
        totalReturn += updatedItems[itemIndex].sellingPrice * returnItem.returnQuantity
      }

      // Update or delete transaction
      const validItems = updatedItems.filter((item) => item.quantitySold > 0)
      if (validItems.length === 0) {
        // Delete transaction if no items remain
        await transactionsDB.remove(transactionDoc)
      } else {
        // Update transaction with remaining items
        const newTotal = validItems.reduce((sum, item) => sum + item.sellingPrice * item.quantitySold, 0)

        const updatedTransactionDoc = {
          ...transactionDoc,
          items: validItems,
          total: newTotal,
          updatedAt: new Date().toISOString(),
        }

        await transactionsDB.put(updatedTransactionDoc)
      }

      // Create return record
      const returnDoc = {
        _id: uuidv4(),
        branchId,
        transactionId,
        salesId: transaction?.saleId,
        items: returnItems,
        total: totalReturn,
        reason,
        status: "completed",
        syncStatus: "pending",
        createdBy: userDetails?.email || "unknown",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await localDB.put(returnDoc)
      await fetchReturns()
      await checkUnsyncedCount()

      toast({
        title: "Success",
        description: "Return processed successfully",
      })

      return returnDoc._id
    } catch (error) {
      handleError(error, "Failed to process return")
    } finally {
      setLoading(false)
    }
  }

  const updateReturn = async (returnData) => {
    if (!localDB || !userDetails?.branchId || returnData.branchId !== userDetails?.branchId) {
      throw new Error("Invalid or no active branch selected")
    }

    try {
      setLoading(true)
      const doc = await localDB.get(returnData.id)
      const updatedDoc = {
        ...doc,
        ...returnData,
        syncStatus: "pending", // Mark as pending sync
        total: Number.parseFloat(returnData.total),
        updatedAt: new Date().toISOString(),
      }

      await localDB.put(updatedDoc)
      await fetchReturns()
      await checkUnsyncedCount()

      toast({
        title: "Success",
        description: "Return updated successfully",
      })

      return true
    } catch (error) {
      handleError(error, "Failed to update return")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (localDB && userDetails?.branchId) {
      fetchReturns()
      checkUnsyncedCount()
    }
  }, [userDetails?.branchId, localDB, fetchReturns, checkUnsyncedCount])

  return (
    <ReturnsContext.Provider
      value={{
        returns,
        loading,
        syncStatus,
        isOnline,
        unsyncedCount,
        fetchReturns,
        processReturn,
        updateReturn,
        triggerSync,
        checkUnsyncedCount,
      }}
    >
      {children}
    </ReturnsContext.Provider>
  )
}

