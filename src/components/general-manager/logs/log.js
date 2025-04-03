'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { format } from 'date-fns'



export function Log({ log }) {
  const [isOpen, setIsOpen] = useState(false)

  const formatDate = (date) => {
    return format(date, 'dd MMM yyyy HH:mm:ss')
  }

  const renderMetadata = (metadata) => {
    return Object.entries(metadata).map(([key, value]) => (
      <div key={key} className="mb-2">
        <span className="font-semibold">{key}: </span>
        {typeof value === 'object' ? JSON.stringify(value, null, 2) : value.toString()}
      </div>
    ))
  }

  return (
    <div className="border p-4 mb-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">{log.action}</h3>
      <p className="text-sm text-gray-600 mb-2">{formatDate(log.date)}</p>
      <p className="mb-2">{log.message}</p>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">View Log</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Metadata:</h4>
            {renderMetadata(log.metadata)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

