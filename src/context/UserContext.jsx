"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useBranches } from "@/context/BranchContext";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

const UserContext = createContext(null);
const COUCHDB_URL = "https://database-production-0fe5.up.railway.app/users";
const COUCHDB_USERNAME = "admin";
const COUCHDB_PASSWORD = "TVYndeHsIB1F";

export const UserProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState("idle");
  const { branches } = useBranches();
  const { toast } = useToast();
  const [localDB, setLocalDB] = useState(null);
  const [remoteDB, setRemoteDB] = useState(null);

  // Initialize PouchDB
  useEffect(() => {
    const initializePouchDB = async () => {
      try {
        const PouchDB = (await import("pouchdb-browser")).default;
        const local = new PouchDB("users");
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

  // Error handler
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

  // Validate user data
  const validateUser = (userData, isUpdate = false) => {
    const requiredFields = isUpdate
      ? ["id"]
      : ["id", "email", "password", "branchId", "name"];
    const missingFields = requiredFields.filter((field) => !userData[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    if (!isUpdate && userData.role && !["Manager", "Cashier", "General-Manager"].includes(userData.role)) {
      throw new Error("Role must be Manager, Cashier, or General-Manager");
    }
  };

  // Permissions based on role
  const createPermissionsObject = (role) => {
    const basePermissions = {
      user: { canCreateUser: false, canEditUser: false, canDeleteUser: false, canViewUsers: false },
      branch: { canViewBranches: false, canCreateBranch: false, canEditBranch: false, canDeleteBranch: false },
      // ... (keep your existing permissions structure)
    };

    role = role.toLowerCase();
    if (role === "general-manager") {
      for (const category in basePermissions) {
        for (const permission in basePermissions[category]) {
          basePermissions[category][permission] = true;
        }
      }
    } else if (role === "manager") {
      basePermissions.inventory.canViewInventory = true;
      // ... (keep your existing manager permissions)
    } else if (role === "cashier") {
      basePermissions.transaction.canViewTransactions = true;
      // ... (keep your existing cashier permissions)
    }

    return basePermissions;
  };

  // Hash password
  const hashPassword = async (password) => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
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
        .on("change", () => fetchUsers())
        .on("paused", () => setSyncStatus("idle"))
        .on("active", () => setSyncStatus("syncing"))
        .on("error", (err) => {
          console.error("Sync error:", err);
          setSyncStatus("error");
          toast({
            variant: "destructive",
            title: "Sync Error",
            description: "Failed to sync with server",
          });
        });
    }

    const handleOnline = () => {
      setIsOnline(true);
      toast({ title: "Back Online", description: "Changes will now sync" });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        variant: "warning",
        title: "Offline Mode",
        description: "Changes will sync when online",
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

  // Manual sync
  const triggerSync = async () => {
    if (!localDB || !remoteDB) return;

    if (!isOnline) {
      toast({
        variant: "warning",
        title: "Offline Mode",
        description: "Cannot sync while offline",
      });
      return;
    }

    try {
      setSyncStatus("syncing");
      const syncResult = await localDB.sync(remoteDB);
      setSyncStatus("idle");
      toast({
        title: "Sync Complete",
        description: `Synced ${syncResult.pull.docs_written + syncResult.push.docs_written} users`,
      });
      await fetchUsers();
    } catch (error) {
      setSyncStatus("error");
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message,
      });
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    if (!localDB) return;

    try {
      setLoading(true);
      const result = await localDB.allDocs({
        include_docs: true,
        attachments: false,
      });

      const usersData = result.rows.map((row) => ({
        id: row.doc._id,
        branchId: row.doc.branchId,
        name: row.doc.name,
        email: row.doc.email,
        role: row.doc.role,
        branchName: row.doc.branchName,
        branchPhone: row.doc.branchPhone,
        branchLocation: row.doc.branchLocation,
        permissions: row.doc.permissions,
        createdAt: row.doc.createdAt,
        updatedAt: row.doc.updatedAt,
      }));

      setUsers(usersData);
    } catch (err) {
      handleError(err, "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  // Create user
  const createUser = async (userData) => {
    if (!localDB) return;

    try {
      validateUser(userData, false);
      const branch = branches.find(b => b._id === userData.branchId);
      if (!branch) throw new Error("Invalid branch ID");

      const existingUser = users.find(u => u.email === userData.email);
      if (existingUser) throw new Error("Email already exists");

      const hashedPassword = await hashPassword(userData.password);
      const permissions = createPermissionsObject(userData.role || "Cashier");
      const completeUserData = {
        _id: userData.id || uuidv4(),
        branchId: userData.branchId,
        name: userData.name,
        email: userData.email,
        role: userData.role || "Cashier",
        branchName: branch.branchName,
        branchPhone: branch.phone,
        branchLocation: branch.location,
        permissions,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await localDB.put(completeUserData);
      await fetchUsers();
      toast({
        title: "Success",
        description: "User created successfully",
      });
      return completeUserData._id;
    } catch (err) {
      handleError(err, "Failed to create user");
    }
  };

  // Update user
  const updateUser = async (userData) => {
    if (!localDB) return;

    try {
      validateUser(userData, true);
      const doc = await localDB.get(userData.id);
      const branch = branches.find(b => b._id === (userData.branchId || doc.branchId));

      const updatedDoc = {
        ...doc,
        branchId: userData.branchId || doc.branchId,
        name: userData.name || doc.name,
        email: userData.email || doc.email,
        role: userData.role || doc.role,
        branchName: branch?.branchName || doc.branchName,
        branchPhone: branch?.phone || doc.branchPhone,
        branchLocation: branch?.location || doc.branchLocation,
        permissions: userData.role ? createPermissionsObject(userData.role) : doc.permissions,
        password: userData.password ? await hashPassword(userData.password) : doc.password,
        updatedAt: new Date().toISOString(),
      };

      await localDB.put(updatedDoc);
      await fetchUsers();
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    } catch (err) {
      handleError(err, "Failed to update user");
    }
  };

  // Delete user
  const deleteUser = async (id) => {
    if (!localDB) return;

    try {
      const doc = await localDB.get(id);
      await localDB.remove(doc);
      await fetchUsers();
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    } catch (err) {
      handleError(err, "Failed to delete user");
    }
  };

  // Create manager
  const createManager = async (managerData) => {
    return createUser({
      ...managerData,
      role: "General-Manager",
      id: managerData.id || uuidv4(),
    });
  };

  // Update manager
  const updateManager = async (managerData) => {
    return updateUser({
      ...managerData,
      role: "General-Manager",
    });
  };

  // Delete manager
  const deleteManager = async (id) => {
    return deleteUser(id);
  };

  // Utility functions
  const getUsersByRole = (role) => users.filter((user) => user.role === role);
  const getUserById = (userId) => users.find((user) => user.id === userId);
  const getUsersByBranch = (branchId) => users.filter((user) => user.branchId === branchId);

  // Initial fetch
  useEffect(() => {
    if (localDB) {
      fetchUsers();
    }
  }, [localDB]);

  const value = {
    users,
    loading,
    error,
    isOnline,
    syncStatus,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    createManager,
    updateManager,
    deleteManager,
    getUsersByRole,
    getUserById,
    getUsersByBranch,
    triggerSync,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};