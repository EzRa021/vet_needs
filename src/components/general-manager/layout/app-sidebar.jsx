"use client"

import * as React from "react"
import { User2, HomeIcon, Building2, Box, Settings, FileText, Clock } from 'lucide-react'
import { BranchSwitcher } from "./branch-switcher"
import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { useAuth } from "@/context/AuthContext"

export function AppSidebar() {
  const { userDetails } = useAuth()

  const data = {
    user: {
      name: userDetails?.name || "User",
      email: userDetails?.email || "user@example.com",
      avatar: "/avatars/default.jpg",
    },
    navMain: [
      {
        title: "Home",
        url: "/general-manager",
  
        icon: HomeIcon,
        isActive: true,
      },
      {
        title: "Branch-Management",
        url: "#",
        icon: Building2,
        isActive: true,
        items: [
          {
            title: "Manage Branch",
            url: "/general-manager/branch",
          },
          {
            title: "Manage Department",
            url: "/general-manager/department",
          }
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
            url: "/general-manager/category",
          },
          {
            title: "Manage Active Branch Inventory",
            url: "/general-manager/single-branch-inventory",
          },
          
          {
            title: "Point Of Sales",
            url: "/general-manager/pos",
          },
          {
            title: "Daily Summary",
            url: "/general-manager/daily-summary",
          },
          {
            title: "Transactions",
            url: "/general-manager/transaction",
          },
          {
            title: "Returns",
            url: "/general-manager/returns",
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
            title: "Branch Report",
            url: "/general-manager/expenses-report",
          },
          {
            title: "Expenses Reports",
            url: "/general-manager/expenses-reports",
          },
        ],
      },
      {
        title: "Logs",
        url: "/general-manager/logs",
        icon: Clock,
        isActive: false,
        items: [
          {
            title: "Logs",
            url: "/general-manager/logs",
          }
        ],
      },
      {
        title: "Settings",
        url: "/general-manager/settings/application",
        icon: Settings,
        isActive: false,
        items: [
          {
            title: "Settings",
            url: "/general-manager/settings/application",
          }
        ],
      },
      {
        title: "Send Items",
        url: "/general-manager/send-items",
        icon: Box,
        isActive: false,
        items: [
          {
            title: "Send Items",
            url: "/general-manager/send-items",
          }
        ],
      }
    ],
  }

  return (
    <Sidebar variant="inset" className="">
      <SidebarHeader>
        <BranchSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}