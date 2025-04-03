'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronRight, Clock, AlertCircle, Check, Info, X } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export function LogTable({ logs, currentPage, totalPages, onPageChange }) {
  const [expandedLogs, setExpandedLogs] = useState({})
  const [selectedLog, setSelectedLog] = useState(null)

  const getLogIcon = (action) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'add':
      case 'insert':
        return <Check className="h-4 w-4 text-green-500" />
      case 'update':
      case 'modify':
      case 'edit':
        return <Info className="h-4 w-4 text-blue-500" />
      case 'delete':
      case 'remove':
        return <X className="h-4 w-4 text-red-500" />
      case 'error':
      case 'fail':
      case 'failure':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getLogBadgeColor = (action) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'add':
      case 'insert':
        return "bg-green-100 text-green-800 border-green-300"
      case 'update':
      case 'modify':
      case 'edit':
        return "bg-blue-100 text-blue-800 border-blue-300"
      case 'delete':
      case 'remove':
        return "bg-red-100 text-red-800 border-red-300"
      case 'error':
      case 'fail':
      case 'failure':
        return "bg-red-100 text-red-800 border-red-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const formatMetadataValue = (value) => {
    if (value === null || value === undefined) return "null"
    if (typeof value === 'boolean') return value ? "true" : "false"
    if (typeof value === 'object') {
      if (value instanceof Date) return format(value, 'yyyy-MM-dd HH:mm:ss')
      return JSON.stringify(value, null, 2)
    }
    return value.toString()
  }

  const toggleExpand = (id) => {
    setExpandedLogs(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const renderMetadataTree = (metadata, path = '') => {
    if (!metadata || typeof metadata !== 'object') return null
    
    return (
      <div className="pl-0">
        {Object.entries(metadata).map(([key, value], index) => {
          const currentPath = path ? `${path}.${key}` : key
          const isObject = value !== null && typeof value === 'object' && !(value instanceof Date)
          
          return (
            <div key={`${currentPath}-${index}`} className="mb-1">
              <div className="flex items-start">
                {isObject && (
                  <button 
                    onClick={() => toggleExpand(currentPath)}
                    className="mr-1 p-0.5 hover:bg-muted/30 rounded"
                  >
                    {expandedLogs[currentPath] ? 
                      <ChevronDown className="h-3 w-3" /> : 
                      <ChevronRight className="h-3 w-3" />
                    }
                  </button>
                )}
                {!isObject && <div className="w-3 mr-1" />}
                <div className="font-mono text-xs">
                  <span className="font-medium text-gray-700">{key}: </span>
                  {!isObject && (
                    <span className={cn(
                      "text-gray-900",
                      typeof value === 'boolean' && (value ? "text-green-600" : "text-red-600"),
                      typeof value === 'number' && "text-purple-600",
                      value === null && "text-gray-500 italic"
                    )}>
                      {formatMetadataValue(value)}
                    </span>
                  )}
                </div>
              </div>
              {isObject && expandedLogs[currentPath] && (
                <div className="ml-4 mt-1 border-l-2 border-gray-200 pl-2">
                  {renderMetadataTree(value, currentPath)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const renderJSONPreview = (metadata) => {
    return (
      <pre className="text-xs bg-muted-foreground p-3 rounded-md overflow-x-auto font-mono">
        {JSON.stringify(metadata, null, 2)}
      </pre>
    )
  }

  const renderKeyValueTable = (metadata) => {
    const flattenObject = (obj, prefix = '') => {
      return Object.keys(obj).reduce((acc, k) => {
        const pre = prefix.length ? `${prefix}.` : ''
        if (typeof obj[k] === 'object' && obj[k] !== null && !(obj[k] instanceof Date)) {
          Object.assign(acc, flattenObject(obj[k], `${pre}${k}`))
        } else {
          acc[`${pre}${k}`] = obj[k]
        }
        return acc
      }, {})
    }

    const flatMetadata = flattenObject(metadata)

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className=" bg-card">
            <tr>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">Key</th>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Object.entries(flatMetadata).map(([key, value], index) => (
              <tr key={index} className="hover:bg-muted/30">
                <td className="px-3 py-2 font-mono font-medium text-gray-700">{key}</td>
                <td className="px-3 py-2 font-mono">
                  <span className={cn(
                    typeof value === 'boolean' && (value ? "text-green-600" : "text-red-600"),
                    typeof value === 'number' && "text-purple-600",
                    value === null && "text-gray-500 italic"
                  )}>
                    {formatMetadataValue(value)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const truncateMessage = (message, length = 100) => {
    if (message.length <= length) return message
    return `${message.substring(0, length)}...`
  }

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return format(date, 'dd MMM')
  }

  return (
    <>
      <div className="bg-card rounded-md shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/30">
                <TableHead className="w-[150px]">Action</TableHead>
                <TableHead className="w-[150px]">Time</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-[100px] text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/30 cursor-pointer group" onClick={() => setSelectedLog(log)}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      {getLogIcon(log.action)}
                      <Badge className={cn("px-2 py-0.5 text-xs font-medium", getLogBadgeColor(log.action))}>
                        {log.action}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="text-sm text-gray-500">
                          {getTimeAgo(log.date)}
                        </TooltipTrigger>
                        <TooltipContent>
                          {format(new Date(log.date), 'dd MMM yyyy HH:mm:ss')}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{truncateMessage(log.message)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="sm" 
                      className="invisible group-hover:visible "
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedLog(log)
                      }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Info className="h-8 w-8 mb-2 opacity-50" />
                      <p>No logs found for the selected filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            />
          </PaginationItem>
          
          {/* Display first page */}
          {totalPages > 0 && (
            <PaginationItem>
              <PaginationLink 
                onClick={() => onPageChange(1)}
                isActive={currentPage === 1}
              >
                1
              </PaginationLink>
            </PaginationItem>
          )}
          
          {/* Display ellipsis if needed */}
          {currentPage > 3 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}
          
          {/* Display current page and surrounding pages */}
          {totalPages > 1 && Array.from({ length: totalPages }).map((_, index) => {
            const pageNumber = index + 1
            // Show current page and one page before/after
            if (
              (pageNumber !== 1 && pageNumber !== totalPages) && 
              (Math.abs(pageNumber - currentPage) <= 1)
            ) {
              return (
                <PaginationItem key={pageNumber}>
                  <PaginationLink 
                    onClick={() => onPageChange(pageNumber)}
                    isActive={currentPage === pageNumber}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              )
            }
            return null
          })}
          
          {/* Display ellipsis if needed */}
          {totalPages > 3 && currentPage < totalPages - 2 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}
          
          {/* Display last page if there are multiple pages */}
          {totalPages > 1 && (
            <PaginationItem>
              <PaginationLink 
                onClick={() => onPageChange(totalPages)}
                isActive={currentPage === totalPages}
              >
                {totalPages}
              </PaginationLink>
            </PaginationItem>
          )}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedLog && getLogIcon(selectedLog.action)}
              <span>Log Details</span>
              {selectedLog && (
                <Badge className={cn("ml-2 px-2 py-0.5 text-xs font-medium", selectedLog && getLogBadgeColor(selectedLog.action))}>
                  {selectedLog?.action}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <div className="flex flex-col space-y-4 overflow-hidden">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-500">ID</h4>
                  <p className="font-mono text-sm">{selectedLog.id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-500">Timestamp</h4>
                  <p className="font-mono text-sm">{format(new Date(selectedLog.date), 'yyyy-MM-dd HH:mm:ss.SSS')}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-gray-500">Message</h4>
                <p className="text-sm bg-muted/30-50 p-3 rounded-md">{selectedLog.message}</p>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <h4 className="text-sm font-semibold text-gray-500 mb-2">Metadata</h4>
                <Tabs defaultValue="tree" className="w-full">
                  <TabsList className="mb-2">
                    <TabsTrigger value="tree">Tree View</TabsTrigger>
                    <TabsTrigger value="table">Table View</TabsTrigger>
                    <TabsTrigger value="json">JSON</TabsTrigger>
                  </TabsList>
                  <ScrollArea className="h-[300px] rounded-md border">
                    <TabsContent value="tree" className="p-4 m-0">
                      {renderMetadataTree(selectedLog.metadata)}
                    </TabsContent>
                    <TabsContent value="table" className="p-0 m-0">
                      {renderKeyValueTable(selectedLog.metadata)}
                    </TabsContent>
                    <TabsContent value="json" className="p-4 m-0">
                      {renderJSONPreview(selectedLog.metadata)}
                    </TabsContent>
                  </ScrollArea>
                </Tabs>
              </div>
              
              <div className="flex justify-end">
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}