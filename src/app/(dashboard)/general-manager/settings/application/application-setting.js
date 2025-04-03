"use client"

import { useEffect, useState } from "react"
import { useSettings } from "@/context/SettingsContext"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function ApplicationSetting() {
  const { lowStockThreshold, itemsPerPage, updateLowStockThreshold, updateItemsPerPage } = useSettings()
  const [localLowStockThreshold, setLocalLowStockThreshold] = useState(lowStockThreshold.toString())
  const [localItemsPerPage, setLocalItemsPerPage] = useState(itemsPerPage.toString())

  useEffect(() => {
    setLocalLowStockThreshold(lowStockThreshold.toString())
    setLocalItemsPerPage(itemsPerPage.toString())
  }, [lowStockThreshold, itemsPerPage])

  const handleSave = () => {
    updateLowStockThreshold(Number(localLowStockThreshold))
    updateItemsPerPage(Number(localItemsPerPage))
    alert("Settings saved successfully!")
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
        <Input
          id="lowStockThreshold"
          type="number"
          value={localLowStockThreshold}
          onChange={(e) => setLocalLowStockThreshold(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="itemsPerPage">Items Per Page</Label>
        <Input
          id="itemsPerPage"
          type="number"
          value={localItemsPerPage}
          onChange={(e) => setLocalItemsPerPage(e.target.value)}
        />
      </div>
      <Button onClick={handleSave}>Save Settings</Button>
    </div>
  )
}

