'use client'
import { useState, useEffect } from 'react'
import { WifiOff } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ExpensesReport } from "@/components/manager/expenses/expensesReport"



export function OfflineAlert({ isOpen, onClose }) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-destructive/10 p-2">
              <WifiOff className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Offline Mode</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            The expenses report feature is not available while you&apos;re offline. Please connect to the internet to
            access your reports.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Understood</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export const dynamic = 'force-static'

export default function ExpensesReportsPage() {
  const [isOffline, setIsOffline] = useState(false)
  const [showOfflineAlert, setShowOfflineAlert] = useState(false)

  useEffect(() => {
    // Check initial offline status
    setIsOffline(!navigator.onLine)
    
    // Set up event listeners for online/offline status changes
    const handleOnline = () => {
      setIsOffline(false)
      setShowOfflineAlert(false)
    }
    
    const handleOffline = () => {
      setIsOffline(true)
      setShowOfflineAlert(true)
    }
    
    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // If offline on initial load, show the alert
    if (!navigator.onLine) {
      setShowOfflineAlert(true)
    }
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  const closeOfflineAlert = () => {
    setShowOfflineAlert(false)
  }

  return (
    <>
      <OfflineAlert isOpen={showOfflineAlert} onClose={closeOfflineAlert} />
      {isOffline ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <WifiOff className="h-12 w-12 mb-4" />
          <h2 className="text-xl font-medium">You are currently offline</h2>
          <p className="mt-2">Expense reports require an internet connection</p>
        </div>
      ) : (
        <ExpensesReport />
      )}
    </>
  )
}