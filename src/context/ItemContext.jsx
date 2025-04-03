"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const ItemContext = createContext(null);
const COUCHDB_URL = "https://database-production-0fe5.up.railway.app/items";
const COUCHDB_USERNAME = "admin";
const COUCHDB_PASSWORD = "TVYndeHsIB1F";

export const ItemProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [syncStatus, setSyncStatus] = useState("idle");
  const [branchId, setBranchId] = useState(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [localDB, setLocalDB] = useState(null);
  const [remoteDB, setRemoteDB] = useState(null);

  // Initialize PouchDB
  useEffect(() => {
    const initializePouchDB = async () => {
      try {
        const PouchDB = (await import("pouchdb-browser")).default;
        const local = new PouchDB("items");
        const remote = new PouchDB(COUCHDB_URL, {
          auth: { username: COUCHDB_USERNAME, password: COUCHDB_PASSWORD },
          ajax: { withCredentials: true },
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
  const handleError = useCallback(
    (error, message) => {
      console.error(message, error);
      setError(error.message);
      toast({ variant: "destructive", title: "Error", description: message });
      throw error;
    },
    [toast]
  );

  // Validate item data
  const validateItem = useCallback((itemData, isUpdate = false) => {
    const requiredFields = isUpdate
      ? ["id"]
      : ["id", "branchId", "name", "departmentId", "categoryId"];
    const missingFields = requiredFields.filter((field) => !itemData[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    const numericFields = ["costPrice", "sellingPrice", "discountPrice"];
    numericFields.forEach((field) => {
      if (itemData[field] !== undefined && itemData[field] !== null) {
        const value = parseFloat(itemData[field]);
        if (isNaN(value) || value < -1) {
          throw new Error(`Invalid ${field}: must be a non-negative number`);
        }
      }
    });

    if (itemData.stockManagement) {
      const { type, quantity, totalWeight, weightUnit } =
        itemData.stockManagement;
      if (type === "quantity" && isNaN(quantity)) {
        throw new Error("Invalid quantity: must be a number");
      }
      if (type === "weight" && isNaN(totalWeight)) {
        throw new Error("Invalid weight: must be a number");
      }
      if (type === "weight" && !weightUnit) {
        throw new Error("Weight unit is required for weight-based items");
      }
    }
  }, []);

  // Debounce utility
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Fetch items
  const fetchItems = useCallback(
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
        const itemsData = result.rows
          .map((row) => ({
            id: row.doc._id,
            branchId: row.doc.branchId,
            branchName: row.doc.branchName || null,
            departmentId: row.doc.departmentId || null,
            departmentName: row.doc.departmentName || null,
            categoryId: row.doc.categoryId || null,
            categoryName: row.doc.categoryName || null,
            name: row.doc.name,
            description: row.doc.description || null,
            costPrice: parseFloat(row.doc.costPrice || 0),
            sellingPrice: parseFloat(row.doc.sellingPrice || 0),
            discountPrice: parseFloat(row.doc.discountPrice || 0),
            inStock: Boolean(row.doc.inStock),
            stockManagement: row.doc.stockManagement || {},
            createdBy: row.doc.createdBy || "unknown",
            createdAt: row.doc.createdAt || "",
            updatedAt: row.doc.updatedAt || "",
          }))
          .filter((item) => item.branchId === fetchBranchId);

        setItems(itemsData);

        const savedItem = localStorage.getItem("activeItem");
        if (savedItem) {
          const parsedItem = JSON.parse(savedItem);
          const validItem = itemsData.find((i) => i.id === parsedItem.id);
          if (validItem) setActiveItem(validItem);
        }
      } catch (err) {
        handleError(err, "Failed to fetch items");
      } finally {
        setLoading(false);
      }
    },
    [localDB, branchId, handleError]
  );

  // Setup live sync with debounced fetch
  const debouncedFetchItems = useCallback(debounce(fetchItems, 500), [
    fetchItems,
  ]);

  useEffect(() => {
    if (!localDB || !remoteDB) return;

    let sync = null;
    if (isOnline) {
      setSyncStatus("syncing");
      sync = localDB
        .sync(remoteDB, { live: true, retry: true })
        .on("change", () => {
          console.log("Sync change detected");
          debouncedFetchItems();
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
            description:
              "Failed to sync with the server. Some changes may not be saved.",
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
        description:
          "You're working offline. Changes will sync when you're back online.",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      if (sync) sync.cancel();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isOnline, localDB, remoteDB, debouncedFetchItems, toast]);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!localDB || !remoteDB) return;

    if (!isOnline) {
      toast({
        variant: "warning",
        title: "Offline Mode",
        description: "Cannot sync while offline.",
      });
      return;
    }

    try {
      setSyncStatus("syncing");
      const syncResult = await localDB.sync(remoteDB);
      setSyncStatus("idle");
      toast({
        title: "Sync Complete",
        description: `Synced ${
          syncResult.pull.docs_written + syncResult.push.docs_written
        } documents.`,
      });
      await fetchItems();
    } catch (error) {
      setSyncStatus("error");
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message,
      });
    }
  }, [localDB, remoteDB, isOnline, fetchItems, toast]);

  // Fetch items when branchId changes
  useEffect(() => {
    if (localDB && branchId) {
      fetchItems(branchId);
    }
  }, [localDB, branchId, fetchItems]);

  // Set active item
  const setItem = useCallback((item) => {
    if (!item) return;
    const itemToSave = { id: item.id /* ... */ };
    setActiveItem(itemToSave);
    localStorage.setItem("activeItem", JSON.stringify(itemToSave));
  }, []);

  // Add item
  const addItem = useCallback(
    async (itemData) => {
      if (!localDB) return;

      try {
        validateItem(itemData, false);
        const completeItemData = {
          _id: itemData.id,
          branchId: itemData.branchId,
          branchName: itemData.branchName || null,
          departmentId: itemData.departmentId || null,
          departmentName: itemData.departmentName || null,
          categoryId: itemData.categoryId || null,
          categoryName: itemData.categoryName || null,
          name: itemData.name,
          description: itemData.description || null,
          costPrice: parseFloat(itemData.costPrice || 0),
          sellingPrice: parseFloat(itemData.sellingPrice || 0),
          discountPrice: parseFloat(itemData.discountPrice || 0),
          inStock: itemData.inStock ? true : false,
          stockManagement: itemData.stockManagement || {},
          createdBy: user?.email || "unknown",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const response = await localDB.put(completeItemData);
        await fetchItems(completeItemData.branchId);
        toast({ title: "Success", description: "Item added successfully" });
        return response.id;
      } catch (err) {
        handleError(err, "Failed to add item");
      }
    },
    [localDB, fetchItems, validateItem, user?.email, handleError, toast]
  );

  // Update item
  const updateItem = useCallback(
    async (itemData) => {
      if (!localDB) return;

      try {
        validateItem(itemData, true);
        const doc = await localDB.get(itemData.id);
        const updatedDoc = {
          ...doc,
          branchId: itemData.branchId || doc.branchId,
          branchName: itemData.branchName || doc.branchName,
          departmentId: itemData.departmentId || doc.departmentId,
          departmentName: itemData.departmentName || doc.departmentName,
          categoryId: itemData.categoryId || doc.categoryId,
          categoryName: itemData.categoryName || doc.categoryName,
          name: itemData.name || doc.name,
          description:
            itemData.description !== undefined
              ? itemData.description
              : doc.description,
          costPrice: parseFloat(
            itemData.costPrice !== undefined
              ? itemData.costPrice
              : doc.costPrice
          ),
          sellingPrice: parseFloat(
            itemData.sellingPrice !== undefined
              ? itemData.sellingPrice
              : doc.sellingPrice
          ),
          discountPrice: parseFloat(
            itemData.discountPrice !== undefined
              ? itemData.discountPrice
              : doc.discountPrice
          ),
          inStock:
            itemData.inStock !== undefined ? itemData.inStock : doc.inStock,
          stockManagement: itemData.stockManagement || doc.stockManagement,
          updatedAt: new Date().toISOString(),
        };
        await localDB.put(updatedDoc);
        if (activeItem?.id === itemData.id) setItem(updatedDoc);
        await fetchItems(updatedDoc.branchId);
        toast({ title: "Success", description: "Item updated successfully" });
      } catch (err) {
        handleError(err, "Failed to update item");
      }
    },
    [localDB, fetchItems, validateItem, activeItem, setItem, handleError, toast]
  );

  // Delete item
  const deleteItem = useCallback(
    async (id, branchIdParam) => {
      if (!localDB) return;

      try {
        const doc = await localDB.get(id);
        await localDB.remove(doc);
        const fetchBranchId = branchIdParam || branchId;
        if (activeItem?.id === id) {
          const remaining = items.filter((i) => i.id !== id);
          remaining.length > 0 ? setItem(remaining[0]) : setActiveItem(null);
        }
        await fetchItems(fetchBranchId);
        toast({ title: "Success", description: "Item deleted successfully" });
      } catch (err) {
        handleError(err, "Failed to delete item");
      }
    },
    [
      localDB,
      branchId,
      items,
      activeItem,
      setItem,
      fetchItems,
      handleError,
      toast,
    ]
  );

  // Delete all items
  const deleteAllItems = useCallback(
    async (branchIdParam) => {
      if (!localDB) return;

      const deleteBranchId = branchIdParam || branchId;
      if (!deleteBranchId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Branch ID required",
        });
        return;
      }

      try {
        setLoading(true);
        const result = await localDB.allDocs({
          include_docs: true,
          attachments: false,
        });
        const itemsToDelete = result.rows
          .filter((row) => row.doc.branchId === deleteBranchId)
          .map((row) => ({ _id: row.doc._id, _rev: row.doc._rev }));
        if (itemsToDelete.length === 0) return;

        await localDB.bulkDocs(
          itemsToDelete.map((item) => ({ ...item, _deleted: true }))
        );
        setItems([]);
        setActiveItem(null);
        localStorage.removeItem("activeItem");
        toast({
          title: "Success",
          description: `${itemsToDelete.length} items deleted`,
        });
      } catch (err) {
        handleError(err, "Failed to delete all items");
      } finally {
        setLoading(false);
      }
    },
    [localDB, branchId, handleError, toast]
  );

  // Placeholder for pending operations (assuming it's implemented elsewhere)
  const processPendingOperations = useCallback(() => {
    // Implement logic if needed
  }, []);

  const value = {
    items,
    activeItem,
    loading,
    error,
    isOnline,
    syncStatus,
    branchId,
    setBranchId,
    setItem,
    fetchItems,
    addItem,
    updateItem,
    deleteItem,
    deleteAllItems,
    triggerSync,
    pendingSyncCount: 0, // Placeholder; implement if needed
    processPendingOperations,
  };

  return <ItemContext.Provider value={value}>{children}</ItemContext.Provider>;
};

export const useItems = () => {
  const context = useContext(ItemContext);
  if (!context) throw new Error("useItems must be used within an ItemProvider");
  return context;
};
