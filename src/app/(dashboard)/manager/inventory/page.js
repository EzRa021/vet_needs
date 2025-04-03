"use client"
import React from 'react'
// import Inventory from '@/components/admin/inventory/inventory'
import InventoryDashboard from '@/components/manager/inventory/inventory'

export const dynamic = 'force-static'
const InventoryPage = () => {
  return (
    <div className=" mx-4">
        <InventoryDashboard/>
    </div>
  )
}

export default InventoryPage