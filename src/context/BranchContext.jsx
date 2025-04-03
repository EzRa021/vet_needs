"use client";
import { createContext, useState, useContext, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const BranchContext = createContext(null);
const COUCHDB_URL = "https://database-production-0fe5.up.railway.app/branches";
const COUCHDB_USERNAME = "admin";
const COUCHDB_PASSWORD = "TVYndeHsIB1F";

export const BranchProvider = ({ children }) => {
  const [branches, setBranches] = useState([]);
  const [activeBranch, setActiveBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle, syncing, error
  const { user } = useAuth();
  const { toast } = useToast();
  const [localDB, setLocalDB] = useState(null);
  const [remoteDB, setRemoteDB] = useState(null);

  // Initialize PouchDB only on the client
  useEffect(() => {
    const initializePouchDB = async () => {
      try {
        const PouchDB = (await import("pouchdb-browser")).default; // Dynamic import
        const local = new PouchDB("branches");
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

    if (isOnline) {
      setSyncStatus("syncing");

      sync = localDB
        .sync(remoteDB, {
          live: true,
          retry: true,
        })
        .on("change", (change) => {
          console.log("Sync change detected", change);
          fetchBranches();
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
            description: "Failed to sync with the server. Some changes may not be saved."
          });
        });
    }

    // Online/offline detection
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
  }, [isOnline, localDB, remoteDB]);

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
      await fetchBranches();
    } catch (error) {
      setSyncStatus("error");
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message,
      });
    }
  };

  // Fetch branches from local PouchDB
  const fetchBranches = async () => {
    if (!localDB) return;

    try {
      setLoading(true);
      const result = await localDB.allDocs({
        include_docs: true,
        attachments: false,
      });
      const branchesData = result.rows.map((row) => ({
        id: row.doc._id,
        branchName: row.doc.branchName,
        location: row.doc.location || null,
        phone: row.doc.phone || null,
        createdBy: row.doc.createdBy || "unknown",
        createdAt: row.doc.createdAt || "",
        updatedAt: row.doc.updatedAt || "",
      }));

      setBranches(branchesData);

      // Set active branch from local storage
      const savedBranch = localStorage.getItem("activeBranch");
      if (savedBranch) {
        const parsedBranch = JSON.parse(savedBranch);
        const validBranch = branchesData.find((b) => b.id === parsedBranch.id);
        if (validBranch) setActiveBranch(validBranch);
      }
    } catch (err) {
      handleError(err, "Failed to fetch branches");
    } finally {
      setLoading(false);
    }
  };

  // Set active branch
  const setBranch = (branch) => {
    if (!branch) return;
    const branchToSave = {
      id: branch.id,
      branchName: branch.branchName,
      location: branch.location || null,
      phone: branch.phone || null,
    };
    setActiveBranch(branchToSave);
    localStorage.setItem("activeBranch", JSON.stringify(branchToSave));
  };

  // Add a branch
  const addBranch = async (branchData) => {
    if (!localDB) return;

    try {
      const completeBranchData = {
        _id: branchData.id,
        branchName: branchData.branchName,
        location: branchData.location || null,
        phone: branchData.phone || null,
        createdBy: user?.email || "unknown",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const response = await localDB.put(completeBranchData);
      await fetchBranches();
      toast({
        title: "Success",
        description: "Branch added successfully",
      });

      return response.id;
    } catch (err) {
      handleError(err, "Failed to add branch");
    }
  };

  // Update a branch
  const updateBranch = async (id, branchData) => {
    if (!localDB) return;

    try {
      // Get the current document to retrieve its revision
      const doc = await localDB.get(id);

      const updatedDoc = {
        ...doc,
        ...branchData,
        updatedAt: new Date().toISOString(),
      };

      await localDB.put(updatedDoc);

      if (activeBranch?.id === id) {
        setBranch(updatedDoc);
      }

      await fetchBranches();
      toast({
        title: "Success",
        description: "Branch updated successfully",
      });
    } catch (err) {
      handleError(err, "Failed to update branch");
    }
  };

  // Delete a branch
  const deleteBranch = async (id) => {
    if (!localDB) return;

    try {
      const doc = await localDB.get(id);
      await localDB.remove(doc);

      if (activeBranch?.id === id) {
        const remaining = branches.filter((b) => b.id !== id);
        remaining.length > 0 ? setBranch(remaining[0]) : setActiveBranch(null);
      }

      await fetchBranches();
      toast({
        title: "Success",
        description: "Branch deleted successfully",
      });
    } catch (err) {
      handleError(err, "Failed to delete branch");
    }
  };

  // Initial fetch
  useEffect(() => {
    if (localDB) {
      fetchBranches();
    }
  }, [localDB]);

  const value = {
    branches,
    activeBranch,
    loading,
    error,
    isOnline,
    syncStatus,
    setBranch,
    addBranch,
    updateBranch,
    deleteBranch,
    triggerSync,
  };

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
};

export const useBranches = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error("useBranches must be used within a BranchProvider");
  }
  return context;
};