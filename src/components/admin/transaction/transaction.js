"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import ReprintReceipt from "@/components/admin/inventory/reprint-receipt"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Loader2,
  Trash2,
  Edit,
  Eye,
  ArrowLeftCircle,
  CalendarIcon,
  Printer,
  Search,
  RefreshCw,
  Receipt,
  FileText,
} from "lucide-react"
import { useBranches } from "@/context/BranchContext"
import { useTransactions } from "@/context/TransactionContext"
import { useRouter } from "next/navigation"
import { format, isSameDay as dateFnsIsSameDay } from "date-fns"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import { useLogs } from "@/context/LogContext"
import { ReturnForm } from "@/components/admin/transaction/return"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

const TransactionsPage = () => {
  const { activeBranch } = useBranches()
  const { userDetails } = useAuth()
  const { addLog } = useLogs()
  const {
    transactions,
    fetchTransactions,
    updateTransaction,
    deleteTransaction,
    setBranchId,
    triggerSync,
    syncStatus,
    isOnline,
    loading: contextLoading,
  } = useTransactions()
  const router = useRouter()
  const [isSyncing, setIsSyncing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchType, setSearchType] = useState("salesId")
  const [dateFilter, setDateFilter] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [viewingTransaction, setViewingTransaction] = useState(null)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [returningTransaction, setReturningTransaction] = useState(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false)
  const { toast } = useToast()
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [printingTransaction, setPrintingTransaction] = useState(null)
  const receiptRef = useRef(null)

  const itemsPerPage = 8

  useEffect(() => {
    const fetchData = async () => {
      if (activeBranch?.id) {
        setLoading(true)
        try {
          setBranchId(activeBranch.id)
          await fetchTransactions()
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to load transactions",
            variant: "destructive",
          })
        } finally {
          setLoading(false)
        }
      }
    }
    fetchData()
  }, [activeBranch?.id, fetchTransactions, setBranchId, toast])

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await triggerSync()
      toast({
        title: "Success",
        description: "Transactions synchronized successfully",
      })
      await fetchTransactions()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to synchronize transactions",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleUpdateTransaction = async () => {
    if (!activeBranch || !editingTransaction) return

    setLoading(true)
    try {
      await updateTransaction(activeBranch.id, editingTransaction.id, editingTransaction)
      addLog({
        action: "update-transaction",
        message: `Updated transaction ${editingTransaction.id}`,
        metadata: {
          transactionId: editingTransaction.id,
          updatedBy: userDetails.name,
          role: userDetails.role,
        },
      })
      setIsEditDialogOpen(false)
      await fetchTransactions()
      toast({
        title: "Success",
        description: "Transaction updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTransaction = async (transactionId, transactionItems) => {
    if (!activeBranch) return

    if (!confirm("Are you sure you want to delete this transaction? This action cannot be undone.")) {
      return
    }

    setLoading(true)
    try {
      await deleteTransaction(activeBranch.id, transactionId)
      addLog({
        action: "delete-transaction",
        message: `Deleted transaction ${transactionId}`,
        metadata: {
          transactionId,
          deletedBy: userDetails.name,
          role: userDetails.role,
        },
      })
      await fetchTransactions()
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Date utilities
  const convertTimestampToDate = (timestamp) => {
    if (!timestamp) return new Date() // Fallback to current date if null
    try {
      if (typeof timestamp === "string") {
        const parsedDate = new Date(timestamp)
        if (isNaN(parsedDate.getTime())) throw new Error("Invalid date string")
        return parsedDate
      }
      // Handle Firebase timestamp object (for legacy compatibility)
      if (timestamp.seconds && timestamp.nanoseconds) {
        return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000)
      }
      throw new Error("Unsupported timestamp format")
    } catch (error) {
      console.error("Error parsing timestamp:", timestamp, error)
      return new Date() // Fallback to avoid breaking filter
    }
  }

  const formatTransactionDate = (createdAt) => {
    const date = convertTimestampToDate(createdAt)
    return format(date, "PPP p") // e.g., "Mar 23, 2025 12:34 PM"
  }

  const filteredTransactions = transactions
    .filter((transaction) => {
      // Search by either salesId or transactionId (which is the id field)
      const matchesSearch =
        !searchTerm ||
        (searchType === "salesId" && transaction.salesId?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (searchType === "transactionId" && transaction.id?.toLowerCase().includes(searchTerm.toLowerCase()))

      const transactionDate = convertTimestampToDate(transaction.createdAt)
      const matchesDate = !dateFilter || dateFnsIsSameDay(transactionDate, dateFilter)

      return matchesSearch && matchesDate
    })
    .sort((a, b) => convertTimestampToDate(b.createdAt) - convertTimestampToDate(a.createdAt))

  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)

  const printReceipt = () => {
    const printStyle = `
    @page { 
        size: 80mm auto;
        margin: 2mm;
      }
      @media print {
        body { 
          margin: 0;
          padding: 0;
          width: 80mm;
        }
        * { color-adjust: exact; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .receipt-container { width: 100%; margin: 0; padding: 0; }
        .receipt-content { width: 100%; height: fit-content; page-break-after: always; }
      }
    `

    const printWindow = document.createElement("iframe")
    printWindow.style.display = "none"
    document.body.appendChild(printWindow)

    printWindow.contentDocument.write(`
      <html>
        <head>
          <style>${printStyle}</style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="receipt-content">
              ${receiptRef.current.innerHTML}
            </div>
          </div>
        </body>
      </html>
    `)

    printWindow.contentWindow.focus()
    printWindow.contentWindow.print()

    setTimeout(() => {
      document.body.removeChild(printWindow)
    }, 1000)
  }

  const handleReprint = (transaction) => {
    setPrintingTransaction(transaction)
    setIsPrintDialogOpen(true)
  }

  const getSyncStatusBadge = () => {
    switch (syncStatus) {
      case "syncing":
        return (
          <Badge variant="secondary" className="animate-pulse">
            Syncing...
          </Badge>
        )
      case "error":
        return <Badge variant="destructive">Sync Error</Badge>
      case "idle":
        return <Badge variant="outline">{isOnline ? "Online" : "Offline"}</Badge>
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Receipt className="h-6 w-6 text-primary" />
                Transactions
              </CardTitle>
              <CardDescription>
                {activeBranch
                  ? `View and manage transactions for ${activeBranch.branchName}`
                  : "Please select a branch to view transactions"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSync}
                disabled={isSyncing || !isOnline || contextLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
                Sync Transactions
                {getSyncStatusBadge()}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="flex gap-2">
            <Select value={searchType} onValueChange={setSearchType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Search by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="salesId">Sale ID</SelectItem>
                <SelectItem value="transactionId">Transaction ID</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Search by ${searchType === "salesId" ? "Sale ID" : "Transaction ID"}`}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("w-[240px] justify-start text-left font-normal", !dateFilter && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFilter ? format(dateFilter, "PPP") : <span>Filter by date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={dateFilter}
              onSelect={(date) => {
                setDateFilter(date)
                setCurrentPage(1)
              }}
              initialFocus
            />
            {dateFilter && (
              <div className="p-3 border-t">
                <Button variant="ghost" size="sm" onClick={() => setDateFilter(null)} className="w-full">
                  Clear date filter
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Transaction List</CardTitle>
          <CardDescription>
            {filteredTransactions.length}
            {filteredTransactions.length === 1 ? " transaction" : " transactions"} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading || contextLoading ? (
            <div className="flex flex-col justify-center items-center h-64">
              <Loader2 className="animate-spin h-8 w-8 mb-4 text-primary" />
              <p className="text-muted-foreground">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12 border rounded-md bg-muted/20">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/60" />
              <h3 className="mt-4 text-lg font-medium">No transactions found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchTerm
                  ? `No transactions match your search for "${searchTerm}"`
                  : dateFilter
                    ? "No transactions found for the selected date"
                    : "No transactions have been recorded yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Sale ID</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Cashier</TableHead>
                      <TableHead>Total Items</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{transaction.salesId || "N/A"}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                      <Badge variant="outline" className="capitalize">
                        {transaction.paymentMethod || "Cash"}
                      </Badge></TableCell>
                        <TableCell>{formatTransactionDate(transaction.createdAt)}</TableCell>
                        <TableCell>{transaction.items?.[0]?.cashierName || "N/A"}</TableCell>
                        <TableCell>
                          {transaction.items
                            ? transaction.items.reduce((sum, item) => sum + (item.quantitySold || 0), 0)
                            : 0}
                        </TableCell>
                        <TableCell className="font-medium">₦{transaction.total.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex justify-end space-x-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setViewingTransaction(transaction)
                                setIsViewDialogOpen(true)
                              }}
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                              onClick={() =>
                                handleDeleteTransaction(
                                  transaction.id,
                                  transaction.items.map((item) => item.name).join(", "),
                                )
                              }
                              title="Delete transaction"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleReprint(transaction)}
                              title="Print receipt"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setReturningTransaction(transaction)
                                setIsReturnDialogOpen(true)
                              }}
                              title="Process return"
                            >
                              <ArrowLeftCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}{" "}
                  transactions
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                    disabled={currentPage === 1 || loading || contextLoading}
                    className="flex items-center gap-1"
                  >
                    <ArrowLeftCircle className="h-4 w-4" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                    disabled={currentPage === totalPages || loading || contextLoading}
                    className="flex items-center gap-1"
                  >
                    Next <ArrowLeftCircle className="h-4 w-4 rotate-180" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>Detailed information about this transaction</DialogDescription>
          </DialogHeader>
          {viewingTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Sale ID</p>
                  <p className="font-medium">{viewingTransaction.salesId || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Transaction ID</p>
                  <p className="font-mono text-sm">{viewingTransaction.id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{formatTransactionDate(viewingTransaction.createdAt)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium capitalize">{viewingTransaction.paymentMethod || "N/A"}</p>
                </div>
              </div>

              <div className="rounded-md border overflow-hidden mt-4">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Cashier</TableHead>
                      <TableHead>Quantity Sold</TableHead>
                      <TableHead>In Stock</TableHead>
                      <TableHead className="text-right">Selling Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingTransaction.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.name || "N/A"}</TableCell>
                        <TableCell>
                          {item.cashierName} {item.cashierRole ? `(${item.cashierRole})` : ""}
                        </TableCell>
                        <TableCell>
                          {item.quantitySold || 0}
                          {item.stockManagementType === "weight" ? ` ${item.weightUnit || "kg"}` : ""}
                        </TableCell>
                        <TableCell>{item.numberInStock || "N/A"}</TableCell>
                        <TableCell className="text-right">₦{(item.sellingPrice || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">
                          ₦{((item.sellingPrice || 0) * (item.quantitySold || 0)).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center py-2 px-3 bg-muted/20 rounded-md">
                <span className="font-medium">Total Amount:</span>
                <span className="text-xl font-bold text-primary">₦{viewingTransaction.total.toLocaleString()}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>Modify transaction details below</DialogDescription>
          </DialogHeader>
          {editingTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Sale ID</p>
                  <p className="font-medium">{editingTransaction.salesId || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Transaction ID</p>
                  <p className="font-mono text-sm">{editingTransaction.id}</p>
                </div>
              </div>

              {editingTransaction.items?.map((item, index) => (
                <div key={index} className="p-3 border rounded-md">
                  <div className="font-medium mb-2">{item.name}</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Quantity Sold</label>
                      <Input
                        type="number"
                        value={item.quantitySold || 0}
                        onChange={(e) => {
                          const updatedItems = [...editingTransaction.items]
                          const quantitySold = Number.parseFloat(e.target.value) || 0
                          updatedItems[index] = {
                            ...updatedItems[index],
                            quantitySold,
                          }
                          setEditingTransaction({
                            ...editingTransaction,
                            items: updatedItems,
                            total: updatedItems.reduce(
                              (sum, item) => sum + (item.quantitySold || 0) * (item.sellingPrice || 0),
                              0,
                            ),
                          })
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Selling Price</label>
                      <Input
                        type="number"
                        value={item.sellingPrice || 0}
                        onChange={(e) => {
                          const updatedItems = [...editingTransaction.items]
                          const sellingPrice = Number.parseFloat(e.target.value) || 0
                          updatedItems[index] = {
                            ...updatedItems[index],
                            sellingPrice,
                          }
                          setEditingTransaction({
                            ...editingTransaction,
                            items: updatedItems,
                            total: updatedItems.reduce(
                              (sum, item) => sum + (item.quantitySold || 0) * (item.sellingPrice || 0),
                              0,
                            ),
                          })
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-center py-2 px-3 bg-muted/20 rounded-md mt-4">
                <span className="font-medium">Total Amount:</span>
                <span className="text-xl font-bold text-primary">₦{editingTransaction.total.toLocaleString()}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTransaction} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Process Return</DialogTitle>
            <DialogDescription>Select items and quantities to return for this transaction</DialogDescription>
          </DialogHeader>
          {returningTransaction && (
            <ReturnForm
              transactionId={returningTransaction.id}
              items={returningTransaction.items}
              setDialogOpen={setIsReturnDialogOpen}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Print Receipt</DialogTitle>
            <DialogDescription>Review and print the transaction receipt</DialogDescription>
          </DialogHeader>
          <div ref={receiptRef} className="overflow-y-auto border rounded-md p-4 bg-white">
            {printingTransaction && (
              <ReprintReceipt
                transactionData={{
                  items: printingTransaction.items,
                  total: printingTransaction.total,
                }}
                branchName={activeBranch?.branchName}
                departmentName={printingTransaction.items[0]?.departmentName}
                categoryName={printingTransaction.items[0]?.categoryName}
                cashierName={printingTransaction.items[0]?.cashierName}
                address={activeBranch?.location}
                phone={activeBranch?.phone}
                salesId={printingTransaction.salesId}
                paymentMethod={printingTransaction.paymentMethod}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                printReceipt()
                setIsPrintDialogOpen(false)
              }}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TransactionsPage

