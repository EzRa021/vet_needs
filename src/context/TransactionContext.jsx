"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { startOfWeek, endOfWeek } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useExpenses } from "./ExpensesContext";
import { useAuth } from "@/context/AuthContext";
import { v4 as uuidv4 } from "uuid";

const TransactionContext = createContext();
const COUCHDB_URL = "https://database-production-0fe5.up.railway.app/transactions"; // Adjust as needed
const COUCHDB_USERNAME = "admin";
const COUCHDB_PASSWORD = "TVYndeHsIB1F";

export const TransactionProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [salesId, setSalesId] = useState(null);
  const [error, setError] = useState(null);
  const [transaction, setTransaction] = useState(null);
  const [departmentSales, setDepartmentSales] = useState([]);
  const [salesMetrics, setSalesMetrics] = useState({
    totalSales: 0,
    totalItems: 0,
    departmentBreakdown: [],
    categoryBreakdown: [],
    topSellingItems: [],
    hourlyBreakdown: [],
  });
  const [financialMetrics, setFinancialMetrics] = useState({
    totalSales: 0,
    totalTransactions: 0,
    totalItemsSold: 0,
    totalQuantity: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalExpenses: 0,
    netProfit: 0,
  });
  const [branchId, setBranchId] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle, syncing, error
  const { toast } = useToast();
  const { getExpensesForPeriod } = useExpenses();
  const { user } = useAuth();
  const [localDB, setLocalDB] = useState(null);
  const [remoteDB, setRemoteDB] = useState(null);

  // Initialize PouchDB only on the client
  useEffect(() => {
    const initializePouchDB = async () => {
      try {
        const PouchDB = (await import("pouchdb-browser")).default; // Dynamic import
        const local = new PouchDB("transactions");
        const remote = new PouchDB(COUCHDB_URL, {
          auth: {
            username: COUCHDB_USERNAME,
            password: COUCHDB_PASSWORD,
          },
          ajax: {
            withCredentials: true,
          },
        });

        setLocalDB(local);
        setRemoteDB(remote);
      } catch (err) {
        console.error("PouchDB initialization error:", err);
        setError(err.message);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to initialize database",
        });
        setLoading(false);
      }
    };

    initializePouchDB();
  }, []);

  // Error handler utility
  const handleError = useCallback(
    (error, message) => {
      console.error(message, error);
      setError(error.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
      throw error;
    },
    [toast]
  );

  // Validate transaction data
  const validateTransaction = (transactionData, isUpdate = false) => {
    const requiredFields = isUpdate ? ["id"] : ["branchId", "total", "items"];
    const missingFields = requiredFields.filter((field) => !transactionData[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }
    if (!isUpdate && (!Array.isArray(transactionData.items) || transactionData.items.length === 0)) {
      throw new Error("Transaction must include at least one item");
    }
    if (transactionData.items) {
      transactionData.items.forEach((item) => {
        if (!item.id || !item.quantitySold || !item.sellingPrice) {
          throw new Error("Each item must have id, quantitySold, and sellingPrice");
        }
      });
    }
  };

  // Get next salesId for a branch
  const getNextSalesId = async (branchId) => {
    if (!localDB) return "1"; // Fallback if DB not initialized
    try {
      const result = await localDB.allDocs({
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
    } catch (err) {
      handleError(err, "Failed to calculate next salesId");
      return "1"; // Fallback to 1 if error occurs
    }
  };

  // Calculate financial metrics
  const calculateFinancialMetrics = useCallback(
    async (transactions, filterType, date) => {
      const metrics = transactions.reduce(
        (acc, transaction) => {
          acc.totalSales += transaction.total || 0;
          acc.totalTransactions += 1;
          if (transaction.items) {
            acc.totalItemsSold += transaction.items.length;
            transaction.items.forEach((item) => {
              acc.totalQuantity += item.quantitySold || 0;
              acc.totalCost += (item.costPrice * item.quantitySold) || 0;
            });
          }
          return acc;
        },
        {
          totalSales: 0,
          totalTransactions: 0,
          totalItemsSold: 0,
          totalQuantity: 0,
          totalCost: 0,
        }
      );
      metrics.totalRevenue = metrics.totalSales - metrics.totalCost;
      metrics.totalExpenses = await getExpensesForPeriod(filterType, date);
      metrics.netProfit = metrics.totalRevenue - metrics.totalExpenses;
      setFinancialMetrics(metrics);
      return metrics;
    },
    [getExpensesForPeriod]
  );

  // Fetch transactions
  const fetchTransactions = useCallback(
    async (branchIdParam) => {
      if (!localDB) return;
      const fetchBranchId = branchIdParam || branchId;
      if (!fetchBranchId) return;

      try {
        setLoading(true);
        const result = await localDB.allDocs({
          include_docs: true,
          attachments: false,
        });
        const transactionsData = result.rows
          .map((row) => ({
            id: row.doc._id,
            branchId: row.doc.branchId,
            salesId: row.doc.salesId,
            paymentMethod: row.doc.paymentMethod || "unknown",
            total: parseFloat(row.doc.total || 0),
            items: row.doc.items || [],
            number: row.doc.number || row.doc.salesId,
            createdAt: row.doc.createdAt || "",
            updatedAt: row.doc.updatedAt || "",
          }))
          .filter((txn) => txn.branchId === fetchBranchId);

        setTransactions(transactionsData);
        await calculateFinancialMetrics(transactionsData);
      } catch (err) {
        handleError(err, "Failed to fetch transactions");
      } finally {
        setLoading(false);
      }
    },
    [branchId, localDB, calculateFinancialMetrics, handleError]
  );

  // Fetch transactions for period
  const fetchTransactionsForPeriod = useCallback(
    async (branchId, startDate, endDate) => {
      if (!localDB || !branchId) return [];
      try {
        setLoading(true);
        const result = await localDB.allDocs({
          include_docs: true,
          attachments: false,
        });
        const transactionsData = result.rows
          .map((row) => ({
            id: row.doc._id,
            branchId: row.doc.branchId,
            salesId: row.doc.salesId,
            paymentMethod: row.doc.paymentMethod || "unknown",
            total: parseFloat(row.doc.total || 0),
            items: row.doc.items || [],
            number: row.doc.number || row.doc.salesId,
            createdAt: row.doc.createdAt || "",
            updatedAt: row.doc.updatedAt || "",
          }))
          .filter(
            (txn) =>
              txn.branchId === branchId &&
              new Date(txn.createdAt) >= startDate &&
              new Date(txn.createdAt) <= endDate
          );

        setTransactions(transactionsData);
        await calculateFinancialMetrics(transactionsData);
        return transactionsData;
      } catch (err) {
        handleError(err, "Failed to fetch transactions for period");
        return [];
      } finally {
        setLoading(false);
      }
    },
    [localDB, calculateFinancialMetrics, handleError]
  );

  // Fetch transaction by ID
  const fetchTransactionById = async (branchId, transactionId) => {
    if (!localDB || !branchId || !transactionId) {
      toast({
        title: "Error",
        description: "Branch ID and transaction ID are required",
        variant: "destructive",
      });
      return null;
    }
    try {
      const doc = await localDB.get(transactionId);
      if (doc.branchId !== branchId) {
        throw new Error("Transaction does not belong to this branch");
      }
      const transactionData = {
        id: doc._id,
        branchId: doc.branchId,
        salesId: doc.salesId,
        paymentMethod: doc.paymentMethod || "unknown",
        total: parseFloat(doc.total || 0),
        items: doc.items || [],
        number: doc.number || doc.salesId,
        createdAt: doc.createdAt || "",
        updatedAt: doc.updatedAt || "",
      };
      setTransaction(transactionData);
      return transactionData;
    } catch (err) {
      handleError(err, "Failed to fetch transaction");
      return null;
    }
  };

  // Add new transaction
  const addTransaction = async (branchId, transactionData) => {
    if (!localDB) return;
    try {
      setLoading(true);
      const completeTransactionData = { ...transactionData, branchId };
      validateTransaction(completeTransactionData);
      const nextSalesId = await getNextSalesId(branchId);
      const transactionDoc = {
        _id: uuidv4(), // Unique transaction ID
        branchId,
        salesId: nextSalesId, // Incremental invoice number
        paymentMethod: completeTransactionData.paymentMethod || "cash",
        total: parseFloat(completeTransactionData.total || 0),
        items: completeTransactionData.items || [],
        number: completeTransactionData.number || nextSalesId,
        createdBy: user?.email || "unknown",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const response = await localDB.put(transactionDoc);
      setTransactions((prev) => [...prev, { ...transactionDoc, id: transactionDoc._id }]);
      setSalesId(nextSalesId);
      toast({ title: "Success", description: "Transaction added successfully" });
      return transactionDoc._id;
    } catch (err) {
      handleError(err, "Failed to add transaction");
    } finally {
      setLoading(false);
    }
  };

  // Update transaction
  const updateTransaction = async (branchId, transactionId, updates) => {
    if (!localDB || !branchId || !transactionId) {
      toast({
        title: "Error",
        description: "Branch ID and transaction ID are required",
        variant: "destructive",
      });
      return;
    }
    try {
      setLoading(true);
      const doc = await localDB.get(transactionId);
      if (doc.branchId !== branchId) {
        throw new Error("Transaction does not belong to this branch");
      }
      const updatedDoc = {
        ...doc,
        paymentMethod: updates.paymentMethod || doc.paymentMethod,
        total: parseFloat(updates.total !== undefined ? updates.total : doc.total),
        items: updates.items || doc.items,
        number: updates.number || doc.number,
        updatedAt: new Date().toISOString(),
      };
      validateTransaction(updatedDoc, true);

      await localDB.put(updatedDoc);
      setTransactions((prev) =>
        prev.map((txn) => (txn.id === transactionId ? { ...updatedDoc, id: updatedDoc._id } : txn))
      );
      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });
      return updatedDoc;
    } catch (err) {
      handleError(err, "Failed to update transaction");
    } finally {
      setLoading(false);
    }
  };

  // Delete transaction
  const deleteTransaction = async (branchId, transactionId) => {
    if (!localDB || !branchId || !transactionId) {
      toast({
        title: "Error",
        description: "Branch ID and transaction ID are required",
        variant: "destructive",
      });
      return;
    }
    try {
      setLoading(true);
      const doc = await localDB.get(transactionId);
      if (doc.branchId !== branchId) {
        throw new Error("Transaction does not belong to this branch");
      }
      await localDB.remove(doc);
      setTransactions((prev) => prev.filter((txn) => txn.id !== transactionId));
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    } catch (err) {
      handleError(err, "Failed to delete transaction");
    } finally {
      setLoading(false);
    }
  };

  // Get filtered report
  const getFilteredReport = useCallback(
    async (branchId, filterType, date) => {
      if (!localDB || !date) return;
      const selectedDate = new Date(date);
      if (isNaN(selectedDate.getTime())) {
        toast({
          title: "Error",
          description: "Invalid date provided",
          variant: "destructive",
        });
        return;
      }
      let startDate, endDate;
      switch (filterType) {
        case "daily":
          startDate = new Date(selectedDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(selectedDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case "weekly":
          startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
          endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
          endDate.setHours(23, 59, 59, 999);
          break;
        case "monthly":
          startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
          endDate = new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth() + 1,
            0,
            23,
            59,
            59,
            999
          );
          break;
        case "yearly":
          startDate = new Date(selectedDate.getFullYear(), 0, 1);
          endDate = new Date(selectedDate.getFullYear(), 11, 31, 23, 59, 59, 999);
          break;
        default:
          toast({
            title: "Error",
            description: "Invalid filter type",
            variant: "destructive",
          });
          return;
      }
      await fetchTransactionsForPeriod(branchId, startDate, endDate);
    },
    [fetchTransactionsForPeriod, toast]
  );
  const getDepartmentCategorySales = useCallback(
    async (branchId, date) => {
      if (!localDB || !branchId || !date) {
        toast({
          title: "Error",
          description: "Branch ID and date are required",
          variant: "destructive",
        });
        return null;
      }
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      const transactions = await fetchTransactionsForPeriod(branchId, startDate, endDate);
      
      // Process transactions into department/category structure
      const departmentMap = {};
      
      // Process each transaction
      transactions.forEach(transaction => {
        if (!transaction.items || !Array.isArray(transaction.items)) return;
        
        // Process each item in the transaction
        transaction.items.forEach(item => {
          if (!item.departmentId || !item.categoryId) return;
          
          // Initialize department if it doesn't exist
          if (!departmentMap[item.departmentId]) {
            departmentMap[item.departmentId] = {
              departmentId: item.departmentId,
              departmentName: item.departmentName || 'Unknown Department',
              totalAmount: 0,
              totalQuantity: 0,
              categories: {}
            };
          }
          
          // Initialize category if it doesn't exist
          if (!departmentMap[item.departmentId].categories[item.categoryId]) {
            departmentMap[item.departmentId].categories[item.categoryId] = {
              categoryId: item.categoryId,
              categoryName: item.categoryName || 'Unknown Category',
              totalAmount: 0,
              totalQuantity: 0,
              items: []
            };
          }
          
          // Calculate item total amount
          const itemTotalAmount = (item.sellingPrice || 0) * (item.quantitySold || 0);
          
          // Add item to category
          departmentMap[item.departmentId].categories[item.categoryId].items.push({
            ...item,
            totalAmount: itemTotalAmount
          });
          
          // Update category totals
          departmentMap[item.departmentId].categories[item.categoryId].totalAmount += itemTotalAmount;
          departmentMap[item.departmentId].categories[item.categoryId].totalQuantity += (item.quantitySold || 0);
          
          // Update department totals
          departmentMap[item.departmentId].totalAmount += itemTotalAmount;
          departmentMap[item.departmentId].totalQuantity += (item.quantitySold || 0);
        });
      });
      
      // Convert map to array for easier rendering
      const result = Object.values(departmentMap);
      
      return result;
    },
    [fetchTransactionsForPeriod, toast]
  );

  // Get sales data for range
  const getSalesDataForRange = useCallback(
    async (branchId, startDate, endDate) => {
      if (!localDB || !branchId || !startDate || !endDate) {
        toast({
          title: "Error",
          description: "Branch ID, start date, and end date are required",
          variant: "destructive",
        });
        return null;
      }
      try {
        return await fetchTransactionsForPeriod(branchId, new Date(startDate), new Date(endDate));
      } catch (err) {
        handleError(err, "Failed to get sales data for range");
        return null;
      }
    },
    [fetchTransactionsForPeriod, handleError, toast]
  );

  // Get comparative sales data
  const getComparativeSalesData = useCallback(
    async (branchId, currentPeriodStart, currentPeriodEnd, previousPeriodStart, previousPeriodEnd) => {
      if (
        !localDB ||
        !branchId ||
        !currentPeriodStart ||
        !currentPeriodEnd ||
        !previousPeriodStart ||
        !previousPeriodEnd
      ) {
        toast({
          title: "Error",
          description: "Branch ID and all period dates are required",
          variant: "destructive",
        });
        return null;
      }

      try {
        const currentPeriodData = await fetchTransactionsForPeriod(
          branchId,
          new Date(currentPeriodStart),
          new Date(currentPeriodEnd)
        );

        const previousPeriodData = await fetchTransactionsForPeriod(
          branchId,
          new Date(previousPeriodStart),
          new Date(previousPeriodEnd)
        );

        return {
          currentPeriod: currentPeriodData,
          previousPeriod: previousPeriodData,
        };
      } catch (err) {
        handleError(err, "Failed to get comparative sales data");
        return null;
      }
    },
    [fetchTransactionsForPeriod, handleError, toast]
  );

  // Setup live sync
  useEffect(() => {
    if (!localDB || !remoteDB) return;

    let sync = null;

    if (isOnline) {
      setSyncStatus("syncing");

      sync = localDB
        .sync(remoteDB, {
          live: true,
          retry: true,
        })
        .on("change", (change) => {
          console.log("Sync change detected", change);
          fetchTransactions();
        })
        .on("paused", () => {
          console.log("Sync paused");
          setSyncStatus("idle");
        })
        .on("active", () => {
          console.log("Sync active");
          setSyncStatus("syncing");
        })
        .on("error", (err) => {
          console.error("Sync error:", err);
          setSyncStatus("error");
          toast({
            variant: "destructive",
            title: "Sync Error",
            description: "Failed to sync with the server. Some changes may not be saved.",
          });
        });
    }

    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Your changes will now sync to the server.",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        variant: "warning",
        title: "Offline Mode",
        description: "You're working offline. Changes will sync when you're back online.",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      if (sync) sync.cancel();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isOnline, localDB, remoteDB, fetchTransactions, toast]);

  // Manual sync trigger
  const triggerSync = async () => {
    if (!localDB || !remoteDB) return;

    if (!isOnline) {
      toast({
        variant: "warning",
        title: "Offline Mode",
        description: "You're working offline. Cannot sync now.",
      });
      return;
    }

    try {
      setSyncStatus("syncing");
      const syncResult = await localDB.sync(remoteDB);
      setSyncStatus("idle");
      toast({
        title: "Sync Complete",
        description: `Synced ${syncResult.pull.docs_written + syncResult.push.docs_written} documents.`,
      });
      await fetchTransactions();
    } catch (error) {
      setSyncStatus("error");
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message,
      });
    }
  };

  // Initial fetch
  useEffect(() => {
    if (localDB && branchId) fetchTransactions(branchId);
  }, [branchId, localDB, fetchTransactions]);

  const value = {
    transactions,
    loading,
    error,
    transaction,
    financialMetrics,
    departmentSales,
    salesMetrics,
    fetchTransactions,
    fetchTransactionById,
    fetchTransactionsForPeriod,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getFilteredReport,
    calculateFinancialMetrics,
    getDepartmentCategorySales,
    getSalesDataForRange,
    getComparativeSalesData,
    setTransaction,
    setBranchId,
    salesId,
    branchId,
    isOnline,
    syncStatus,
    triggerSync,
  };

  return <TransactionContext.Provider value={value}>{children}</TransactionContext.Provider>;
};

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error("useTransactions must be used within a TransactionProvider");
  }
  return context;
};

export default TransactionContext;