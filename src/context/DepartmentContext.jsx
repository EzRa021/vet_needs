"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const DepartmentContext = createContext(null);
const COUCHDB_URL = "https://database-production-0fe5.up.railway.app/departments"; // Adjust as needed
const COUCHDB_USERNAME = "admin";
const COUCHDB_PASSWORD = "TVYndeHsIB1F";

export const DepartmentProvider = ({ children }) => {
  const [departments, setDepartments] = useState([]);
  const [activeDepartment, setActiveDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle, syncing, error
  const [branchId, setBranchId] = useState(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [localDB, setLocalDB] = useState(null);
  const [remoteDB, setRemoteDB] = useState(null);

  // Initialize PouchDB only on the client
  useEffect(() => {
    const initializePouchDB = async () => {
      try {
        const PouchDB = (await import("pouchdb-browser")).default; // Dynamic import
        const local = new PouchDB("departments");
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
          fetchDepartments();
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
      await fetchDepartments();
    } catch (error) {
      setSyncStatus("error");
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message,
      });
    }
  };

  // Fetch departments from local PouchDB
  const fetchDepartments = async () => {
    if (!localDB || !branchId) return;

    try {
      setLoading(true);
      const result = await localDB.allDocs({
        include_docs: true,
        attachments: false,
      });
      const departmentsData = result.rows
        .map((row) => ({
          id: row.doc._id,
          branchId: row.doc.branchId,
          name: row.doc.name,
          createdBy: row.doc.createdBy || "unknown",
          createdAt: row.doc.createdAt || "",
          updatedAt: row.doc.updatedAt || "",
        }))
        .filter((dept) => dept.branchId === branchId);

      setDepartments(departmentsData);

      // Set active department from local storage
      const savedDepartment = localStorage.getItem("activeDepartment");
      if (savedDepartment) {
        const parsedDepartment = JSON.parse(savedDepartment);
        const validDepartment = departmentsData.find((d) => d.id === parsedDepartment.id);
        if (validDepartment) setActiveDepartment(validDepartment);
      }
    } catch (err) {
      handleError(err, "Failed to fetch departments");
    } finally {
      setLoading(false);
    }
  };

  // Set active department
  const setDepartment = (department) => {
    if (!department) return;
    const departmentToSave = {
      id: department.id,
      branchId: department.branchId,
      name: department.name,
    };
    setActiveDepartment(departmentToSave);
    localStorage.setItem("activeDepartment", JSON.stringify(departmentToSave));
  };

  // Add a department
  const addDepartment = async (departmentData) => {
    if (!localDB) return;

    try {
      const completeDepartmentData = {
        _id: departmentData.id,
        branchId: departmentData.branchId || branchId,
        name: departmentData.name,
        createdBy: user?.email || "unknown",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const response = await localDB.put(completeDepartmentData);
      await fetchDepartments();
      toast({
        title: "Success",
        description: "Department added successfully",
      });

      return response.id;
    } catch (err) {
      handleError(err, "Failed to add department");
    }
  };

  // Update a department
  const updateDepartment = async (id, departmentData) => {
    if (!localDB) return;

    try {
      const doc = await localDB.get(id);

      const updatedDoc = {
        ...doc,
        ...departmentData,
        branchId: departmentData.branchId || branchId,
        updatedAt: new Date().toISOString(),
      };

      await localDB.put(updatedDoc);

      if (activeDepartment?.id === id) {
        setDepartment(updatedDoc);
      }

      await fetchDepartments();
      toast({
        title: "Success",
        description: "Department updated successfully",
      });
    } catch (err) {
      handleError(err, "Failed to update department");
    }
  };

  // Delete a department
  const deleteDepartment = async (id) => {
    if (!localDB) return;

    try {
      const doc = await localDB.get(id);
      await localDB.remove(doc);

      if (activeDepartment?.id === id) {
        const remaining = departments.filter((d) => d.id !== id);
        remaining.length > 0 ? setDepartment(remaining[0]) : setActiveDepartment(null);
      }

      await fetchDepartments();
      toast({
        title: "Success",
        description: "Department deleted successfully",
      });
    } catch (err) {
      handleError(err, "Failed to delete department");
    }
  };

  // Initial fetch
  useEffect(() => {
    if (localDB && branchId) {
      fetchDepartments();
    }
  }, [localDB, branchId]);

  const value = {
    departments,
    activeDepartment,
    loading,
    error,
    isOnline,
    syncStatus,
    branchId,
    setBranchId,
    setDepartment,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    triggerSync,
    fetchDepartments,
  };

  return <DepartmentContext.Provider value={value}>{children}</DepartmentContext.Provider>;
};

export const useDepartments = () => {
  const context = useContext(DepartmentContext);
  if (!context) {
    throw new Error("useDepartments must be used within a DepartmentProvider");
  }
  return context;
};