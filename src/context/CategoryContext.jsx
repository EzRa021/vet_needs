"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const CategoryContext = createContext(null);
const COUCHDB_URL = "https://database-production-0fe5.up.railway.app/categories"; // Adjust as needed
const COUCHDB_USERNAME = "admin";
const COUCHDB_PASSWORD = "TVYndeHsIB1F";

export const CategoryProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle, syncing, error
  const [branchId, setBranchId] = useState(null);
  const [departmentId, setDepartmentId] = useState(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [localDB, setLocalDB] = useState(null);
  const [remoteDB, setRemoteDB] = useState(null);

  // Initialize PouchDB only on the client
  useEffect(() => {
    const initializePouchDB = async () => {
      try {
        const PouchDB = (await import("pouchdb-browser")).default; // Dynamic import
        const local = new PouchDB("categories");
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
          fetchCategories();
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
    window.removeEventListener("offline", handleOffline);

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
      await fetchCategories();
    } catch (error) {
      setSyncStatus("error");
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message,
      });
    }
  };

  // Fetch categories from local PouchDB
  const fetchCategories = async (branchIdParam, departmentIdParam) => {
    if (!localDB) return;

    const fetchBranchId = branchIdParam || branchId;
    const fetchDepartmentId = departmentIdParam || departmentId;

    if (!fetchBranchId || !fetchDepartmentId) return;

    try {
      setLoading(true);
      const result = await localDB.allDocs({
        include_docs: true,
        attachments: false,
      });
      const categoriesData = result.rows
        .map((row) => ({
          id: row.doc._id,
          branchId: row.doc.branchId,
          departmentId: row.doc.departmentId,
          name: row.doc.name,
          description: row.doc.description || null,
          createdBy: row.doc.createdBy || "unknown",
          createdAt: row.doc.createdAt || "",
          updatedAt: row.doc.updatedAt || "",
        }))
        .filter((cat) => cat.branchId === fetchBranchId && cat.departmentId === fetchDepartmentId);

      setCategories(categoriesData);

      // Set active category from local storage
      const savedCategory = localStorage.getItem("activeCategory");
      if (savedCategory) {
        const parsedCategory = JSON.parse(savedCategory);
        const validCategory = categoriesData.find((c) => c.id === parsedCategory.id);
        if (validCategory) setActiveCategory(validCategory);
      }
    } catch (err) {
      handleError(err, "Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  // Set active category
  const setCategory = (category) => {
    if (!category) return;
    const categoryToSave = {
      id: category.id,
      branchId: category.branchId,
      departmentId: category.departmentId,
      name: category.name,
      description: category.description || null,
    };
    setActiveCategory(categoryToSave);
    localStorage.setItem("activeCategory", JSON.stringify(categoryToSave));
  };

  // Add a category
  const addCategory = async (branchIdParam, departmentIdParam, name, description) => {
    if (!localDB) return;

    const categoryId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const categoryData = {
      _id: categoryId,
      branchId: branchIdParam || branchId,
      departmentId: departmentIdParam || departmentId,
      name,
      description: description || null,
      createdBy: user?.email || "unknown",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!categoryData.branchId || !categoryData.departmentId) {
      throw new Error("Branch ID and Department ID are required");
    }

    try {
      const response = await localDB.put(categoryData);
      await fetchCategories(categoryData.branchId, categoryData.departmentId);
      toast({
        title: "Success",
        description: "Category added successfully",
      });
      return response.id;
    } catch (err) {
      handleError(err, "Failed to add category");
    }
  };

  // Update a category
  const updateCategory = async (id, branchIdParam, departmentIdParam, name, description) => {
    if (!localDB) return;

    try {
      const doc = await localDB.get(id);

      const updatedDoc = {
        ...doc,
        branchId: branchIdParam || branchId,
        departmentId: departmentIdParam || departmentId,
        name,
        description: description || null,
        updatedAt: new Date().toISOString(),
      };

      if (!updatedDoc.branchId || !updatedDoc.departmentId) {
        throw new Error("Branch ID and Department ID are required");
      }

      await localDB.put(updatedDoc);

      if (activeCategory?.id === id) {
        setCategory(updatedDoc);
      }

      await fetchCategories(updatedDoc.branchId, updatedDoc.departmentId);
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
    } catch (err) {
      handleError(err, "Failed to update category");
    }
  };

  // Delete a category
  const deleteCategory = async (id, branchIdParam, departmentIdParam) => {
    if (!localDB) return;

    try {
      const doc = await localDB.get(id);
      await localDB.remove(doc);

      const fetchBranchId = branchIdParam || branchId;
      const fetchDepartmentId = departmentIdParam || departmentId;

      if (activeCategory?.id === id) {
        const remaining = categories.filter((c) => c.id !== id);
        remaining.length > 0 ? setCategory(remaining[0]) : setActiveCategory(null);
      }

      await fetchCategories(fetchBranchId, fetchDepartmentId);
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    } catch (err) {
      handleError(err, "Failed to delete category");
    }
  };

  // Initial fetch
  useEffect(() => {
    if (localDB && branchId && departmentId) {
      fetchCategories(branchId, departmentId);
    }
  }, [localDB, branchId, departmentId]);

  const value = {
    categories,
    activeCategory,
    loading,
    error,
    isOnline,
    syncStatus,
    branchId,
    departmentId,
    setBranchId,
    setDepartmentId,
    setCategory,
    addCategory,
    updateCategory,
    deleteCategory,
    triggerSync,
    fetchCategories,
  };

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
};

export const useCategories = () => {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error("useCategories must be used within a CategoryProvider");
  }
  return context;
};