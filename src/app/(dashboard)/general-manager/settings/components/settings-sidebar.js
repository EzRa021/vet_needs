"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const sidebarNavItems = [
  {
    title: "Permissions",
    href: "/general-manager/settings/permissions",
  },
  {
    title: "Theme",
    href: "/general-manager/settings/theme",
  },
  {
    title: "Application",
    href: "/general-manager/settings/application",
  },
  {
    title: "Colors",
    href: "/general-manager/settings/colors",
  },
  {
    title: "Receipt-Settings",
    href: "/general-manager/settings/receipt-settings",
  },
]

export function SettingsSidebar() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col space-y-1">
      {sidebarNavItems.map((item) => (
        <Button
          key={item.href}
          variant="ghost"
          className={cn(
            "justify-start",
            pathname === item.href && "bg-muted font-medium"
          )}
          asChild
        >
          <Link href={item.href}>{item.title}</Link>
        </Button>
      ))}
    </nav>
  )
}

