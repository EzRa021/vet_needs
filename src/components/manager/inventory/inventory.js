"use client";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Footer } from "./footer";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Loader2,
  Trash2,
  Edit,
  Search,
  PlusCircle,
  RefreshCw,
  Save,
  X,
  FilterIcon,
  Package,
  Tag,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useItems } from "@/context/ItemContext";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { DeleteAllItemsButton } from "../../ui/deleteAllItemsButton";
import { ScrollArea } from "@/components/ui/scroll-area";

const LOW_STOCK_THRESHOLD = 5;
const ITEMS_PER_PAGE = 10;

const InventoryDashboard = () => {
  const { userDetails } = useAuth();
  const {
    isOnline,
    fetchItems,
    items,
    loading,
    updateItem,
    deleteItem,
    pendingSyncCount,
    setBranchId,
    processPendingOperations,
    triggerSync,
    syncStatus,
  } = useItems();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isSyncing, setIsSyncing] = useState(false);
  const [inlineEditingItemId, setInlineEditingItemId] = useState(null);
  const [editedItemData, setEditedItemData] = useState(null);

  // Set branchId when userDetails changes
  useEffect(() => {
    if (userDetails?.branchId) {
      setBranchId(userDetails?.branchId);
    }
  }, [userDetails?.branchId, setBranchId]);

  // Enhanced search function that checks multiple fields
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const searchFields = [
        item.name,
        item.description,
        item.costPrice?.toString(),
        item.sellingPrice?.toString(),
        item.discountPrice?.toString(),
        item.stockManagement?.type,
        item.stockManagement?.quantity?.toString(),
        item.stockManagement?.totalWeight?.toString(),
        item.stockManagement?.weightUnit,
      ].map((field) => (field || "").toLowerCase());

      const searchTerms = searchTerm.toLowerCase().split(" ");
      const matchesSearch = searchTerms.every((term) => searchFields.some((field) => field.includes(term)));

      const matchesItemType = itemTypeFilter === "all" || item.stockManagement?.type === itemTypeFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "inStock" && item.inStock) ||
        (statusFilter === "outOfStock" && !item.inStock) ||
        (statusFilter === "lowStock" &&
          ((item.stockManagement?.type === "quantity" && item.stockManagement?.quantity < LOW_STOCK_THRESHOLD) ||
            (item.stockManagement?.type === "weight" && item.stockManagement?.totalWeight < LOW_STOCK_THRESHOLD)));

      return matchesSearch && matchesItemType && matchesStatus;
    });
  }, [items, searchTerm, itemTypeFilter, statusFilter]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      await triggerSync();
      toast.success("Successfully synced data");
    } catch (error) {
      toast.error("Failed to sync data");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEditItem = async (updatedItem) => {
    try {
      await updateItem(updatedItem);
      toast.success("Item updated successfully");
      setIsEditDialogOpen(false);
    } catch (error) {
      toast.error("Failed to update item");
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await deleteItem(itemId, userDetails?.branchId);
      toast.success("Item deleted successfully");
    } catch (error) {
      toast.error("Failed to delete item");
    }
  };

  const renderStockStatus = (item) => {
    if (!item.inStock) {
      return (
        <div className="flex items-center gap-1.5">
          <XCircle className="h-4 w-4 text-red-500" />
          <span className="text-red-500 font-medium">Out of Stock</span>
        </div>
      );
    }
    if (item.stockManagement?.type === "quantity") {
      const quantity = item.stockManagement?.quantity || 0;
      if (quantity === 0) {
        return (
          <div className="flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-red-500 font-medium">Out of Stock</span>
          </div>
        );
      }
      if (quantity < LOW_STOCK_THRESHOLD) {
        return (
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <span className="text-orange-500 font-medium">Low Stock</span>
          </div>
        );
      }
    } else if (item.stockManagement?.type === "weight") {
      const totalWeight = item.stockManagement?.totalWeight || 0;
      if (totalWeight === 0) {
        return (
          <div className="flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-red-500 font-medium">Out of Stock</span>
          </div>
        );
      }
      if (totalWeight < LOW_STOCK_THRESHOLD) {
        return (
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <span className="text-orange-500 font-medium">Low Stock</span>
          </div>
        );
      }
    }
    return (
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <span className="text-green-500 font-medium">In Stock</span>
      </div>
    );
  };

  const renderStockAmount = (item) => {
    if (item.stockManagement?.type === "quantity") {
      return `${item.stockManagement?.quantity}`;
    } else if (item.stockManagement?.type === "weight") {
      return `${item.stockManagement?.totalWeight} ${item.stockManagement?.weightUnit}`;
    }
    return "0";
  };

  const renderPaginationItems = () => {
    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    const maxVisiblePages = 5;

    let pagesToShow = [];
    if (totalPages <= maxVisiblePages) {
      pagesToShow = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      pagesToShow.push(1);
      let startPage = Math.max(2, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 3);

      if (startPage === 2) {
        endPage = Math.min(totalPages - 1, maxVisiblePages - 1);
      }
      if (endPage === totalPages - 1) {
        startPage = Math.max(2, totalPages - maxVisiblePages + 2);
      }

      if (startPage > 2) pagesToShow.push("ellipsis-start");
      for (let i = startPage; i <= endPage; i++) pagesToShow.push(i);
      if (endPage < totalPages - 1) pagesToShow.push("ellipsis-end");
      pagesToShow.push(totalPages);
    }

    return pagesToShow.map((page, index) => {
      if (page === "ellipsis-start" || page === "ellipsis-end") {
        return (
          <PaginationItem key={page}>
            <PaginationLink disabled>...</PaginationLink>
          </PaginationItem>
        );
      }
      return (
        <PaginationItem key={index}>
          <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page}>
            {page}
          </PaginationLink>
        </PaginationItem>
      );
    });
  };

  const startInlineEdit = (item) => {
    setInlineEditingItemId(item.id);
    setEditedItemData({ ...item });
  };

  const cancelInlineEdit = () => {
    setInlineEditingItemId(null);
    setEditedItemData(null);
  };

  const handleInlineEditSave = async () => {
    if (!editedItemData) return;

    try {
      await updateItem(editedItemData);
      toast.success("Item updated successfully");
      setInlineEditingItemId(null);
      setEditedItemData(null);
    } catch (error) {
      toast.error("Failed to update item");
    }
  };

  const updateEditedItemField = (field, value) => {
    setEditedItemData((prev) => ({ ...prev, [field]: value }));
  };

  const updateEditedItemStockField = (field, value) => {
    setEditedItemData((prev) => ({
      ...prev,
      stockManagement: { ...prev.stockManagement, [field]: value },
    }));
  };

  const getCurrentItem = (itemId) => {
    if (inlineEditingItemId === itemId && editedItemData) return editedItemData;
    return items.find((item) => item.id === itemId);
  };

  const getSyncStatusBadge = () => {
    switch (syncStatus) {
      case "syncing":
        return (
          <Badge variant="secondary" className="animate-pulse">
            Syncing...
          </Badge>
        );
      case "error":
        return <Badge variant="destructive">Sync Error</Badge>;
      case "idle":
        return <Badge variant="outline">{isOnline ? "Online" : "Offline"}</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">Inventory Dashboard</CardTitle>
              <CardDescription>
                {userDetails
                  ? `Manage inventory items for ${userDetails.branchName}`
                  : "Please select a branch to manage inventory"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {pendingSyncCount > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => processPendingOperations()}
                        disabled={!isOnline || loading}
                        className="flex items-center gap-2"
                      >
                        <AlertCircle className="h-4 w-4" />
                        Process Pending ({pendingSyncCount})
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Process pending synchronization operations</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
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
                      Sync Data
                      {getSyncStatusBadge()}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sync inventory with the remote database</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DeleteAllItemsButton variant="outline" />
              <Link href="/manager/item">
                <Button className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" /> Add Item
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
            <div className="w-full md:w-1/2 relative">
              <Input
                type="text"
                placeholder="Search items by name, description, price..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            </div>
            <div className="flex flex-wrap gap-4 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <FilterIcon className="h-4 w-4 text-muted-foreground" />
                <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Item Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="quantity">Quantity</SelectItem>
                    <SelectItem value="weight">Weight</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="inStock">In Stock</SelectItem>
                    <SelectItem value="outOfStock">Out of Stock</SelectItem>
                    <SelectItem value="lowStock">Low Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin w-6 h-6 mr-2 text-primary" />
              <span className="text-muted-foreground">Loading inventory items...</span>
            </div>
          ) : paginatedItems.length === 0 ? (
            <div className="text-center py-12 border rounded-md bg-muted/20">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/60" />
              <h3 className="mt-4 text-lg font-medium">No items found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchTerm || itemTypeFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by adding inventory items"}
              </p>
              {!searchTerm && itemTypeFilter === "all" && statusFilter === "all" && (
                <Link href="/manager/item">
                  <Button className="mt-4">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-4">
                Showing {paginatedItems.length} of {filteredItems.length} items
              </div>
              <div className="rounded-md border overflow-hidden">
                <ScrollArea className="max-h-[600px]">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Selling Price</TableHead>
                        <TableHead>Discount Price</TableHead>
                        <TableHead>Stock Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Item Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map((item) => {
                        const currentItem = getCurrentItem(item.id);
                        const isEditing = inlineEditingItemId === item.id;

                        return (
                          <TableRow key={item.id} className={isEditing ? "bg-muted/50" : ""}>
                            <TableCell
                              className={!isEditing ? "cursor-pointer hover:bg-muted/30" : ""}
                              onClick={() => !isEditing && startInlineEdit(item)}
                            >
                              {isEditing ? (
                                <Input
                                  value={currentItem.name}
                                  onChange={(e) => updateEditedItemField("name", e.target.value)}
                                />
                              ) : (
                                <div className="font-medium">{item.name}</div>
                              )}
                            </TableCell>
                            <TableCell
                              className={!isEditing ? "cursor-pointer hover:bg-muted/30" : ""}
                              onClick={() => !isEditing && startInlineEdit(item)}
                            >
                              {isEditing ? (
                                <Input
                                  value={currentItem.description}
                                  onChange={(e) => updateEditedItemField("description", e.target.value)}
                                />
                              ) : (
                                <div className="max-w-[200px] truncate" title={item.description}>
                                  {item.description}
                                </div>
                              )}
                            </TableCell>
                            <TableCell
                              className={!isEditing ? "cursor-pointer hover:bg-muted/30" : ""}
                              onClick={() => !isEditing && startInlineEdit(item)}
                            >
                              {isEditing ? (
                                <Input
                                  type="number"
                                  value={currentItem.sellingPrice}
                                  onChange={(e) => updateEditedItemField("sellingPrice", Number(e.target.value))}
                                />
                              ) : (
                                `₦${item.sellingPrice?.toLocaleString()}`
                              )}
                            </TableCell>
                            <TableCell
                              className={!isEditing ? "cursor-pointer hover:bg-muted/30" : ""}
                              onClick={() => !isEditing && startInlineEdit(item)}
                            >
                              {isEditing ? (
                                <Input
                                  type="number"
                                  value={currentItem.discountPrice}
                                  onChange={(e) => updateEditedItemField("discountPrice", Number(e.target.value))}
                                />
                              ) : (
                                `₦${item.discountPrice?.toLocaleString()}`
                              )}
                            </TableCell>
                            <TableCell
                              className={!isEditing ? "cursor-pointer hover:bg-muted/30" : ""}
                              onClick={() => !isEditing && startInlineEdit(item)}
                            >
                              {isEditing ? (
                                currentItem.stockManagement?.type === "quantity" ? (
                                  <Input
                                    type="number"
                                    value={currentItem.stockManagement?.quantity}
                                    onChange={(e) => updateEditedItemStockField("quantity", Number(e.target.value))}
                                  />
                                ) : (
                                  <div className="flex gap-2">
                                    <Input
                                      type="number"
                                      value={currentItem.stockManagement?.totalWeight}
                                      onChange={(e) =>
                                        updateEditedItemStockField("totalWeight", Number(e.target.value))
                                      }
                                      className="w-20"
                                    />
                                    <Select
                                      value={currentItem.stockManagement?.weightUnit}
                                      onValueChange={(value) => updateEditedItemStockField("weightUnit", value)}
                                    >
                                      <SelectTrigger className="w-16">
                                        <SelectValue placeholder="Unit" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="kg">kg</SelectItem>
                                        <SelectItem value="g">g</SelectItem>
                                        <SelectItem value="lb">lb</SelectItem>
                                        <SelectItem value="oz">oz</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )
                              ) : (
                                <div className="font-medium">{renderStockAmount(item)}</div>
                              )}
                            </TableCell>
                            <TableCell
                              className={!isEditing ? "cursor-pointer hover:bg-muted/30" : ""}
                              onClick={() => !isEditing && startInlineEdit(item)}
                            >
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={currentItem.inStock}
                                    onCheckedChange={(checked) => updateEditedItemField("inStock", checked)}
                                  />
                                  <span>{currentItem.inStock ? "In Stock" : "Out of Stock"}</span>
                                </div>
                              ) : (
                                renderStockStatus(item)
                              )}
                            </TableCell>
                            <TableCell
                              className={!isEditing ? "cursor-pointer hover:bg-muted/30" : ""}
                              onClick={() => !isEditing && startInlineEdit(item)}
                            >
                              {isEditing ? (
                                <Select
                                  value={currentItem.stockManagement?.type}
                                  onValueChange={(value) => {
                                    const newStockManagement = {
                                      type: value,
                                      quantity:
                                        value === "quantity" ? currentItem.stockManagement?.quantity || 0 : undefined,
                                      totalWeight:
                                        value === "weight" ? currentItem.stockManagement?.totalWeight || 0 : undefined,
                                      weightUnit:
                                        value === "weight"
                                          ? currentItem.stockManagement?.weightUnit || "kg"
                                          : undefined,
                                    };
                                    setEditedItemData((prev) => ({
                                      ...prev,
                                      stockManagement: newStockManagement,
                                    }));
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="quantity">Quantity</SelectItem>
                                    <SelectItem value="weight">Weight</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant="outline">
                                  {item.stockManagement?.type === "quantity" ? "Quantity" : "Weight"}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end space-x-2">
                                {isEditing ? (
                                  <>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="default"
                                            size="sm"
                                            onClick={handleInlineEditSave}
                                            className="flex items-center gap-1"
                                          >
                                            <Save className="h-3.5 w-3.5" /> Save
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Save changes</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={cancelInlineEdit}
                                            className="flex items-center gap-1"
                                          >
                                            <X className="h-3.5 w-3.5" /> Cancel
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Cancel editing</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </>
                                ) : (
                                  <>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="sm" onClick={() => startInlineEdit(item)}>
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Edit Item</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Item</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete{" "}
                                            <span className="font-medium">{item.name}</span>? This action cannot be
                                            undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="bg-red-600 hover:bg-red-700"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
              <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-muted-foreground">
                  Showing {paginatedItems.length} of {filteredItems.length} items
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        disabled={currentPage === 1}
                      />
                    </PaginationItem>
                    {renderPaginationItems()}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setCurrentPage((page) =>
                            Math.min(page + 1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE))
                          )
                        }
                        disabled={currentPage === Math.ceil(filteredItems.length / ITEMS_PER_PAGE)}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <Footer />
    </div>
  );
};

export default InventoryDashboard;