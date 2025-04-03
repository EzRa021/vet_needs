"use client"

import { useState, useEffect } from "react"
import { useDepartments } from "@/context/DepartmentContext"
import { useBranches } from "@/context/BranchContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, PlusIcon, EditIcon, TrashIcon, RefreshCw, FolderIcon, SearchIcon, XIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
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
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"
import { useLogs } from "@/context/LogContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function DepartmentTable() {
  const { activeBranch } = useBranches()
  const { addLog } = useLogs()
  const {
    departments,
    loading,
    error,
    fetchDepartments,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    setBranchId,
    branchId,
    triggerSync,
    syncStatus,
    isOnline,
  } = useDepartments()
  const { userDetails } = useAuth()
  const { toast } = useToast()
  const [departmentName, setDepartmentName] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [isLoading, setIsLoading] = useState({
    add: false,
    edit: false,
    delete: false,
  })

  useEffect(() => {
    console.log("Active branch:", activeBranch);
    console.log("Branch ID:", branchId);
    
    if (activeBranch?.id && activeBranch?.id !== branchId) {
      console.log("Setting branch ID to:", activeBranch.id);
      setBranchId(activeBranch?.id);
    }
  }, [activeBranch, branchId, setBranchId]);
  
  const handleAddDepartment = async () => {
    if (!departmentName.trim()) {
      toast({
        title: "Error",
        description: "Department name cannot be empty",
        variant: "destructive",
      })
      return
    }

    if (!activeBranch) {
      toast({
        title: "Error",
        description: "No active branch selected",
        variant: "destructive",
      })
      return
    }

    setIsLoading((prev) => ({ ...prev, add: true }))
    try {
      const newDepartment = {
        id: `${activeBranch.id}-${Date.now()}`, // Generate unique ID
        branchId: activeBranch.id,
        name: departmentName,
      }
      await addDepartment(newDepartment)
      addLog({
        action: "create-department",
        message: `Created a department with the name: ${departmentName}`,
        metadata: { departmentName, createdBy: userDetails?.fullname, role: userDetails?.role },
      })
      setDepartmentName("")
      toast({
        title: "Successful",
        description: "Department added successfully",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add department"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      console.error(err)
    } finally {
      setIsLoading((prev) => ({ ...prev, add: false }))
    }
  }

  const handleEditDepartment = async () => {
    if (!departmentName.trim() || !selectedDepartment) {
      toast({
        title: "Error",
        description: "Department name cannot be empty",
        variant: "destructive",
      })
      return
    }

    if (!activeBranch) {
      toast({
        title: "Error",
        description: "No active branch selected",
        variant: "destructive",
      })
      return
    }

    setIsLoading((prev) => ({ ...prev, edit: true }))
    try {
      const updatedDepartment = {
        id: selectedDepartment.id,
        branchId: activeBranch.id,
        name: departmentName,
      }
      await updateDepartment(updatedDepartment.id, updatedDepartment)
      addLog({
        action: "update-department",
        message: `Updated a department with the name: ${departmentName}`,
        metadata: { departmentName, updatedBy: userDetails?.fullname, role: userDetails?.role },
      })
      setSelectedDepartment(null)
      setDepartmentName("")
      toast({
        title: "Successful",
        description: "Department updated successfully",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update department"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      console.error(err)
    } finally {
      setIsLoading((prev) => ({ ...prev, edit: false }))
    }
  }

  const handleDeleteDepartment = async () => {
    if (!selectedDepartment) {
      toast({
        title: "Error",
        description: "No department selected",
        variant: "destructive",
      })
      return
    }

    setIsLoading((prev) => ({ ...prev, delete: true }))
    try {
      await deleteDepartment(selectedDepartment.id) // Only id is needed
      addLog({
        action: "delete-department",
        message: `Deleted a department with the name: ${selectedDepartment.name}`,
        metadata: {
          departmentName: selectedDepartment.name,
          deletedBy: userDetails?.fullname,
          role: userDetails?.role,
        },
      })
      setSelectedDepartment(null)
      toast({
        title: "Successful",
        description: "Department deleted successfully",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete department"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      console.error(err)
    } finally {
      setIsLoading((prev) => ({ ...prev, delete: false }))
    }
  }

  const handleSyncData = async () => {
    if (!activeBranch) {
      toast({
        title: "Error",
        description: "No active branch selected",
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

  const filteredDepartments = departments.filter((dept) => dept.name.toLowerCase().includes(searchTerm.toLowerCase()))

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-7 w-[180px] mb-2" />
              <Skeleton className="h-4 w-[250px]" />
            </div>
            <Skeleton className="h-10 w-[150px]" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-6">
            <Skeleton className="h-10 w-[300px]" />
            <Skeleton className="h-10 w-[120px]" />
          </div>
          <div className="grid gap-4 mt-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex justify-between items-center border rounded-md p-4">
                <Skeleton className="h-6 w-[200px]" />
                <div className="flex space-x-2">
                  <Skeleton className="h-10 w-[80px]" />
                  <Skeleton className="h-10 w-[90px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="bg-red-50 text-red-600 p-4 rounded-md">
            <p className="font-medium">Error: {error}</p>
            <p className="text-sm mt-2">Please try refreshing the page or contact support if the issue persists.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-xl">Department Management</CardTitle>
            <CardDescription>
              {activeBranch
                ? `Manage departments for ${activeBranch.branchName}`
                : "Please select a branch to manage departments"}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleSyncData}
                    disabled={loading || !isOnline || !activeBranch}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
                    Sync Data
                    {getSyncStatusBadge()}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sync departments with the remote database</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Dialog>
              <DialogTrigger asChild>
                <Button disabled={!activeBranch} className="flex items-center gap-2">
                  <PlusIcon className="h-4 w-4" /> Add Department
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Department</DialogTitle>
                  <DialogDescription>
                    Create a new department for {activeBranch?.branchName || "the active branch"}.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={departmentName}
                      onChange={(e) => setDepartmentName(e.target.value)}
                      className="col-span-3"
                      disabled={isLoading.add}
                      placeholder="Enter department name"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button onClick={handleAddDepartment} disabled={isLoading.add || !departmentName.trim()}>
                    {isLoading.add ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
                      </>
                    ) : (
                      "Add Department"
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
          <div className="relative w-full sm:w-auto sm:min-w-[300px]">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search departments..."
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
          <div className="text-sm text-muted-foreground">
            {filteredDepartments.length} {filteredDepartments.length === 1 ? "department" : "departments"} found
          </div>
        </div>

        {filteredDepartments.length === 0 ? (
          <div className="text-center py-8 border rounded-md bg-muted/20">
            <FolderIcon className="h-12 w-12 mx-auto text-muted-foreground/60" />
            <h3 className="mt-4 text-lg font-medium">No departments found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchTerm
                ? "Try adjusting your search term"
                : activeBranch
                  ? "Get started by adding a new department"
                  : "Please select a branch first"}
            </p>
            {!searchTerm && activeBranch && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="mt-4">
                    <PlusIcon className="mr-2 h-4 w-4" /> Add Department
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Department</DialogTitle>
                    <DialogDescription>
                      Create a new department for {activeBranch?.branchName || "the active branch"}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="name"
                        value={departmentName}
                        onChange={(e) => setDepartmentName(e.target.value)}
                        className="col-span-3"
                        disabled={isLoading.add}
                        placeholder="Enter department name"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button onClick={handleAddDepartment} disabled={isLoading.add || !departmentName.trim()}>
                      {isLoading.add ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
                        </>
                      ) : (
                        "Add Department"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredDepartments.map((dept) => (
              <div
                key={dept.id}
                className="flex justify-between items-center border rounded-md p-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FolderIcon className="h-5 w-5 text-primary/70" />
                  <span className="font-medium">{dept.name}</span>
                </div>
                <div className="flex space-x-2">
                  <Dialog
                    open={selectedDepartment?.id === dept.id && !isLoading.delete}
                    onOpenChange={(open) => {
                      if (!open) setSelectedDepartment(null)
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() => {
                          setSelectedDepartment(dept)
                          setDepartmentName(dept.name)
                        }}
                      >
                        <EditIcon className="h-3.5 w-3.5" /> Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Department</DialogTitle>
                        <DialogDescription>Update the name of the department.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="editName" className="text-right">
                            Name
                          </Label>
                          <Input
                            id="editName"
                            value={departmentName}
                            onChange={(e) => setDepartmentName(e.target.value)}
                            className="col-span-3"
                            disabled={isLoading.edit}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button type="button" variant="outline">
                            Cancel
                          </Button>
                        </DialogClose>
                        <Button onClick={handleEditDepartment} disabled={isLoading.edit || !departmentName.trim()}>
                          {isLoading.edit ? (
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

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() => setSelectedDepartment(dept)}
                      >
                        <TrashIcon className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the department <span className="font-medium">{dept.name}</span>.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteDepartment}
                          disabled={isLoading.delete}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {isLoading.delete ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                            </>
                          ) : (
                            "Delete Department"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

