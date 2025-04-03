"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useBranches } from "./BranchContext";
import { useToast } from "@/hooks/use-toast";
import { startOfWeek, endOfWeek } from "date-fns";

const ExpensesContext = createContext(undefined);
const COUCHDB_URL = "https://database-production-0fe5.up.railway.app/expenses";
const COUCHDB_USERNAME = "admin";
const COUCHDB_PASSWORD = "TVYndeHsIB1F";

export const useExpenses = () => {
  const context = useContext(ExpensesContext);
  if (!context) {
    throw new Error("useExpenses must be used within an ExpensesProvider");
  }
  return context;
};

export const ExpensesProvider = ({ children }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle, syncing, error
  const [branchId, setBranchId] = useState(null);
  const [localDB, setLocalDB] = useState(null);
  const [remoteDB, setRemoteDB] = useState(null);
  const { toast } = useToast();

  // Initialize PouchDB
  useEffect(() => {
    const initializePouchDB = async () => {
      try {
        const PouchDB = (await import("pouchdb-browser")).default;
        const local = new PouchDB("expenses");
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
        setLoading(false);
      }
    };
    initializePouchDB();
  }, []);

  // Error handler utility
  const handleError = (error, message) => {
    console.error(message, error);
    setError(error.message);
    toast({
      variant: "destructive",
      title: "Error",
      description: message,
    });
    throw error;
  };

  // Setup live sync
  useEffect(() => {
    if (!localDB || !remoteDB) return;

    let sync = null;

    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Expenses will now sync to the server.",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        variant: "warning",
        title: "Offline Mode",
        description: "You're working offline. Expenses will sync when back online.",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (isOnline && branchId) {
      setSyncStatus("syncing");
      sync = localDB
        .sync(remoteDB, { live: true, retry: true })
        .on("change", () => fetchExpenses(branchId))
        .on("paused", () => setSyncStatus("idle"))
        .on("active", () => setSyncStatus("syncing"))
        .on("error", (err) => {
          console.error("Expenses sync error:", err);
          setSyncStatus("error");
          toast({
            variant: "destructive",
            title: "Sync Error",
            description: "Failed to sync expenses with the server.",
          });
        });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (sync) sync.cancel();
    };
  }, [isOnline, branchId, localDB, remoteDB]);

  // Fetch expenses
  const fetchExpenses = useCallback(
    async (branchIdParam, date) => {
      if (!localDB) return;

      const fetchBranchId = branchIdParam || branchId;
      if (!fetchBranchId) return;

      try {
        setLoading(true);
        setError(null);

        const result = await localDB.allDocs({
          include_docs: true,
          attachments: false,
        });

        let fetchedExpenses = result.rows
          .map((row) => ({
            id: row.doc._id,
            branchId: row.doc.branchId,
            amount: parseFloat(row.doc.amount) || 0,
            category: row.doc.category || "other",
            description: row.doc.description || "",
            createdAt: new Date(row.doc.createdAt),
            updatedAt: new Date(row.doc.updatedAt),
          }))
          .filter((exp) => exp.branchId === fetchBranchId);

        if (date) {
          const startOfDay = new Date(date);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(date);
          endOfDay.setHours(23, 59, 59, 999);

          fetchedExpenses = fetchedExpenses.filter((expense) => {
            const expenseDate = expense.createdAt;
            return expenseDate >= startOfDay && expenseDate <= endOfDay;
          });
        }

        fetchedExpenses.sort((a, b) => b.createdAt - a.createdAt);
        setExpenses(fetchedExpenses);
      } catch (error) {
        handleError(error, "Failed to fetch expenses");
      } finally {
        setLoading(false);
      }
    },
    [localDB, branchId, toast]
  );

  // Get expenses for period
  const getExpensesForPeriod = useCallback(
    async (filterType, date, branchIdParam) => {
      if (!localDB) return 0;

      const fetchBranchId = branchIdParam || branchId;
      if (!fetchBranchId) return 0;

      try {
        const selectedDate = new Date(date);
        if (isNaN(selectedDate.getTime())) return 0;

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
            endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
          case "yearly":
            startDate = new Date(selectedDate.getFullYear(), 0, 1);
            endDate = new Date(selectedDate.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;
          default:
            return 0;
        }

        const result = await localDB.allDocs({
          include_docs: true,
          attachments: false,
        });

        const periodExpenses = result.rows
          .map((row) => ({
            id: row.doc._id,
            branchId: row.doc.branchId,
            amount: parseFloat(row.doc.amount) || 0,
            createdAt: new Date(row.doc.createdAt),
          }))
          .filter((exp) =>
            exp.branchId === fetchBranchId &&
            exp.createdAt >= startDate &&
            exp.createdAt <= endDate
          );

        return periodExpenses.reduce((total, expense) => total + expense.amount, 0);
      } catch (error) {
        console.error("Failed to get expenses for period:", error);
        return 0;
      }
    },
    [localDB, branchId]
  );

  // Add expense
  const addExpense = async (branchIdParam, amount, category, description) => {
    if (!localDB) return;

    const fetchBranchId = branchIdParam || branchId;
    if (!fetchBranchId) {
      throw new Error("Branch ID is required");
    }

    try {
      setLoading(true);
      const expenseDoc = {
        _id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        branchId: fetchBranchId,
        amount: parseFloat(amount) || 0,
        category: category || "other",
        description: description || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await localDB.put(expenseDoc);
      await fetchExpenses(fetchBranchId);
      
      toast({
        title: "Success",
        description: "Expense added successfully",
      });
      return expenseDoc._id;
    } catch (error) {
      handleError(error, "Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  // Update expense
  const updateExpense = async (id, branchIdParam, amount, category, description) => {
    if (!localDB) return;

    const fetchBranchId = branchIdParam || branchId;
    if (!fetchBranchId) {
      throw new Error("Branch ID is required");
    }

    try {
      setLoading(true);
      const doc = await localDB.get(id);
      if (doc.branchId !== fetchBranchId) {
        throw new Error("Expense does not belong to this branch");
      }

      const updatedDoc = {
        ...doc,
        amount: parseFloat(amount) || doc.amount,
        category: category || doc.category,
        description: description || doc.description,
        updatedAt: new Date().toISOString(),
      };

      await localDB.put(updatedDoc);
      await fetchExpenses(fetchBranchId);
      
      toast({
        title: "Success",
        description: "Expense updated successfully",
      });
    } catch (error) {
      handleError(error, "Failed to update expense");
    } finally {
      setLoading(false);
    }
  };

  // Delete expense
  const deleteExpense = async (id, branchIdParam) => {
    if (!localDB) return;

    const fetchBranchId = branchIdParam || branchId;
    if (!fetchBranchId) {
      throw new Error("Branch ID is required");
    }

    try {
      setLoading(true);
      const doc = await localDB.get(id);
      if (doc.branchId !== fetchBranchId) {
        throw new Error("Expense does not belong to this branch");
      }

      await localDB.remove(doc);
      await fetchExpenses(fetchBranchId);
      
      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
    } catch (error) {
      handleError(error, "Failed to delete expense");
    } finally {
      setLoading(false);
    }
  };

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
        description: `Synced ${syncResult.pull.docs_written + syncResult.push.docs_written} expenses.`,
      });
      await fetchExpenses(branchId);
    } catch (error) {
      setSyncStatus("error");
      handleError(error, "Failed to sync expenses");
    }
  };

  // Initial fetch
  useEffect(() => {
    if (localDB && branchId) {
      fetchExpenses(branchId);
    }
  }, [localDB, branchId]);

  const value = {
    expenses,
    loading,
    error,
    isOnline,
    syncStatus,
    branchId,
    setBranchId,
    fetchExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    triggerSync,
    getExpensesForPeriod,
  };

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
};

export default ExpensesProvider;