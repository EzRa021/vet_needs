"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const sidebarNavItems = [
  {
    title: "Permissions",
    href: "/admin/settings/permissions",
  },
  {
    title: "Theme",
    href: "/admin/settings/theme",
  },
  {
    title: "Application",
    href: "/admin/settings/application",
  },
  {
    title: "Colors",
    href: "/admin/settings/colors",
  },
  {
    title: "Receipt-Setting",
    href: "/admin/settings/receipt-settings",
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

