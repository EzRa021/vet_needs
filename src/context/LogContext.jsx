"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useBranches } from "@/context/BranchContext";
import { useToast } from "@/hooks/use-toast";

const LogContext = createContext();
const COUCHDB_URL = "https://database-production-0fe5.up.railway.app/logs"; // Adjust as needed
const COUCHDB_USERNAME = "admin";
const COUCHDB_PASSWORD = "TVYndeHsIB1F";

export const LogProvider = ({ children }) => {
  const { activeBranch, branches } = useBranches();
  const [logs, setLogs] = useState([]);
  const [actionTypes, setActionTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle, syncing, error
  const { toast } = useToast();
  const [localDB, setLocalDB] = useState(null);
  const [remoteDB, setRemoteDB] = useState(null);

  // Initialize PouchDB only on the client
  useEffect(() => {
    const initializePouchDB = async () => {
      try {
        const PouchDB = (await import("pouchdb-browser")).default; // Dynamic import
        const local = new PouchDB("logs");
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
      title: "Error",
      description: error.message || message,
      variant: "destructive",
    });
  };

  // Fetch logs from local PouchDB
  const fetchLogs = async () => {
    if (!localDB || !activeBranch?.id) return;

    setLoading(true);
    setError(null);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await localDB.allDocs({
        include_docs: true,
        attachments: false,
      });

      const fetchedLogs = result.rows
        .map((row) => ({
          id: row.doc._id,
          branchId: row.doc.branchId,
          action: row.doc.action,
          message: row.doc.message,
          date: new Date(row.doc.date),
          metadata: row.doc.metadata || {},
          synced: row.doc.synced || false,
        }))
        .filter((log) => log.branchId === activeBranch.id)
        .sort((a, b) => b.date - a.date)
        .slice(0, 100); // Limit to last 100 logs

      const filteredLogs = fetchedLogs.filter((log) => log.date >= today);

      setLogs(filteredLogs);
      setActionTypes([...new Set(filteredLogs.map((log) => log.action))]);
    } catch (error) {
      handleError(error, "Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  };

  // Add log
  const addLog = async ({ action, message, metadata = {}, logId, branchId = activeBranch?.id }) => {
    if (!localDB || !branchId) {
      console.error("No branch ID provided for log.");
      setError("No branch ID provided for log.");
      return;
    }

    try {
      setLoading(true);
      const finalLogId = logId || `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const logDoc = {
        _id: finalLogId,
        branchId,
        action,
        message,
        date: new Date().toISOString(),
        metadata,
        synced: isOnline, // Mark as synced if online
      };

      await localDB.put(logDoc);

      const newLog = {
        id: logDoc._id,
        branchId: logDoc.branchId,
        action: logDoc.action,
        message: logDoc.message,
        date: new Date(logDoc.date),
        metadata: logDoc.metadata,
        synced: logDoc.synced,
      };

      setLogs((prev) => [newLog, ...prev].slice(0, 100));
      setActionTypes((prev) => [...new Set([...prev, action])]);

      toast({
        title: "Success",
        description: "Log added successfully",
      });
      
      return finalLogId;
    } catch (error) {
      handleError(error, "Failed to add log");
    } finally {
      setLoading(false);
    }
  };

  // Add waybill log
  const addWaybillLog = async (action, waybillData) => {
    if (!localDB) return;

    const { senderBranchId, receiverBranchId, items, id: waybillId } = waybillData;
    const senderBranch = branches.find((b) => b.id === senderBranchId);
    const receiverBranch = branches.find((b) => b.id === receiverBranchId);
    const timestamp = Date.now();

    try {
      if (action === "send") {
        const senderLogId = `${timestamp}-waybill-sent-${waybillId}`;
        const receiverLogId = `${timestamp}-waybill-received-${waybillId}`;

        await addLog({
          action: "waybill-sent",
          message: `Sent items ${items
            .map((item) => `${item.name} (${item.quantity || item.weight})`)
            .join(", ")} to ${receiverBranch.branchName}`,
          metadata: { waybillId, receiverBranchId },
          logId: senderLogId,
          branchId: senderBranchId,
        });

        await addLog({
          action: "waybill-received",
          message: `Received items ${items
            .map((item) => `${item.name} (${item.quantity || item.weight})`)
            .join(", ")} from ${senderBranch.branchName}`,
          metadata: { waybillId, senderBranchId },
          logId: receiverLogId,
          branchId: receiverBranchId,
        });
      } else if (action === "accept") {
        const receiverLogId = `${timestamp}-waybill-accepted-${waybillId}`;
        const senderLogId = `${timestamp}-waybill-accepted-notification-${waybillId}`;

        await addLog({
          action: "waybill-accepted",
          message: `Accepted items ${items
            .map((item) => `${item.name} (${item.quantity || item.weight})`)
            .join(", ")} from ${senderBranch.branchName}`,
          metadata: { waybillId, senderBranchId },
          logId: receiverLogId,
          branchId: receiverBranchId,
        });

        await addLog({
          action: "waybill-accepted-by-receiver",
          message: `${receiverBranch.branchName} accepted items ${items
            .map((item) => `${item.name} (${item.quantity || item.weight})`)
            .join(", ")}`,
          metadata: { waybillId, receiverBranchId },
          logId: senderLogId,
          branchId: senderBranchId,
        });
      }
    } catch (error) {
      handleError(error, "Failed to add waybill log");
    }
  };

  // Online/Offline event listeners and sync setup
  useEffect(() => {
    if (!localDB || !remoteDB) return;

    let sync = null;

    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Logs will now sync to the server.",
      });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        variant: "warning",
        title: "Offline Mode",
        description: "You're working offline. Logs will sync when back online.",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (isOnline && activeBranch?.id) {
      setSyncStatus("syncing");
      sync = localDB
        .sync(remoteDB, { live: true, retry: true })
        .on("change", (info) => {
          console.log("Sync change detected", info);
          fetchLogs();
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
          console.error("Logs sync error:", err);
          setSyncStatus("error");
          toast({
            variant: "destructive",
            title: "Sync Error",
            description: "Failed to sync logs with the server.",
          });
        });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (sync) sync.cancel();
    };
  }, [isOnline, activeBranch?.id, localDB, remoteDB, toast]);

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

    if (!activeBranch?.id) {
      toast({
        title: "Error",
        description: "No active branch selected",
        variant: "destructive",
      });
      return;
    }

    try {
      setSyncStatus("syncing");
      const syncResult = await localDB.sync(remoteDB);
      setSyncStatus("idle");
      toast({
        title: "Sync Complete",
        description: `Synced ${syncResult.pull.docs_written + syncResult.push.docs_written} logs.`,
      });
      await fetchLogs();
    } catch (error) {
      setSyncStatus("error");
      handleError(error, "Failed to sync logs");
    }
  };

  // Fetch logs when activeBranch changes
  useEffect(() => {
    if (localDB && activeBranch?.id) {
      fetchLogs();
    }
  }, [activeBranch, localDB]);

  return (
    <LogContext.Provider
      value={{
        logs,
        actionTypes,
        loading,
        error,
        isOnline,
        syncStatus,
        addLog,
        addWaybillLog,
        triggerSync,
      }}
    >
      {children}
    </LogContext.Provider>
  );
};

export const useLogs = () => {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error("useLogs must be used within a LogProvider");
  }
  return context;
};

export default LogProvider;