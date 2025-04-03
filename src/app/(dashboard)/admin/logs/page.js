'use client'

import { useState, useEffect } from 'react'
import { useLogs } from "@/context/LogContext"
import { DatePicker } from "@/components/admin/logs/datePicker"
import { LogTable } from "@/components/admin/logs/logTable"
import { format } from 'date-fns'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Download, Filter, RefreshCw, X, Search, Clock, Calendar, ChevronDown } from 'lucide-react'

export const dynamic = 'force-static'

export default function LogsPage() {
  const { logs, actionTypes, loading, error } = useLogs()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [actionFilter, setActionFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [timeRange, setTimeRange] = useState("today")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const logsPerPage = 10

  // Filter logs based on all criteria
  const filteredLogs = logs.filter((log) => {
    // Date filtering based on timeRange
    const logDate = new Date(log.date)
    let isDateMatch = true

    if (timeRange === "today") {
      const today = new Date()
      isDateMatch = logDate.toDateString() === today.toDateString()
    } else if (timeRange === "yesterday") {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      isDateMatch = logDate.toDateString() === yesterday.toDateString()
    } else if (timeRange === "last7days") {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      isDateMatch = logDate >= sevenDaysAgo
    } else if (timeRange === "last30days") {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      isDateMatch = logDate >= thirtyDaysAgo
    } else if (timeRange === "custom") {
      isDateMatch = selectedDate
        ? logDate.toDateString() === selectedDate.toDateString()
        : true
    }

    // Action type filtering
    const isActionMatch = actionFilter === "all" || log.action === actionFilter
    
    // Search query filtering
    const isSearchMatch = searchQuery === "" || 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(log.metadata).toLowerCase().includes(searchQuery.toLowerCase())
    
    return isDateMatch && isActionMatch && isSearchMatch
  })

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage)
  const paginatedLogs = filteredLogs
    .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort by date, newest first
    .slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage)

  const refreshLogs = () => {
    setIsRefreshing(true)
    // Here you would typically refetch logs
    setTimeout(() => {
      setIsRefreshing(false)
    }, 800)
  }

  const downloadLogs = () => {
    const jsonString = JSON.stringify(filteredLogs, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${format(new Date(), 'yyyy-MM-dd')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case "today": return "Today"
      case "yesterday": return "Yesterday"
      case "last7days": return "Last 7 days"
      case "last30days": return "Last 30 days"
      case "custom": return format(selectedDate, "d MMM yyyy")
      default: return "Select time range"
    }
  }
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [timeRange, actionFilter, searchQuery, selectedDate])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mb-2" />
          <p className="text-gray-600">Loading logs...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="bg-red-50 text-red-800 p-4 rounded-md">
          <h3 className="font-bold mb-2">Error loading logs</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold">System Logs</CardTitle>
              <CardDescription className="mt-1">
                View and filter system activity logs
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshLogs}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={downloadLogs}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search logs..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {/* Time Range Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full md:w-auto justify-between">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{getTimeRangeLabel()}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setTimeRange("today")}>
                    Today
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeRange("yesterday")}>
                    Yesterday
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeRange("last7days")}>
                    Last 7 days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeRange("last30days")}>
                    Last 30 days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeRange("custom")}>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Custom date</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Custom Date Picker - Only show when custom timeRange is selected */}
              {timeRange === "custom" && (
                <DatePicker
                  date={selectedDate}
                  onSelect={setSelectedDate}
                />
              )}
              
              {/* Action Filter */}
              <Select
                value={actionFilter}
                onValueChange={setActionFilter}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter action" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actionTypes.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Active filters display */}
            {(actionFilter !== "all" || searchQuery || timeRange !== "today") && (
              <div className="flex flex-wrap gap-2 pb-1">
                <div className="text-sm text-gray-500 py-1">Active filters:</div>
                {actionFilter !== "all" && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    Action: {actionFilter}
                    <button onClick={() => setActionFilter("all")} className="ml-1 hover:bg-gray-100 rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {searchQuery && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    Search: {searchQuery}
                    <button onClick={() => setSearchQuery("")} className="ml-1 hover:bg-gray-100 rounded-full p-0.5">
                      < X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {timeRange !== "today" && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    Time: {getTimeRangeLabel()}
                    <button onClick={() => setTimeRange("today")} className="ml-1 hover:bg-gray-100 rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs h-7 px-2"
                  onClick={() => {
                    setActionFilter("all")
                    setSearchQuery("")
                    setTimeRange("today")
                  }}
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Log count summary */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Showing {filteredLogs.length === 0 ? 0 : (currentPage - 1) * logsPerPage + 1}-
          {Math.min(currentPage * logsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
        </div>
      </div>

      {/* Log Table */}
      {filteredLogs.length === 0 ? (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="bg-gray-100 p-3 rounded-full mb-4">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-1">No logs found</h3>
            <p className="text-gray-500 text-center max-w-md">
              {searchQuery 
                ? "Try adjusting your search or filters to find what you're looking for."
                : "There are no logs matching your current filters."}
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => {
                setActionFilter("all")
                setSearchQuery("")
                setTimeRange("today")
              }}
            >
              Reset filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <LogTable 
          logs={paginatedLogs} 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={setCurrentPage} 
        />
      )}
    </div>
  )
}