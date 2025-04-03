'use client'

import { useState } from 'react'
import { useLogs } from "@/context/LogContext"
import { DatePicker } from "@/components/general-manager/logs/datePicker"
import { LogTable } from "@/components/general-manager/logs/logTable"
import { format } from 'date-fns'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"



export const dynamic = 'force-static'
export default function LogsPage() {
  const { logs, actionTypes, loading, error } = useLogs()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [actionFilter, setActionFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const logsPerPage = 10

  const filteredLogs = logs.filter((log) => {
    const logDate = new Date(log.date)
    const isDateMatch = selectedDate
      ? logDate.toDateString() === selectedDate.toDateString()
      : true
    const isActionMatch = actionFilter === "all" || log.action === actionFilter
    return isDateMatch && isActionMatch
  })

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage)
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  )

  if (loading) {
    return <div>Loading logs...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Logs</h1>
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <DatePicker
          date={selectedDate}
          onSelect={(date) => {
            setSelectedDate(date)
            setCurrentPage(1)
          }}
        />
        <Select
          value={actionFilter}
          onValueChange={(value) => {
            setActionFilter(value)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by action" />
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
      {paginatedLogs.length === 0 ? (
        <p>No logs for {format(selectedDate || new Date(), 'dd MMMM yyyy')}.</p>
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

