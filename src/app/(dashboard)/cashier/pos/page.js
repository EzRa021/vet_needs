'use client'
import React from 'react'
import { PosManagement } from '@/components/cashier/inventory/pos'


export const dynamic = 'force-static'
const PosPage = () => {
  return (
    <div className="mx-4">
        <PosManagement/>
    </div>
  )
}

export default PosPage