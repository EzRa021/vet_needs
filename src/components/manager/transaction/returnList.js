"use client"
import { useState, useEffect, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Loader2,
  CalendarIcon,
  Search,
  X,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  CloudOff,
  CloudIcon as CloudSync,
} from "lucide-react"
import { useReturns } from "@/context/manager/ReturnContext"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/context/AuthContext"

export function ReturnList() {
  const { userDetails } = useAuth()
  const { returns, loading, syncStatus, isOnline, unsyncedCount, fetchReturns, triggerSync, checkUnsyncedCount } =
    useReturns()

  const [searchSalesId, setSearchSalesId] = useState("")
  const [filterDate, setFilterDate] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [viewReturnDetails, setViewReturnDetails] = useState(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)

  // Check unsynced count periodically
  useEffect(() => {
    if (!userDetails?.branchId) return

    // Initial check
    checkUnsyncedCount()

    // Set up interval for periodic checks
    const intervalId = setInterval(() => {
      checkUnsyncedCount()
    }, 60000) // Check every minute

    return () => clearInterval(intervalId)
  }, [userDetails?.branchId, checkUnsyncedCount])

  const convertTimestampToDate = (timestamp) => {
    if (!timestamp) return null

    // Handle Firestore Timestamp object
    if (timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000)
    }

    // If it's already a Date object, return it
    if (timestamp instanceof Date) return timestamp

    // Try to parse string or number
    return new Date(timestamp)
  }

  const formatDate = (timestamp) => {
    const date = convertTimestampToDate(timestamp)
    return date ? format(date, "PP") : "Unknown"
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount)
  }

  const filteredReturns = useMemo(() => {
    return returns.filter((returnItem) => {
      if (!returnItem) return false

      const matchesSalesId = searchSalesId
        ? returnItem.salesId?.toLowerCase().includes(searchSalesId.toLowerCase())
        : true

      const returnDate = convertTimestampToDate(returnItem.createdAt)
      const matchesDate =
        filterDate && returnDate ? returnDate.toDateString() === filterDate.toDateString() : !filterDate // if no filter date, include all returns

      return matchesSalesId && matchesDate
    })
  }, [returns, searchSalesId, filterDate])

  const ITEMS_PER_PAGE = 8

  const paginatedReturns = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredReturns.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredReturns, currentPage])

  const totalPages = Math.ceil(filteredReturns.length / ITEMS_PER_PAGE)

  const handleViewDetails = (returnItem) => {
    setViewReturnDetails(returnItem)
    setIsDetailsDialogOpen(true)
  }

  const handleRefresh = async () => {
    await fetchReturns()
    await checkUnsyncedCount()
  }

  const getStatusBadge = (status, syncStatus) => {
    if (syncStatus === "pending") {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
          <Clock className="h-3 w-3" /> Unsynced
        </Badge>
      )
    }

    if (status?.toLowerCase() === "completed" || status?.toLowerCase() === "processed") {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Completed
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" /> {status || "Pending"}
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card className="w-full mb-5">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Returns Management</CardTitle>
              <CardDescription className="mt-2">
                Manage product returns and synchronize with central database
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-10 w-[250px]" />
              <Skeleton className="h-10 w-[180px]" />
            </div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full mb-5 shadow-sm border-muted">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">Returns Management</CardTitle>
            <CardDescription className="mt-1">
              Manage product returns and synchronize with central database
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-end">
            {!isOnline && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                <CloudOff className="h-3 w-3" /> Offline
              </Badge>
            )}

            {syncStatus === "syncing" && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                <CloudSync className="h-3 w-3 animate-spin" /> Syncing
              </Badge>
            )}

            {unsyncedCount > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                {unsyncedCount} unsynced
              </Badge>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={triggerSync}
              disabled={!isOnline || syncStatus === "syncing"}
              className="flex items-center gap-1"
            >
              {syncStatus === "syncing" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CloudSync className="h-4 w-4" />
              )}
              Sync Now
            </Button>

            <Button variant="outline" size="sm" onClick={handleRefresh} className="flex items-center gap-1">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2">
          <div className="relative w-full sm:w-auto flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search Transaction ID"
              value={searchSalesId}
              onChange={(e) => setSearchSalesId(e.target.value)}
              className="pl-8 pr-8 w-full"
            />
            {searchSalesId && (
              <X
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 cursor-pointer hover:text-foreground transition-colors"
                onClick={() => setSearchSalesId("")}
              />
            )}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full sm:w-[240px] justify-start text-left font-normal",
                  !filterDate && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filterDate ? format(filterDate, "PPP") : <span>Filter by date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={filterDate} onSelect={(date) => setFilterDate(date)} initialFocus />
              {filterDate && (
                <Button variant="ghost" className="w-full" onClick={() => setFilterDate(null)}>
                  Clear Filter
                </Button>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>

      <CardContent className="px-0 sm:px-6">
        {!isOnline && (
          <Alert variant="warning" className="mb-4 mx-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Offline Mode</AlertTitle>
            <AlertDescription>You are currently working offline. Changes will sync when you reconnect.</AlertDescription>
          </Alert>
        )}

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-medium">Sales ID</TableHead>
                <TableHead className="font-medium">Date</TableHead>
                <TableHead className="font-medium">Items</TableHead>
                <TableHead className="font-medium">Total</TableHead>
                <TableHead className="font-medium">Status</TableHead>
                <TableHead className="font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedReturns.length > 0 ? (
                paginatedReturns.map((returnItem) => (
                  <TableRow key={returnItem.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{returnItem.salesId}</TableCell>
                    <TableCell>{formatDate(returnItem.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {returnItem.items?.slice(0, 2).map((item, index) => (
                          <div key={index} className="text-sm">
                            {item.name}: {item.returnQuantity} {item.stockManagementType === "weight" ? "kg" : "items"}
                          </div>
                        ))}
                        {(returnItem.items?.length || 0) > 2 && (
                          <Badge variant="outline" className="w-fit text-xs">
                            +{returnItem.items.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(returnItem.total || 0)}</TableCell>
                    <TableCell>{getStatusBadge(returnItem.status, returnItem.syncStatus)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(returnItem)}
                        className="h-8 px-2 text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                      <p>No returns found</p>
                      <p className="text-sm">
                        {searchSalesId || filterDate
                          ? "Try adjusting your filters"
                          : "Process a return to see it here"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between py-4 border-t">
        <div className="text-sm text-muted-foreground">
          {filteredReturns.length > 0 ? (
            <>
              Showing {Math.min(ITEMS_PER_PAGE, filteredReturns.length)} of {filteredReturns.length} returns
            </>
          ) : (
            <>No returns found</>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              &lt;
            </Button>

            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              &gt;
            </Button>
          </div>
        )}
      </CardFooter>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Return Details</DialogTitle>
            <DialogDescription>View detailed information about this return</DialogDescription>
          </DialogHeader>
          {viewReturnDetails && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right font-medium">Transaction ID</label>
                <span className="col-span-3">{viewReturnDetails.transactionId}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right font-medium">Status</label>
                <span className="col-span-3">
                  {getStatusBadge(viewReturnDetails.status, viewReturnDetails.syncStatus)}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right font-medium">Reason</label>
                <span className="col-span-3">{viewReturnDetails.reason || "Not specified"}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right font-medium">Date</label>
                <span className="col-span-3">{formatDate(viewReturnDetails.createdAt)}</span>
              </div>

              <Separator className="my-2" />

              <div className="grid grid-cols-4 items-start gap-4">
                <label className="text-right font-medium">Items</label>
                <div className="col-span-3">
                  {viewReturnDetails.items?.length > 0 ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 text-sm font-medium border-b pb-1 mb-2">
                        <div>Item</div>
                        <div>Quantity</div>
                        <div>Unit Price</div>
                        <div className="text-right">Subtotal</div>
                      </div>
                      {viewReturnDetails.items.map((item, index) => {
                        const unitPrice = Number(item.price || 0).toFixed(2)
                        const subtotal = (item.price || 0) * item.returnQuantity
                        return (
                          <div key={index} className="grid grid-cols-4 text-sm border-b pb-2">
                            <div>{item.name}</div>
                            <div>
                              {item.returnQuantity} {item.stockManagementType === "weight" ? "kg" : "items"}
                            </div>
                            <div>{formatCurrency(item.price || 0)}</div>
                            <div className="text-right font-medium">{formatCurrency(subtotal)}</div>
                          </div>
                        )
                      })}
                      <div className="grid grid-cols-4 text-sm pt-2 font-medium">
                        <div className="col-span-3 text-right">Total:</div>
                        <div className="text-right">
                          {formatCurrency(
                            viewReturnDetails.items.reduce(
                              (sum, item) => sum + (item.price || 0) * item.returnQuantity,
                              0,
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No items in this return</span>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button onClick={() => setIsDetailsDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

