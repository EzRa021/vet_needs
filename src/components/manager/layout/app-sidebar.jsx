"use client"
import * as React from "react"
import { HomeIcon, Building2, Box, Settings, FileText, Clock } from 'lucide-react'
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
        url: "/manager",
  
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
            title: "Manage Department",
            url: "/manager/department",
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
            url: "/manager/category",
          },
          {
            title: "Manage Inventory",
            url: "/manager/inventory",
          },
          {
            title: "Point Of Sales",
            url: "/manager/pos",
          },
          {
            title: "Daily Summary",
            url: "/manager/daily-summary",
          },
          {
            title: "Transactions",
            url: "/manager/transaction",
          },
          {
            title: "Returns",
            url: "/manager/returns",
          },
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
            url: "/manager/expenses-report",
          },
          {
            title: "Expenses Reports",
            url: "/manager/expenses-reports",
          },
        ],
      },
      {
        title: "Settings",
        url: "/manager/settings/application",
        icon: Settings,
        isActive: false,
        items: [
          {
            title: "Settings",
            url: "/manager/settings/application",
          }
        ],
      },
      {
        title: "Send Items",
        url: "/manager/send-items",
        icon: Box,
        isActive: false,
        items: [
          {
            title: "Send Items",
            url: "/manager/send-items",
          }
        ],
      }
    ],
  }

  // Filter out any menu items with empty subitems
  // const filteredNavMain = data.navMain.filter(item => item.items.length > 0)

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
  )
}