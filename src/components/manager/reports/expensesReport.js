'use client';

import React, { useState, useEffect } from 'react';
import { useReports } from '@/context/manager/ReportContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Edit, CalendarIcon, Eye } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useLogs } from "@/context/manager/LogContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ReportsPage() {
  const { 
    reports, 
    loading, 
    error, 
    fetchReports, 
    addReport, 
    updateReport, 
    deleteReport, 
    hasMore,
    loadMoreReports 
  } = useReports();
  const { userDetails } = useAuth();
  const { toast } = useToast();
  const { addLog } = useLogs();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingReportId, setEditingReportId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingReport, setViewingReport] = useState(null);
  const reportsPerPage = 10;

  useEffect(() => {
    fetchReports(selectedDate);
  }, [selectedDate, fetchReports]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userDetails) {
      toast({
        title: "Error",
        description: "User details not available",
        variant: "destructive",
      });
      return;
    }

    const reportData = {
      content: JSON.stringify({
        title,
        description: content,
        authorId: userDetails.id,
        authorName: userDetails.name,
      })
    };

    try {
      if (editingReportId) {
        await updateReport(editingReportId, reportData);
        toast({
          title: "Success",
          description: "Report updated successfully",
        });
        addLog({
          action: "update-report",
          message: `Updated a report with title: ${title}`,
          metadata: { title, content, createdBy: userDetails.name, role: userDetails.role },
        });
      } else {
        await addReport(reportData);
        addLog({
          action: "create-report",
          message: `Created a report with title: ${title}`,
          metadata: { title, content, createdBy: userDetails.name, role: userDetails.role },
        });
        toast({
          title: "Success",
          description: "Report added successfully",
        });
      }
      setTitle('');
      setContent('');
      setEditingReportId(null);
      setIsDialogOpen(false);
      fetchReports(selectedDate);
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (report) => {
    try {
      const reportData = JSON.parse(report.content);
      setTitle(reportData.title);
      setContent(reportData.description);
      setEditingReportId(report.id);
      setIsDialogOpen(true);
    } catch (err) {
      toast({
        title: "Error",
        description: "Invalid report format",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (reportId) => {
    try {
      await deleteReport(reportId);
      toast({
        title: "Success",
        description: "Report deleted successfully",
      });
      addLog({
        action: "delete-report",
        message: `Deleted a report`,
        metadata: { reportId, createdBy: userDetails.name, role: userDetails.role },
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete report",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (report) => {
    try {
      const reportData = JSON.parse(report.content);
      setViewingReport({
        ...report,
        title: reportData.title,
        description: reportData.description,
        authorName: reportData.authorName
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Invalid report format",
        variant: "destructive",
      });
    }
  };

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const indexOfLastReport = currentPage * reportsPerPage;
  const indexOfFirstReport = indexOfLastReport - reportsPerPage;
  const currentReports = reports.slice(indexOfFirstReport, indexOfLastReport);

  if (loading && reports.length === 0) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Branch Reports</h1>
      <div className="flex justify-between items-center mb-4 gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create New Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingReportId ? 'Edit Report' : 'New Report'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  placeholder="Report Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <Textarea
                  placeholder="Report Content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={5}
                />
                <Button type="submit">
                  {editingReportId ? 'Update Report' : 'Add Report'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reports for {format(selectedDate, "MMMM d, yyyy")}</CardTitle>
        </CardHeader>
        <CardContent>
          {currentReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reports found for this date.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentReports.map((report) => {
                  let reportData;
                  try {
                    reportData = JSON.parse(report.content);
                  } catch (err) {
                    reportData = { title: 'Invalid Format', description: 'Report content cannot be displayed' };
                  }
                  
                  return (
                    <TableRow key={report.id}>
                      <TableCell>{reportData.title}</TableCell>
                      <TableCell>
                        {reportData.description && reportData.description.length > 50 
                          ? `${reportData.description.substring(0, 50)}...` 
                          : reportData.description}
                      </TableCell>
                      <TableCell>{new Date(report.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="icon" onClick={() => handleViewDetails(report)} className="mr-2">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleEdit(report)} className="mr-2">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDelete(report.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span>Page {currentPage}</span>
          <Button
            onClick={() => paginate(currentPage + 1)}
            disabled={indexOfLastReport >= reports.length}
          >
            Next
          </Button>
        </CardFooter>
      </Card>

      {loading && <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>}
      {hasMore && !loading && (
        <div className="flex justify-center mt-4">
          <Button onClick={loadMoreReports}>Load More</Button>
        </div>
      )}

      <Dialog open={!!viewingReport} onOpenChange={() => setViewingReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewingReport?.title}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              Author: {viewingReport?.authorName}
            </p>
            <p className="text-sm text-gray-500">
              Created: {viewingReport?.createdAt && new Date(viewingReport.createdAt).toLocaleString()}
            </p>
            <Separator className="my-4" />
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <p>{viewingReport?.description}</p>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}