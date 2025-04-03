"use client";
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBranches } from '@/context/BranchContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


export const CreateBranchDialog = () => {
  const [branchName, setBranchName] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { addBranch } = useBranches();
  const { role } = useAuth();

  const { toast } = useToast();

  const handleCreateBranch = async (e) => {
    e.preventDefault();

    try {
      const id = `branch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await addBranch({
        id,
        branchName,
        location,
        phone
      });
      toast({
        title: "Successful",
        description: "Branch created successfully"
      });
      // Reset form and close dialog
      setBranchName('');
      setLocation('');
      setPhone('');
      setIsDialogOpen(false);

    } catch (error) {
      console.error('Branch creation failed', error);
      toast({
        title: "Error",
        description: "Branch creation failed",
        variant: "destructive"
      });
    }
  };



  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button>Create New Branch</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Branch</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateBranch} className="space-y-4">
          <div>
            <Label htmlFor="branchName">Branch Name</Label>
                  <Input
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    required
                  />
                </div>
          <div>
            <Label htmlFor="location">Location</Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
          <TooltipProvider>
            <Tooltip>
            <TooltipTrigger><Button type="submit">Create Branch</Button></TooltipTrigger>
              <TooltipContent>
                <p>Create Branch</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </form>
      </DialogContent>
    </Dialog>
  );
};