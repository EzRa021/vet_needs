"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter, usePathname } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

const AuthContext = createContext();
const STORAGE_KEY = "userDetails";
const COUCHDB_URL = "https://database-production-0fe5.up.railway.app/users";
const COUCHDB_USERNAME = "admin";
const COUCHDB_PASSWORD = "TVYndeHsIB1F";

export const AuthProvider = ({ children }) => {
  const [users, setUsers] = useState([]); // All users
  const [userDetails, setUserDetails] = useState(null); // Current authenticated user
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [syncStatus, setSyncStatus] = useState("idle");
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [localDB, setLocalDB] = useState(null);
  const [remoteDB, setRemoteDB] = useState(null);

  // Initialize PouchDB
  useEffect(() => {
    const initializePouchDB = async () => {
      try {
        const PouchDB = (await import("pouchdb-browser")).default;
        const local = new PouchDB("users");
        const remote = new PouchDB(COUCHDB_URL, {
          auth: { username: COUCHDB_USERNAME, password: COUCHDB_PASSWORD },
          ajax: { withCredentials: true },
        });

        setLocalDB(local);
        setRemoteDB(remote);

        // Load current user from localStorage
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
          setUserDetails(JSON.parse(storedData));
        }

        await fetchUsers();
        setLoading(false);
      } catch (err) {
        console.error("PouchDB initialization error:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    initializePouchDB();
  }, []);

  // Handle initial navigation after login - only redirects from public paths
  useEffect(() => {
    if (!loading && userDetails) {
      const publicPaths = ["/", "/register", "/forgot-password"];
      const currentPath = pathname;

      if (publicPaths.includes(currentPath)) {
        router.push(
          `/${userDetails.role.toLowerCase()}`
        );
      }
    }
  }, [userDetails, loading, pathname, router]);

  // Handle logout navigation
  useEffect(() => {
    if (
      !loading &&
      !userDetails &&
      !["/", "/register", "/forgot-password"].includes(pathname)
    ) {
      router.push("/");
    }
  }, [userDetails, loading, pathname, router]);

  // Sync logic
  useEffect(() => {
    if (!localDB || !remoteDB) return;

    let sync = null;
    if (isOnline) {
      setSyncStatus("syncing");
      sync = localDB
        .sync(remoteDB, { live: true, retry: true })
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

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      if (sync) sync.cancel();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isOnline, localDB, remoteDB]);

  // Helper functions
  const hashPassword = async (password) => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  };

  const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
  };

  const handleError = (error, message) => {
    console.error(message, error);
    setError(error.message);
    toast({ variant: "destructive", title: "Error", description: message });
    throw error;
  };

  const validateUser = (userData, isUpdate = false) => {
    const requiredFields = isUpdate
      ? ["id"]
      : ["email", "password", "name"];
    const missingFields = requiredFields.filter((field) => !userData[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    if (
      !isUpdate &&
      userData.role &&
      !["Manager", "Cashier", "General-Manager"].includes(userData.role)
    ) {
      throw new Error("Role must be Manager, Cashier, or General-Manager");
    }
  };

  const createPermissionsObject = (role) => {
    const basePermissions = {
      user: {
        canCreateUser: false,
        canEditUser: false,
        canDeleteUser: false,
        canViewUsers: false,
      },
      branch: {
        canViewBranches: false,
        canCreateBranch: false,
        canEditBranch: false,
        canDeleteBranch: false,
      },
      // Add your full permissions structure here
    };

    role = role.toLowerCase();
    if (role === "general-manager") {
      for (const category in basePermissions) {
        for (const permission in basePermissions[category]) {
          basePermissions[category][permission] = true;
        }
      }
    } else if (role === "manager") {
      basePermissions.inventory = { canViewInventory: true }; // Example
    } else if (role === "cashier") {
      basePermissions.transaction = { canViewTransactions: true }; // Example
    } else if (role === "admin") {
      for (const category in basePermissions) {
        for (const permission in basePermissions[category]) {
          basePermissions[category][permission] = true;
        }
      }
    }

    return basePermissions;
  };

  // Login
  const login = async (email, password) => {
    if (!localDB) throw new Error("Database not initialized");

    try {
      setLoading(true);
      const result = await localDB.allDocs({
        include_docs: true,
        attachments: false,
      });
      const user = result.rows
        .map((row) => row.doc)
        .find((u) => u.email === email);

      if (!user || !(await comparePassword(password, user.password))) {
        throw new Error("Invalid email or password");
      }

      const userData = {
        uid: user._id,
        email: user.email,
        fullname: user.name,
        role: user.role,
        branchId: user.branchId || null,
        permissions: user.permissions || {},
        branchName:user.branchName,
        branchLocation:user.branchLocation,
        branchPhone:user.branchPhone
      };

      setUserDetails(userData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      toast({
        title: "Login Successful",
        description: `Logged in as ${user.role.replace("-", " ")}`,
      });

      return userData;
    } catch (error) {
      handleError(error, error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Register (Admin only)
  const register = async (email, password, fullname) => {
    if (!localDB) throw new Error("Database not initialized");

    try {
      setLoading(true);
      const result = await localDB.allDocs({
        include_docs: true,
        attachments: false,
      });
      if (result.rows.some((row) => row.doc.email === email)) {
        throw new Error("Email already in use");
      }

      const hashedPassword = await hashPassword(password);
      const userDoc = {
        _id: uuidv4(),
        name: fullname,
        email,
        role: "admin",
        permissions: createPermissionsObject("admin"),
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await localDB.put(userDoc);
      const userData = {
        uid: userDoc._id,
        email,
        fullname,
        role: "admin",
        permissions: userDoc.permissions,
      };

      setUserDetails(userData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      await fetchUsers();
      toast({
        title: "Registration Successful",
        description: "Admin account created",
      });

      return userData;
    } catch (error) {
      handleError(error, error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUserDetails(null);
    router.push("/");
    toast({
      title: "Logout Successful",
      description: "Logged out successfully",
    });
  };

  // Fetch all users
  const fetchUsers = useCallback(async () => {
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
  console.log(usersData)
      setUsers(usersData);
    } catch (err) {
      handleError(err, "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [localDB]);

  // Create user (for non-admin roles)
  const createUser = async (userData) => {
    if (!localDB) return;

    try {
      validateUser(userData, false);

      const existingUser = users.find((u) => u.email === userData.email);
      if (existingUser) throw new Error("Email already exists");

      const hashedPassword = await hashPassword(userData.password);
      const permissions = createPermissionsObject(userData.role || "Cashier");
      const completeUserData = {
        _id: userData.id || uuidv4(),
        branchId: userData.branchId,
        name: userData.name,
        email: userData.email,
        role: userData.role || "Cashier",
        branchName: userData.branchName,
        branchPhone: userData.branchPhone,
        branchLocation: userData.branchLocation,
        permissions,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await localDB.put(completeUserData);
      await fetchUsers();
      toast({ title: "Success", description: "User created successfully" });
      return completeUserData._id;
    } catch (error) {
      handleError(error, "Failed to create user");
    }
  };

  // Update user
  const updateUser = async (userData) => {
    if (!localDB) return;

    try {
      validateUser(userData, true);
      const doc = await localDB.get(userData.id);

      const updatedDoc = {
        ...doc,
        branchId: userData.branchId || doc.branchId,
        name: userData.name || doc.name,
        email: userData.email || doc.email,
        role: userData.role || doc.role,
        branchName: doc.branchName,
        branchPhone: doc.branchPhone,
        branchLocation: doc.branchLocation,
        permissions: userData.role
          ? createPermissionsObject(userData.role)
          : doc.permissions,
        password: userData.password
          ? await hashPassword(userData.password)
          : doc.password,
        updatedAt: new Date().toISOString(),
      };

      await localDB.put(updatedDoc);
      await fetchUsers();
      if (userDetails?.uid === userData.id) {
        setUserDetails({
          ...userDetails,
          ...userData,
          permissions: updatedDoc.permissions,
        });
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            ...userDetails,
            ...userData,
            permissions: updatedDoc.permissions,
          })
        );
      }
      toast({ title: "Success", description: "User updated successfully" });
    } catch (error) {
      handleError(error, "Failed to update user");
    }
  };

  // Delete user
  const deleteUser = async (id) => {
    if (!localDB) return;

    try {
      const doc = await localDB.get(id);
      await localDB.remove(doc);
      await fetchUsers();
      if (userDetails?.uid === id) signOut();
      toast({ title: "Success", description: "User deleted successfully" });
    } catch (error) {
      handleError(error, "Failed to delete user");
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
    return updateUser({ ...managerData, role: "General-Manager" });
  };

  // Delete manager
  const deleteManager = async (id) => {
    return deleteUser(id);
  };

  // Utility functions
  const getUsersByRole = (role) => users.filter((user) => user.role === role);
  const getUserById = (userId) => users.find((user) => user.id === userId);
  const getUsersByBranch = (branchId) =>
    users.filter((user) => user.branchId === branchId);

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
        description: `Synced ${
          syncResult.pull.docs_written + syncResult.push.docs_written
        } users`,
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

  const isAuthenticated = !!userDetails && !loading;

  if (loading || !localDB || !remoteDB) return null;

  const value = {
    users,
    userDetails,
    loading,
    error,
    isOnline,
    syncStatus,
    isAuthenticated,
    login,
    register,
    signOut,
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export default AuthContext;
