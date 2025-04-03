"use client"

import { useState, useEffect } from "react"
import { useDepartments } from "@/context/DepartmentContext"
import { useCategories } from "@/context/CategoryContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import {
  Loader2,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  FolderIcon,
  TagIcon,
  SearchIcon,
  XIcon,
  FilterIcon,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { useAuth } from "@/context/AuthContext"
import { useLogs } from "@/context/manager/LogContext"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function CategoryForm() {
  const { userDetails } = useAuth()
  const { addLog } = useLogs()
  const { toast } = useToast()
  const { departments, loading: loadingDepartments, setBranchId: setDeptBranchId } = useDepartments()

  const {
    branchId,
    categories,
    loading: loadingCategories,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    setBranchId,
    setDepartmentId,
    triggerSync,
    syncStatus,
    isOnline,
  } = useCategories()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [categoryName, setCategoryName] = useState("")
  const [categoryDescription, setCategoryDescription] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState({
    add: false,
    edit: false,
    delete: false,
  })
  const [editingCategory, setEditingCategory] = useState(null)
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(null)
  const [departmentFilter, setDepartmentFilter] = useState(null)

  // Sync branchId across contexts
  useEffect(() => {
    if (userDetails?.branchId && branchId !== userDetails?.branchId) {
      setBranchId(userDetails?.branchId)
      setDeptBranchId(userDetails?.branchId)
    }
  }, [userDetails, branchId, setBranchId, setDeptBranchId])

  // Set initial department filter only once
  useEffect(() => {
    if (departments.length > 0 && !departmentFilter && userDetails?.branchId) {
      const initialDept = departments[0]
      setDepartmentFilter(initialDept)
      setDepartmentId(initialDept.id)
      fetchCategories(userDetails?.branchId, initialDept.id)
    }
  }, [departments, departmentFilter, userDetails, fetchCategories, setDepartmentId])

  // Fetch categories when departmentFilter changes (controlled by user action)
  const handleDepartmentFilterChange = (value) => {
    const newDepartment = departments.find((d) => d.id === value) || null
    if (newDepartment && newDepartment.id !== departmentFilter?.id) {
      setDepartmentFilter(newDepartment)
      setDepartmentId(newDepartment.id)
      if (userDetails?.branchId) {
        fetchCategories(userDetails?.branchId, newDepartment.id)
      }
    }
  }

  const resetForm = () => {
    setCategoryName("")
    setCategoryDescription("")
    setSelectedDepartment(null)
    setEditingCategory(null)
    setIsDialogOpen(false)
  }

  const handleAddCategory = async () => {
    if (!categoryName.trim() || !selectedDepartment) {
      toast({
        title: "Error",
        description: "Category name and department are required.",
        variant: "destructive",
      })
      return
    }

    if (!userDetails) {
      toast({
        title: "Error",
        description: "No active branch selected.",
        variant: "destructive",
      })
      return
    }

    setIsLoading((prev) => ({ ...prev, add: true }))
    try {
      const newCategory = await addCategory(
        userDetails?.branchId,
        selectedDepartment.id,
        categoryName.trim(),
        categoryDescription.trim() || "",
      )
      addLog({
        action: "create-category",
        message: `Added a category with name: ${categoryName}`,
        metadata: { categoryName, createdBy: userDetails?.fullname, role: userDetails?.role },
      })
      resetForm()
      toast({
        title: "Success",
        description: "Category added successfully.",
      })

      // Wait a moment for state to settle before fetching
      setTimeout(() => {
        fetchCategories(userDetails?.branchId, selectedDepartment.id)
      }, 300)
    } catch (err) {
      console.error("Add category error:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to add category.",
        variant: "destructive",
      })
    } finally {
      setIsLoading((prev) => ({ ...prev, add: false }))
    }
  }

  const handleEditCategory = async () => {
    if (!editingCategory || !categoryName.trim() || !selectedDepartment) {
      toast({
        title: "Error",
        description: "Category name and department are required.",
        variant: "destructive",
      })
      return
    }

    setIsLoading((prev) => ({ ...prev, edit: true }))
    try {
      await updateCategory(
        editingCategory.id,
        userDetails?.branchId,
        selectedDepartment.id,
        categoryName.trim(),
        categoryDescription.trim() || "",
      )
      addLog({
        action: "update-category",
        message: `Updated category: ${categoryName}`,
        metadata: { categoryName, updatedBy: userDetails?.fullname, role: userDetails?.role },
      })
      resetForm()
      toast({
        title: "Success",
        description: "Category updated successfully.",
      })
      fetchCategories(userDetails?.branchId, departmentFilter.id)
    } catch (err) {
      console.error("Edit category error:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to update category.",
        variant: "destructive",
      })
    } finally {
      setIsLoading((prev) => ({ ...prev, edit: false }))
    }
  }

  const handleDeleteCategory = async () => {
    if (!deleteConfirmDialog) return

    setIsLoading((prev) => ({ ...prev, delete: true }))
    try {
      await deleteCategory(deleteConfirmDialog.id, userDetails?.branchId, deleteConfirmDialog.departmentId)
      addLog({
        action: "delete-category",
        message: `Deleted category: ${deleteConfirmDialog.name}`,
        metadata: {
          categoryId: deleteConfirmDialog.id,
          categoryName: deleteConfirmDialog.name,
          departmentId: deleteConfirmDialog.departmentId,
          deletedBy: userDetails?.fullname,
          role: userDetails?.role,
        },
      })
      setDeleteConfirmDialog(null)
      toast({
        title: "Success",
        description: "Category deleted successfully.",
      })
      fetchCategories(userDetails?.branchId, departmentFilter.id)
    } catch (err) {
      console.error("Delete category error:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to delete category.",
        variant: "destructive",
      })
    } finally {
      setIsLoading((prev) => ({ ...prev, delete: false }))
    }
  }

  const handleSyncData = async () => {
    if (!userDetails || !departmentFilter) {
      toast({
        title: "Error",
        description: "Active branch and department filter are required",
        variant: "destructive",
      })
      return
    }

    try {
      await triggerSync()
    } catch (err) {
      console.error("Sync error:", err)
    }
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

  const openEditDialog = (category) => {
    setEditingCategory(category)
    setCategoryName(category.name)
    setCategoryDescription(category.description || "")
    setSelectedDepartment(departments.find((d) => d.id === category.departmentId) || null)
    setIsDialogOpen(true)
  }

  const filteredCategories = categories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const CategorySkeleton = () => (
    <div className="border rounded-md p-4 space-y-2">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3 w-full" />
      <div className="flex justify-end space-x-2 pt-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-xl">Category Management</CardTitle>
            <CardDescription>
              {userDetails
                ? `Manage categories for ${userDetails.branchName}`
                : "Please select a branch to manage categories"}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleSyncData}
                    disabled={loadingCategories || !isOnline || !userDetails || !departmentFilter}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
                    Sync Data
                    {getSyncStatusBadge()}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sync categories with the remote database</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  disabled={!userDetails || loadingDepartments || departments.length === 0}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
                  <DialogDescription>
                    {editingCategory
                      ? "Update the details of the existing category."
                      : "Create a new category for your branch."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="department-select">Department</Label>
                    {loadingDepartments ? (
                      <Skeleton className="h-10 w-full mt-1" />
                    ) : (
                      <Select
                        value={selectedDepartment?.id || ""}
                        onValueChange={(value) =>
                          setSelectedDepartment(departments.find((d) => d.id === value) || null)
                        }
                      >
                        <SelectTrigger id="department-select" className="mt-1">
                          <SelectValue placeholder="Choose a department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept?.id} value={dept?.id}>
                              {dept?.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="categoryName">Category Name</Label>
                    <Input
                      id="categoryName"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="Enter category name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="categoryDescription">Description (Optional)</Label>
                    <Textarea
                      id="categoryDescription"
                      value={categoryDescription}
                      onChange={(e) => setCategoryDescription(e.target.value)}
                      placeholder="Enter category description"
                      className="mt-1 min-h-[100px]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    onClick={editingCategory ? handleEditCategory : handleAddCategory}
                    disabled={isLoading.add || isLoading.edit || !categoryName.trim() || !selectedDepartment}
                  >
                    {isLoading.add || isLoading.edit ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingCategory ? "Updating..." : "Adding..."}
                      </>
                    ) : editingCategory ? (
                      "Update Category"
                    ) : (
                      "Add Category"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="w-full sm:w-auto sm:min-w-[300px] relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchTerm("")}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <FilterIcon className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="department-filter" className="text-sm whitespace-nowrap">
              Filter by Department:
            </Label>
            {loadingDepartments ? (
              <Skeleton className="h-9 w-[180px]" />
            ) : (
              <Select
                value={departmentFilter?.id || ""}
                onValueChange={handleDepartmentFilterChange}
                disabled={departments.length === 0}
              >
                <SelectTrigger id="department-filter" className="w-[180px]">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept?.id} value={dept?.id}>
                      {dept?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {loadingCategories ? (
          <div className="space-y-4">
            {[1, 2, 3].map((skeleton) => (
              <CategorySkeleton key={skeleton} />
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-8 border rounded-md bg-muted/20">
            <TagIcon className="h-12 w-12 mx-auto text-muted-foreground/60" />
            <h3 className="mt-4 text-lg font-medium">No categories found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchTerm
                ? "Try adjusting your search term"
                : departmentFilter
                  ? `No categories in the ${departmentFilter.name} department`
                  : "Please select a department first"}
            </p>
            {!searchTerm && departmentFilter && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="mt-4">
                    <Plus className="mr-2 h-4 w-4" /> Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Category</DialogTitle>
                    <DialogDescription>Create a new category for {departmentFilter.name}.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div>
                      <Label htmlFor="department-select">Department</Label>
                      <Select
                        value={departmentFilter.id}
                        onValueChange={(value) =>
                          setSelectedDepartment(departments.find((d) => d.id === value) || null)
                        }
                      >
                        <SelectTrigger id="department-select" className="mt-1">
                          <SelectValue placeholder="Choose a department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept?.id} value={dept?.id}>
                              {dept?.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="categoryName">Category Name</Label>
                      <Input
                        id="categoryName"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        placeholder="Enter category name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="categoryDescription">Description (Optional)</Label>
                      <Textarea
                        id="categoryDescription"
                        value={categoryDescription}
                        onChange={(e) => setCategoryDescription(e.target.value)}
                        placeholder="Enter category description"
                        className="mt-1 min-h-[100px]"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" onClick={resetForm}>
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      onClick={handleAddCategory}
                      disabled={isLoading.add || !categoryName.trim() || !selectedDepartment}
                    >
                      {isLoading.add ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add Category"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-4">
              {filteredCategories.length} {filteredCategories.length === 1 ? "category" : "categories"} found
            </div>
            <ScrollArea className="max-h-[500px] pr-4">
              <div className="grid gap-3">
                {filteredCategories.map((cat) => (
                  <div key={cat.id} className="border rounded-md p-4 hover:bg-muted/20 transition-colors">
                    <div className="flex flex-col sm:flex-row justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <TagIcon className="h-4 w-4 text-primary" />
                          <h3 className="font-medium text-base">{cat.name}</h3>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FolderIcon className="h-3.5 w-3.5" />
                          <span>
                            {departments.find((d) => d.id === cat.departmentId)?.name || "Unknown Department"}
                          </span>
                        </div>
                        {cat.description && <p className="text-sm mt-2">{cat.description}</p>}
                      </div>
                      <div className="flex space-x-2 mt-4 sm:mt-0">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1"
                                onClick={() => openEditDialog(cat)}
                              >
                                <Edit className="h-3.5 w-3.5" /> Edit
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit this category</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="flex items-center gap-1"
                                onClick={() => setDeleteConfirmDialog(cat)}
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete this category</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>

      <Dialog open={!!deleteConfirmDialog} onOpenChange={(open) => !open && setDeleteConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the category{" "}
              <span className="font-medium">{deleteConfirmDialog?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory} disabled={isLoading.delete}>
              {isLoading.delete ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Category"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

