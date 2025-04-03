"use client"

import * as React from "react"
import {HomeIcon, Box, Settings, FileText, Clock } from 'lucide-react'
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
        url: "/cashier",
  
        icon: HomeIcon,
        isActive: true,
      },
      {
        title: "Point Of Sales",
        url: "/cashier/pos",
        icon: Box,
        isActive: true,
     
      },
      {
        title: "Settings",
        url: "/cashier/settings/application",
        icon: Settings,
        isActive: false,
      
      },
     
    ],
  }

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