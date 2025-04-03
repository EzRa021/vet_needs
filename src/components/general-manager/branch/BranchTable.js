"use client";

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Edit, RefreshCw } from 'lucide-react';
import { useBranches } from '@/context/BranchContext';
import { useAuth } from '@/context/AuthContext';
import { useLogs } from '@/context/LogContext';
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

export const BranchTable = () => {
  const {
    branches,
    loading,
    deleteBranch,
    updateBranch,
    syncFromFirebase, 
    syncToFirebase, 
    pendingSyncCount, 
    isOnline 
  } = useBranches();
  const { userDetails } = useAuth();
  const { addLog } = useLogs();
  const [editBranch, setEditBranch] = useState(null);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleUpdateBranch = async (e) => {
    e.preventDefault();
    if (!editBranch) return;

    try {
      await updateBranch(editBranch.id, {
        branchName: editBranch.branchName,
        location: editBranch.location,
        phone: editBranch.phone,
      });
      addLog({
        action: "update-branch",
        message: `Updated a branch with id: ${editBranch.id} and name: ${editBranch.branchName}`,
        metadata: {
          branchId: editBranch.id,
          branchName: editBranch.branchName,
          location: editBranch.location,
          updatedBy: userDetails.name,
          role: userDetails.role 
        },
      });
      setEditBranch(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Update failed', error);
      toast({
        title: "Update Failed",
        description: "There was an error updating the branch. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBranch = async (branchId, branchName) => {
    try {
      await deleteBranch(branchId);
      addLog({
        action: "delete-branch",
        message: `Deleted a branch with id: ${branchId} with name: ${branchName}`,
        metadata: {
          branchId: branchId,
          branchName: branchName,
          deletedBy: userDetails.name,
          role: userDetails.role 
        },
      });
    } catch (error) {
      console.error('Delete failed', error);
      toast({
        title: "Delete Failed",
        description: "There was an error deleting the branch. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSyncFromFirebase = async () => {
    if (!isOnline) {
      toast({
        title: "Offline",
        description: "Cannot sync while offline.",
        variant: "destructive",
      });
      return;
    }
  
    setIsSyncing(true);
    try {
      const response = await syncFromFirebase(); // Sync Firebase -> SQLite
      
      if (response) {
        toast({
          title: "Sync Successful",
          description: `${response.added} branches added, ${response.updated} updated, ${response.deleted} deleted.`,
        });
      } else {
        toast({
          title: "Sync Successful",
          description: "Branches have been synchronized from Firebase.",
        });
      }
    } catch (error) {
      console.error('Sync failed', error);
      toast({
        title: "Sync Failed",
        description: "There was an error syncing with Firebase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };
  const handleSyncToFirebase = async () => {
    if (!isOnline) {
      toast({
        title: "Offline",
        description: "Cannot sync while offline.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    try {
      await syncToFirebase();   // Sync SQLite -> Firebase (including pending)
      toast({
        title: "Sync Successful",
        description: "Branches have been synchronized to Firebase.",
      });
    } catch (error) {
      console.error('Sync failed', error);
      toast({
        title: "Sync Failed",
        description: "There was an error syncing with Firebase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, index) => (
                  <TableRow key={index}>
              <TableCell><Skeleton className="h-6 w-[150px]" /></TableCell>
              <TableCell><Skeleton className="h-6 w-[120px]" /></TableCell>
              <TableCell><Skeleton className="h-6 w-[100px]" /></TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Skeleton className="h-9 w-9" />
                        <Skeleton className="h-9 w-9" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Branches</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm">
            Pending Syncs: {pendingSyncCount} {isOnline ? '(Online)' : '(Offline)'}
          </span>
          <Button 
            onClick={handleSyncFromFirebase} 
            disabled={isSyncing || !isOnline}
            className="flex items-center space-x-2"
          >
            Sync from firebase
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </Button>
          <Button 
            onClick={handleSyncToFirebase} 
            disabled={isSyncing || !isOnline}
            className="flex items-center space-x-2"
          >
            Sync to firebase
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </Button>
        </div>
      </div>
            <Table>
              <TableHeader>
          <TableRow>
            <TableHead>Branch Name</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
          {branches.map((branch) => (
            <TableRow key={branch.id}>
              <TableCell>{branch.branchName}</TableCell>
              <TableCell>{branch.location || 'N/A'}</TableCell>
              <TableCell>{branch.phone || 'N/A'}</TableCell>
                      <TableCell>
                <div className="flex space-x-2">
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => setEditBranch(branch)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                            </DialogTrigger>
                    <DialogContent>
                              <DialogHeader>
                        <DialogTitle>Edit Branch</DialogTitle>
                              </DialogHeader>
                      <form onSubmit={handleUpdateBranch} className="space-y-4">
                        <div>
                          <Label htmlFor="branchName">Branch Name</Label>
                                        <Input
                                          id="branchName"
                            value={editBranch?.branchName || ''}
                            onChange={(e) => setEditBranch(prev => prev ? { ...prev, branchName: e.target.value } : null)}
                                        />
                                      </div>
                        <div>
                          <Label htmlFor="location">Location</Label>
                                        <Input
                                          id="location"
                            value={editBranch?.location || ''}
                            onChange={(e) => setEditBranch(prev => prev ? { ...prev, location: e.target.value } : null)}
                                        />
                                      </div>
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                                        <Input
                                          id="phone"
                            value={editBranch?.phone || ''}
                            onChange={(e) => setEditBranch(prev => prev ? { ...prev, phone: e.target.value } : null)}
                                        />
                                      </div>
                        <Button type="submit" disabled={isSyncing}>
                                    Update Branch
                                  </Button>
                              </form>
                            </DialogContent>
                          </Dialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                        <AlertDialogTitle>Delete Branch</AlertDialogTitle>
                                <AlertDialogDescription>
                          Are you sure you want to delete this branch?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteBranch(branch.id, branch.branchName)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
          ))}
              </TableBody>
            </Table>
      <Toaster />
    </>
  );
};