"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import PouchDB from "pouchdb-browser";
import { useAuth } from "../AuthContext";

const ReportContext = createContext(undefined);
const COUCHDB_URL = "https://database-production-0fe5.up.railway.app/reports"; // Adjust as needed
const COUCHDB_USERNAME = "admin";
const COUCHDB_PASSWORD = "TVYndeHsIB1F";

export const useReports = () => {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error("useReports must be used within a ReportsProvider");
  }
  return context;
};

export const ReportProvider = ({ children }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [allReports, setAllReports] = useState([]);
  const { userDetails } = useAuth();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle, syncing, error
  const [localDB, setLocalDB] = useState(null);
  const [remoteDB, setRemoteDB] = useState(null);

  const REPORTS_PER_PAGE = 5;

  // Initialize PouchDB only on client
  useEffect(() => {
    const initializePouchDB = async () => {
      try {
        const local = new PouchDB("reports");
        const remote = new PouchDB(COUCHDB_URL, {
          auth: {
            username: COUCHDB_USERNAME,
            password: COUCHDB_PASSWORD,
          },
          ajax: {
            withCredentials: true,
          }
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

  // Online/Offline event listeners and sync setup
  useEffect(() => {
    if (!localDB || !remoteDB) return;
    
    let sync = null;

    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Reports will now sync to the server.",
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        variant: "warning",
        title: "Offline Mode",
        description: "You're working offline. Reports will sync when back online.",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (isOnline && userDetails?.branchId) {
      setSyncStatus("syncing");
      sync = localDB
        .sync(remoteDB, { live: true, retry: true })
        .on("change", () => fetchReports())
        .on("paused", () => setSyncStatus("idle"))
        .on("active", () => setSyncStatus("syncing"))
        .on("error", (err) => {
          console.error("Reports sync error:", err);
          setSyncStatus("error");
          toast({
            variant: "destructive",
            title: "Sync Error",
            description: "Failed to sync reports with the server.",
          });
        });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (sync) sync.cancel();
    };
  }, [isOnline, userDetails?.branchId, localDB, remoteDB]);

  // Fetch reports from local PouchDB
  const fetchReports = useCallback(
    async (date) => {
      if (!localDB) return [];
      
      if (!userDetails?.branchId) {
        setError("No active branch selected");
        toast({
          title: "Error",
          description: "No active branch selected",
          variant: "destructive",
        });
        return [];
      }

      setLoading(true);
      setError(null);
      setCurrentPage(1);

      try {
        const result = await localDB.allDocs({
          include_docs: true,
          attachments: false,
        });

        let fetchedReports = result.rows
          .map((row) => ({
            id: row.doc._id,
            branchId: row.doc.branchId,
            content: row.doc.content,
            createdAt: new Date(row.doc.createdAt),
            updatedAt: new Date(row.doc.updatedAt),
          }))
          .filter((rep) => rep.branchId === userDetails?.branchId);

        if (date) {
          const startOfDay = new Date(date);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(date);
          endOfDay.setHours(23, 59, 59, 999);

          fetchedReports = fetchedReports.filter((report) => {
            const reportDate = report.createdAt;
            return reportDate >= startOfDay && reportDate <= endOfDay;
          });
        }

        fetchedReports.sort((a, b) => b.createdAt - a.createdAt);

        setAllReports(fetchedReports);
        setReports(fetchedReports.slice(0, REPORTS_PER_PAGE));
        setHasMore(fetchedReports.length > REPORTS_PER_PAGE);

        return fetchedReports;
      } catch (error) {
        handleError(error, "Failed to fetch reports");
        return [];
      } finally {
        setLoading(false);
      }
    },
    [userDetails, localDB, toast]
  );

  // Load more reports
  const loadMoreReports = useCallback(() => {
    const nextPage = currentPage + 1;
    const startIndex = currentPage * REPORTS_PER_PAGE;
    const newReports = allReports.slice(startIndex, startIndex + REPORTS_PER_PAGE);

    setReports((prev) => [...prev, ...newReports]);
    setCurrentPage(nextPage);
    setHasMore(allReports.length > startIndex + REPORTS_PER_PAGE);
  }, [allReports, currentPage]);

  // Add report
  const addReport = useCallback(
    async (reportData) => {
      if (!localDB) return;
      
      if (!userDetails?.branchId) {
        toast({
          title: "Error",
          description: "No active branch selected",
          variant: "destructive",
        });
        return;
      }

      try {
        setLoading(true);
        const reportDoc = {
          _id: uuidv4(),
          branchId: userDetails?.branchId,
          content: reportData.content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const response = await localDB.put(reportDoc);

        const newReport = {
          id: reportDoc._id,
          branchId: reportDoc.branchId,
          content: reportDoc.content,
          createdAt: new Date(reportDoc.createdAt),
          updatedAt: new Date(reportDoc.updatedAt),
        };

        setAllReports((prev) => [newReport, ...prev]);
        setReports((prev) => {
          const updated = [newReport, ...prev];
          return updated.slice(0, currentPage * REPORTS_PER_PAGE);
        });

        toast({
          title: "Success",
          description: "Report added successfully",
        });

        return newReport.id;
      } catch (error) {
        handleError(error, "Failed to add report");
      } finally {
        setLoading(false);
      }
    },
    [userDetails, localDB, currentPage, toast]
  );

  // Update report
  const updateReport = useCallback(
    async (reportId, updates) => {
      if (!localDB) return;
      
      if (!userDetails?.branchId) {
        toast({
          title: "Error",
          description: "No active branch selected",
          variant: "destructive",
        });
        return;
      }

      try {
        setLoading(true);
        const doc = await localDB.get(reportId);
        const updatedDoc = {
          ...doc,
          content: updates.content,
          updatedAt: new Date().toISOString(),
        };

        await localDB.put(updatedDoc);

        const updatedReport = {
          id: updatedDoc._id,
          branchId: updatedDoc.branchId,
          content: updatedDoc.content,
          createdAt: new Date(updatedDoc.createdAt),
          updatedAt: new Date(updatedDoc.updatedAt),
        };

        setAllReports((prev) =>
          prev.map((report) => (report.id === reportId ? updatedReport : report))
        );
        setReports((prev) =>
          prev.map((report) => (report.id === reportId ? updatedReport : report))
        );

        toast({
          title: "Success",
          description: "Report updated successfully",
        });
      } catch (error) {
        handleError(error, "Failed to update report");
      } finally {
        setLoading(false);
      }
    },
    [userDetails, localDB, toast]
  );

  // Delete report
  const deleteReport = useCallback(
    async (reportId) => {
      if (!localDB) return;
      
      if (!userDetails?.branchId) {
        toast({
          title: "Error",
          description: "No active branch selected",
          variant: "destructive",
        });
        return;
      }

      try {
        setLoading(true);
        const doc = await localDB.get(reportId);
        await localDB.remove(doc);

        setAllReports((prev) => prev.filter((report) => report.id !== reportId));
        setReports((prev) => prev.filter((report) => report.id !== reportId));

        if (reports.length <= currentPage * REPORTS_PER_PAGE) {
          setHasMore(false);
        }

        toast({
          title: "Success",
          description: "Report deleted successfully",
        });
      } catch (error) {
        handleError(error, "Failed to delete report");
      } finally {
        setLoading(false);
      }
    },
    [userDetails, localDB, reports.length, currentPage, toast]
  );

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
        description: `Synced ${syncResult.pull.docs_written + syncResult.push.docs_written} reports.`,
      });
      await fetchReports();
    } catch (error) {
      setSyncStatus("error");
      handleError(error, "Failed to sync reports");
    }
  };

  // Initial fetch when userDetails changes
  useEffect(() => {
    if (localDB && userDetails?.branchId) {
      const today = new Date();
      fetchReports(today);
    }
  }, [userDetails, fetchReports, localDB]);

  const value = {
    reports,
    allReports,
    loading,
    error,
    hasMore,
    isOnline,
    syncStatus,
    fetchReports,
    loadMoreReports,
    addReport,
    updateReport,
    deleteReport,
    triggerSync,
  };

  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
};

export default ReportProvider;