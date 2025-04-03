'use client';

import * as React from 'react';
import { ChevronsUpDown, Plus, Building2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useBranches } from '@/context/BranchContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function BranchSwitcher() {
  const { 
    branches, 
    activeBranch, 
    setBranch, 
    error, 
    loading, 
    addBranch 
  } = useBranches();
  const { isMobile } = useSidebar();

  // State for adding a new branch
  const [newBranchName, setNewBranchName] = React.useState('');
  const [newBranchLocation, setNewBranchLocation] = React.useState('');
  const [isAddBranchDialogOpen, setIsAddBranchDialogOpen] = React.useState(false);

  // Handle adding a new branch
  const handleAddBranch = async () => {
    if (!newBranchName.trim()) return;

    try {
      await addBranch({
        branchName: newBranchName,
        location: newBranchLocation || undefined
      });

      // Reset form and close dialog
      setNewBranchName('');
      setNewBranchLocation('');
      setIsAddBranchDialogOpen(false);
    } catch (err) {
      console.error('Failed to add branch', err);
    }
  };

  // If no branches or loading, handle accordingly
  if (loading) return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="w-full p-2 text-sm text-muted-foreground">
          Loading branches...
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );



  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu 
          open={isAddBranchDialogOpen ? false : undefined}
        >
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {activeBranch?.branchName || 'Select Branch'}
                </span>
                {activeBranch?.location && (
                  <span className="truncate text-xs text-muted-foreground">
                    {activeBranch.location}
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Branches
            </DropdownMenuLabel>
            {branches.map((branch, index) => (
              <DropdownMenuItem
                key={branch.id}
                onClick={() => setBranch(branch)}
                className={`gap-2 p-2 ${
                  activeBranch?.id === branch.id
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : ''
                }`}
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <Building2 className="size-4 shrink-0" />
                </div>
                <div className="flex flex-col">
                  <span>{branch.branchName}</span>
                  {branch.location && (
                    <span className="text-xs text-muted-foreground">
                      {branch.location}
                    </span>
                  )}
                </div>
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <Dialog 
              open={isAddBranchDialogOpen} 
              onOpenChange={setIsAddBranchDialogOpen}
            >
              <DialogTrigger asChild>
                <DropdownMenuItem 
                  onSelect={(e) => e.preventDefault()}
                  className="gap-2 p-2 cursor-pointer"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                    <Plus className="size-4" />
                  </div>
                  <div className="font-medium text-muted-foreground">
                    Add branch
                  </div>
                </DropdownMenuItem>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Branch</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="branchName" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="branchName"
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      className="col-span-3"
                      placeholder="Enter branch name"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="branchLocation" className="text-right">
                      Location
                    </Label>
                    <Input
                      id="branchLocation"
                      value={newBranchLocation}
                      onChange={(e) => setNewBranchLocation(e.target.value)}
                      className="col-span-3"
                      placeholder="Optional branch location"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={handleAddBranch} 
                    disabled={!newBranchName.trim()}
                  >
                    Add Branch
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}