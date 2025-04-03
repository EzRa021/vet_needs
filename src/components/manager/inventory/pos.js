"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Trash2,
  Plus,
  Minus,
  Search,
  Loader2,
  ShoppingCart,
  CreditCard,
  Printer,
  RefreshCw,
  Package,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Store,
} from "lucide-react"
import { useItems } from "@/context/ItemContext"
import { useAuth } from "@/context/AuthContext"
import { useTransactions } from "@/context/TransactionContext"
import Image from "next/image"
import Receipt from "./receipt"
import { useToast } from "@/hooks/use-toast"
import { useLogs } from "@/context/manager/LogContext"
import StockAlertDialog from "./stockAlertDialog"

const ITEMS_PER_PAGE = 12
const MIN_QUANTITY = -1 // Minimum allowed quantity/weight

export const PosManagement = () => {
  const { items, loading: isLoading, error, fetchItems, setBranchId, triggerSync, syncStatus, isOnline } = useItems()
  const { userDetails, fullname } = useAuth()
  const { toast } = useToast()
  const { addLog } = useLogs()
  const { addTransaction, salesId } = useTransactions()

  const [cart, setCart] = useState([])
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false)
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState(null)
  const [showStockAlert, setShowStockAlert] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState("all")

  const receiptRef = useRef(null)

  useEffect(() => {
    if (userDetails?.branchId) {
      setBranchId(userDetails?.branchId)
    }
  }, [userDetails?.branchId, setBranchId])

  // Get unique categories for filtering
  const categories = [
    { id: "all", name: "All Categories" },
    ...Array.from(new Set(items.map((item) => item.categoryId)))
      .map((categoryId) => {
        const item = items.find((item) => item.categoryId === categoryId)
        return { id: categoryId, name: item?.categoryName || "Unknown" }
      })
      .filter((category) => category.name !== "Unknown"),
  ]

  const filteredItems = items?.filter(
    (item) =>
      (categoryFilter === "all" || item.categoryId === categoryFilter) &&
      item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const paginatedItems = filteredItems?.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const totalPages = Math.ceil((filteredItems?.length || 0) / ITEMS_PER_PAGE)

  const handleSyncData = async () => {
    setIsSyncing(true)
    try {
      await triggerSync()
      toast({
        title: "Success",
        description: "Inventory data synchronized successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to synchronize inventory data",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const addToCart = (item) => {
    const isOutOfStock =
      item.stockManagement.type === "quantity"
        ? item.stockManagement.quantity <= 0
        : item.stockManagement.totalWeight <= 0.5

    if (isOutOfStock) {
      setSelectedItem(item)
      setShowStockAlert(true)
      return
    }

    const existingItem = cart.find((cartItem) => cartItem.id === item.id)
    const incrementAmount = item.stockManagement.type === "quantity" ? 1 : 0.5

    if (existingItem) {
      setCart(
        cart.map((cartItem) =>
          cartItem.id === item.id
            ? {
              ...cartItem,
              quantity: item.stockManagement.type === "quantity" ? cartItem.quantity + 1 : cartItem.quantity,
              weight: item.stockManagement.type === "weight" ? cartItem.weight + 0.5 : cartItem.weight,
            }
            : cartItem,
        ),
      )
    } else {
      setCart([
        ...cart,
        {
          ...item,
          quantity: item.stockManagement.type === "quantity" ? 1 : 0,
          weight: item.stockManagement.type === "weight" ? 0.5 : 0,
        },
      ])
    }
  }

  // First, modify the updateQuantity function to handle empty inputs
  const updateQuantity = (itemId, newQuantity) => {
    // For delete button - explicit removal
    if (newQuantity === 0) {
      setCart(cart.filter((item) => item.id !== itemId))
      return
    }

    // Handle empty or null cases
    if (newQuantity === "" || newQuantity === null) {
      setCart(cart.map((item) => (item.id === itemId ? { ...item, quantity: "" } : item)))
      return
    }

    // Convert to number and validate
    const numericValue = parseFloat(newQuantity)

    // Only apply positive values, ignore negatives
    if (!isNaN(numericValue) && numericValue >= 0) {
      setCart(cart.map((item) => (item.id === itemId ? { ...item, quantity: numericValue } : item)))
    }
  }

  // Similarly update the updateWeight function
  const updateWeight = (itemId, newWeight) => {
    // For delete button - explicit removal
    if (newWeight === 0) {
      setCart(cart.filter((item) => item.id !== itemId))
      return
    }

    // Handle empty or null cases
    if (newWeight === "" || newWeight === null) {
      setCart(cart.map((item) => (item.id === itemId ? { ...item, weight: "" } : item)))
      return
    }

    // Convert to number and validate
    const numericValue = parseFloat(newWeight)

    // Only apply positive values, ignore negatives
    if (!isNaN(numericValue) && numericValue >= 0) {
      const item = items.find(i => i.id === itemId)
      const maxWeight = item ? item.stockManagement.totalWeight : 300

      // Apply maximum limit but don't enforce minimum
      const validWeight = Math.min(numericValue, maxWeight)
      setCart(cart.map((item) => (item.id === itemId ? { ...item, weight: validWeight } : item)))
    }
  }

  // Then, modify the decrementValue function to respect empty values
  const decrementValue = (item) => {
    const decrementAmount = item.stockManagement.type === "quantity" ? 1 : 0.5

    if (item.stockManagement.type === "quantity") {
      // Handle empty case
      if (item.quantity === "") {
        updateQuantity(item.id, 0)
        return
      }
      const newQuantity = parseFloat(item.quantity) - decrementAmount
      // Don't allow negative values
      updateQuantity(item.id, Math.max(0, newQuantity))
    } else {
      // Handle empty case
      if (item.weight === "") {
        updateWeight(item.id, 0)
        return
      }
      const newWeight = parseFloat(item.weight) - decrementAmount
      // Don't allow negative values
      updateWeight(item.id, Math.max(0, newWeight))
    }
  }

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      // Handle empty values in quantity/weight
      const quantity = item.stockManagement.type === "weight"
        ? (item.weight === "" ? 0 : parseFloat(item.weight))
        : (item.quantity === "" ? 0 : parseFloat(item.quantity));

      const itemTotal = item.sellingPrice * quantity;
      return total + itemTotal;
    }, 0);
  }

  
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
        * {
          color-adjust: exact;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .receipt-container {
          width: 100%;
          margin: 0;
          padding: 0;
        }
        .receipt-content {
          width: 100%;
          height: fit-content;
          page-break-after: always;
        }
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

  const handlePrint = () => {
    printReceipt()
    setIsPrintDialogOpen(false)
    setCart([])
    setPaymentMethod(null)
  }

  const processTransaction = async () => {
    if (!userDetails?.branchId || !paymentMethod) {
      toast({
        title: "Error",
        description: "Please select a branch and payment method",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const transactionData = {
        items: cart.map((item) => ({
          id: item.id,
          name: item.name,
          cashierName: fullname,
          cashierRole: userDetails?.role,
          quantitySold:
            item.stockManagement.type === "weight"
              ? Number.parseFloat(item.weight || 0)
              : Number.parseFloat(item.quantity || 0), // Changed to parseFloat for both
          numberInStock:
            item.stockManagement.type === "weight"
              ? Number.parseFloat(item.stockManagement.totalWeight || 0)
              : Number.parseInt(item.stockManagement.quantity || 0),
          sellingPrice: item.sellingPrice,
          costPrice: item.costPrice,
          departmentId: item.departmentId,
          departmentName: item.departmentName,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          return: false,
          stockManagementType: item.stockManagement.type,
        })),
        total: calculateTotal(),
        paymentMethod,
      }

      const transactionId = await addTransaction(userDetails?.branchId, transactionData)

      fetchItems()
      if (transactionId) {
        addLog({
          action: "item-sold",
          message: `Sold items with the name: ${cart.map((item) => item.name).join(", ")}`,
          metadata: {
            transactionId,
            items: cart,
            createdBy: userDetails?.fullname,
            role: userDetails?.role,
            paymentMethod,
          },
        })

        toast({
          title: "Successful",
          description: "Transaction processed successfully",
        })
        setIsCheckoutDialogOpen(false)
        setIsPrintDialogOpen(true)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStockStatusBadge = (item) => {
    if (!item.inStock) {
      return (
        <Badge variant="destructive" className="absolute top-2 right-2">
          Out of Stock
        </Badge>
      )
    }

    if (item.stockManagement.type === "quantity") {
      const quantity = item.stockManagement.quantity || 0
      if (quantity === 0) {
        return (
          <Badge variant="destructive" className="absolute top-2 right-2">
            Out of Stock
          </Badge>
        )
      }
      if (quantity < 5) {
        return (
          <Badge variant="warning" className="absolute top-2 right-2 bg-orange-500">
            Low Stock
          </Badge>
        )
      }
    } else if (item.stockManagement.type === "weight") {
      const totalWeight = item.stockManagement.totalWeight || 0
      if (totalWeight === 0) {
        return (
          <Badge variant="destructive" className="absolute top-2 right-2">
            Out of Stock
          </Badge>
        )
      }
      if (totalWeight < 5) {
        return (
          <Badge variant="warning" className="absolute top-2 right-2 bg-orange-500">
            Low Stock
          </Badge>
        )
      }
    }

    return null
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
    <div className="container mx-auto p-4">
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Store className="h-6 w-6 text-primary" />
                Point of Sale
              </CardTitle>
              <CardDescription>
                {userDetails
                  ? `Manage sales for ${userDetails.branchName}`
                  : "Please select a branch to manage sales"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleSyncData}
                      disabled={isSyncing || !isOnline}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
                      Sync Inventory
                      {getSyncStatusBadge()}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Synchronize inventory data with the server</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="py-4 flex flex-col md:flex-row gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center w-full h-[60vh] bg-muted/20 rounded-lg">
            <div className="flex flex-col items-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <span className="text-lg font-medium">Loading inventory items...</span>
              <p className="text-muted-foreground mt-2">Please wait while we fetch the latest data</p>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full md:w-3/4">
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle>Product Catalog</CardTitle>
                    <div className="flex items-center gap-2">
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Filter by category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="relative w-full mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search products by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {paginatedItems?.length === 0 ? (
                    <div className="text-center py-12 border rounded-md bg-muted/20">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground/60" />
                      <h3 className="mt-4 text-lg font-medium">No products found</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {searchTerm || categoryFilter !== "all"
                          ? "Try adjusting your search or filters"
                          : "No products available in inventory"}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                      {paginatedItems?.map((item) => (
                        <TooltipProvider key={item.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Card className="w-full overflow-hidden hover:shadow-md transition-shadow duration-200">
                                <CardHeader className="p-0">
                                  <div className="relative h-32 w-full">
                                    {getStockStatusBadge(item)}
                                    <Image
                                      src={`/uploads/${item?.name}.jpg`}
                                      alt={item.name}
                                      width={300}
                                      height={200}
                                      className="object-cover w-full h-full transition-transform duration-300 ease-in-out hover:scale-105"
                                    />
                                  </div>
                                </CardHeader>
                                <CardContent className="p-3">
                                  <h3 className="text-sm font-semibold line-clamp-1">{item.name}</h3>
                                  <div className="mt-1 flex items-center justify-between text-sm">
                                    <span className="font-bold text-primary">
                                      ₦{item?.sellingPrice.toLocaleString()}
                                    </span>
                                    <span className={`text-xs ${item.inStock ? "text-green-600" : "text-red-600"}`}>
                                      {item.stockManagement.type === "weight"
                                        ? `${item.stockManagement.totalWeight} ${item.stockManagement.weightUnit}`
                                        : `${item.stockManagement.quantity} units`}
                                    </span>
                                  </div>
                                </CardContent>
                                <CardFooter className="p-3 pt-0">
                                  <Button
                                    className="w-full text-xs py-1"
                                    onClick={() => addToCart(item)}
                                    variant={!item.inStock ? "outline" : "default"}
                                    disabled={!item.inStock}
                                  >
                                    <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                                    Add to Cart
                                  </Button>
                                </CardFooter>
                              </Card>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p className="font-medium">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                                {item.stockManagement.type === "weight" ? (
                                  <p className="text-xs">Sold by weight: {item.stockManagement.weightUnit}</p>
                                ) : (
                                  <p className="text-xs">Sold by unit</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-center pt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1"
                    >
                      <ArrowLeft className="h-4 w-4" /> Previous
                    </Button>
                    <div className="flex items-center gap-1 px-2">
                      <span className="text-sm font-medium">Page {currentPage}</span>
                      <span className="text-sm text-muted-foreground">of {totalPages || 1}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="flex items-center gap-1"
                    >
                      Next <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>

            {/* Updated Cart to be fixed and have proper height constraints */}
            <div className="w-full md:w-1/4 md:sticky md:top-4 md:self-start">
              <Card className="w-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    Your Cart
                  </CardTitle>
                  <CardDescription>
                    {cart.length === 0
                      ? "Your cart is empty"
                      : `${cart.length} ${cart.length === 1 ? "item" : "items"} in cart`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-0">
                  {cart.length === 0 ? (
                    <div className="text-center py-8 border rounded-md bg-muted/20">
                      <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/60" />
                      <h3 className="mt-4 text-lg font-medium">Your cart is empty</h3>
                      <p className="mt-2 text-sm text-muted-foreground">Add some products to get started!</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[calc(100vh-22rem)] pr-4">
                      {cart.map((item) => (
                        <div key={item.id} className="flex flex-col border-b py-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              <div>
                                <p className="font-medium text-sm line-clamp-1">{item.name}</p>
                                <div className="text-muted-foreground text-xs">
                                  ₦{item.sellingPrice.toLocaleString()} /{" "}
                                  {item.stockManagement.type === "weight" ? item.stockManagement.weightUnit : "unit"}
                                </div>
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => updateQuantity(item.id, 0)} // Explicitly set to 0 for deletion
                              className="h-7 w-7 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            {item.stockManagement.type === "weight" ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => decrementValue(item)}
                                  className="h-7 w-7"
                                  disabled={item.weight <= MIN_QUANTITY}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateQuantity(item.id, e.target.value)}
                                  className="w-20 text-right text-sm h-8"
                                  min="0"
                                  step="any" // Allow any decimal precision
                                />
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => updateWeight(item.id, item.weight + 0.5)}
                                  disabled={item.weight >= item.stockManagement.totalWeight}
                                  className="h-7 w-7"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <span className="text-xs">{item.stockManagement.weightUnit}</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => decrementValue(item)}
                                  className="h-7 w-7"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  value={item.weight}
                                  onChange={(e) => updateWeight(item.id, e.target.value)}
                                  className="w-20 text-right text-sm h-8"
                                  min="0"
                                  step="any" // Allow any decimal precision
                                  max={item.stockManagement.totalWeight}
                                />
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="h-7 w-7"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            <span className="text-sm font-semibold">
                              ₦
                              {(
                                item.sellingPrice * (item.stockManagement.type === "weight" ? item.weight : item.quantity)
                              ).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col pt-4">
                  <div className="w-full space-y-4">
                    <Separator />
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span className="text-primary">₦{calculateTotal().toLocaleString()}</span>
                    </div>

                    <Select onValueChange={setPaymentMethod} value={paymentMethod || ""}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Payment Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      className="w-full"
                      size="lg"
                      disabled={cart.length === 0 || !paymentMethod || loading}
                      onClick={() => setIsCheckoutDialogOpen(true)}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Proceed to Checkout
                        </>
                      )}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>

            <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Transaction</DialogTitle>
                  <DialogDescription>Review your transaction details before proceeding</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Branch</p>
                      <p className="font-medium">{userDetails?.branchName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Cashier</p>
                      <p className="font-medium">{userDetails?.name}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 text-sm font-medium">Item</th>
                          <th className="text-center p-2 text-sm font-medium">Quantity/Weight</th>
                          <th className="text-right p-2 text-sm font-medium">Price</th>
                          <th className="text-right p-2 text-sm font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="p-2 text-sm">{item.name}</td>
                            <td className="p-2 text-sm text-center">
                              {item.stockManagement.type === "weight"
                                ? `${item.weight} ${item.stockManagement.weightUnit}`
                                : item.quantity}
                            </td>
                            <td className="p-2 text-sm text-right">₦{item.sellingPrice?.toLocaleString()}</td>
                            <td className="p-2 text-sm text-right font-medium">
                              ₦
                              {(
                                item.sellingPrice *
                                (item.stockManagement.type === "weight" ? item.weight : item.quantity)
                              ).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4">
                    <Select onValueChange={setPaymentMethod} value={paymentMethod}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Payment Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-between items-center py-2 px-3 bg-muted/20 rounded-md">
                    <span className="font-medium">Total Amount:</span>
                    <span className="text-xl font-bold text-primary">₦{calculateTotal().toLocaleString()}</span>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCheckoutDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={processTransaction} disabled={loading || !paymentMethod}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Complete Transaction"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
              <DialogContent className="max-h-[90vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Transaction Successful
                  </DialogTitle>
                  <DialogDescription>
                    Your transaction has been processed successfully. You can now print the receipt.
                  </DialogDescription>
                </DialogHeader>

                <div ref={receiptRef} className="overflow-y-auto border rounded-md p-4 bg-white">
                  <Receipt
                    transactionData={{
                      items: cart,
                      total: calculateTotal(),
                    }}
                    salesId={salesId}
                    branchName={userDetails?.branchName}
                    departmentName={cart[0]?.departmentName}
                    categoryName={cart[0]?.categoryName}
                    cashierName={userDetails?.fullname}
                    address={userDetails?.branchLocation}
                    paymentMethod={paymentMethod}
                    phone={userDetails?.branchPhone}
                  />
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsPrintDialogOpen(false)
                      setCart([])
                      setPaymentMethod(null)
                    }}
                  >
                    Close
                  </Button>
                  <Button onClick={handlePrint} className="flex items-center gap-2">
                    <Printer className="h-4 w-4" />
                    Print Receipt
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <StockAlertDialog
              isOpen={showStockAlert}
              onClose={() => setShowStockAlert(false)}
              onConfirm={() => {
                // Proceed with adding to cart even if out of stock
                const existingItem = cart.find((cartItem) => cartItem.id === selectedItem.id)
                const incrementAmount = selectedItem.stockManagement.type === "quantity" ? 1 : 0.5

                if (existingItem) {
                  setCart(
                    cart.map((cartItem) =>
                      cartItem.id === selectedItem.id
                        ? {
                          ...cartItem,
                          quantity:
                            selectedItem.stockManagement.type === "quantity"
                              ? cartItem.quantity + 1
                              : cartItem.quantity,
                          weight:
                            selectedItem.stockManagement.type === "weight" ? cartItem.weight + 0.5 : cartItem.weight,
                        }
                        : cartItem,
                    ),
                  )
                } else {
                  setCart([
                    ...cart,
                    {
                      ...selectedItem,
                      quantity: selectedItem.stockManagement.type === "quantity" ? 1 : 0,
                      weight: selectedItem.stockManagement.type === "weight" ? 0.5 : 0,
                    },
                  ])
                }
                setShowStockAlert(false)
              }}
              item={selectedItem}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default PosManagement

