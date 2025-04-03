"use client";

import * as React from "react";
import {
  User2,
  Building2,
  Box,
  Settings,
  FileText,
  Clock,
  HomeIcon,
} from "lucide-react";
import { BranchSwitcher } from "./branch-switcher";
import { NavMain } from "@/components/admin/layout/nav-main";
import { NavUser } from "@/components/admin/layout/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },

  navMain: [
    {
      title: "Home",
      url: "/admin",

      icon: HomeIcon,
      isActive: true,
    },
    {
      title: "Manage Employee",
      url: "#",

      icon: User2,
      isActive: true,
      items: [
        {
          title: "Employee",
          url: "/admin/user",
        },
      ],
    },
    {
      title: "Branch-Management",
      url: "#",
      icon: Building2,
      isActive: true,
      items: [
        {
          title: "Manage Branch",
          url: "/admin/branch",
        },
        {
          title: "Manage Department",
          url: "/admin/department",
        },
      ],
    },
    {
      title: "Inventory",
      url: "#",
      icon: Box,
      isActive: true,
      items: [
        {
          title: "Manage Category",
          url: "/admin/category",
        },
        {
          title: "Manage Active Branch Inventory",
          url: "/admin/single-branch-inventory",
        },
        {
          title: "Point Of Sales",
          url: "/admin/pos",
        },
        {
          title: "Transactions",
          url: "/admin/transaction",
        },
        {
          title: "Daily Summary ",

          url: "/admin/daily-summary",
        },

        {
          title: "Returns",
          url: "/admin/returns",
        }
      ],
    },
    {
      title: "Reports",
      url: "#",
      icon: FileText,
      isActive: true,
      items: [
        {
          title: "Financial Report",
          url: "/admin/financial-report",
        },
        {
          title: "Branch Report",
          url: "/admin/expenses-report",
        },
        {
          title: "Expenses Reports",
          url: "/admin/expenses-reports",
        },
      ],
    },
    {
      title: "Logs",
      url: "/admin/logs",
      icon: Clock,
      isActive: false,
    },

    {
      title: "Settings",
      url: "/admin/settings/permissions",
      icon: Settings,
      isActive: false,
    },
    {
      title: "Send Items",
      url: "/admin/send-items",
      icon: Box,
      isActive: false,
    },
  ],
};

export function AppSidebar() {
  return (
    <Sidebar variant="inset" className="">
      <SidebarHeader>
        <BranchSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
