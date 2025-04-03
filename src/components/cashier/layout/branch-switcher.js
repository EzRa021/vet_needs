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
import { useAuth } from '@/context/AuthContext';

export function BranchSwitcher() {

  const { isMobile } = useSidebar();
  const { user, userDetails, loading, error } = useAuth();

  console.log(userDetails?.branchId);
  
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

  if (error) return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="w-full p-2 text-sm text-red-500">
          {error}
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu 
          open={false}
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
                {userDetails?.branchName}
                </span>
                {userDetails?.branchLocation && (
                  <span className="truncate text-xs text-muted-foreground">
                    {userDetails?.branchLocation}
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}