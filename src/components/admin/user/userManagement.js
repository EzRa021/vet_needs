"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table"
import { Trash2, Edit, Eye, ArrowUpDown, RefreshCw, UserPlus, Shield } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useBranches } from "@/context/BranchContext"
import { toast } from "@/hooks/use-toast"
import { UserForm } from "@/components/admin/user/userForm"
import { GeneralManagerForm } from "@/components/admin/user/generalManagerForm"
import { UserDetails } from "@/components/admin/user//userDetails"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useAuth } from "@/context/AuthContext"
import { useLogs } from "@/context/LogContext"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export default function UserManagement() {
  const [selectedUser, setSelectedUser] = useState(null)
  const [dialogMode, setDialogMode] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [usersPerPage] = useState(10)
  const [sortOrder, setSortOrder] = useState("asc")
  const [selectedBranch, setSelectedBranch] = useState("all")
  const { branches } = useBranches()
  const { addLog } = useLogs()
  const { users, fetchUsers, deleteUser, deleteManager, loading, triggerSync, syncStatus, isOnline, userDetails } = useAuth()

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      // Only fetch if there are no users yet AND branches have loaded
      if (isMounted && users.length === 0 && branches.length > 0) {
        await fetchUsers();
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [branches.length, users.length, fetchUsers]);
  
  const filteredAndSortedUsers = useMemo(() => {
;    return users
      .filter(
        (user) =>
          (selectedBranch === "all" || user.branchId === selectedBranch || user.role === "General-Manager") &&
          (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())),
      )
      .sort((a, b) => {
        if (sortOrder === "asc") {
          return a.name?.localeCompare(b.name) || 0
        } else {
          return b.name?.localeCompare(a.name) || 0
        }
      })
  }, [users, selectedBranch, searchTerm, sortOrder])

  const indexOfLastUser = currentPage * usersPerPage
  const indexOfFirstUser = indexOfLastUser - usersPerPage
  const currentUsers = filteredAndSortedUsers.slice(indexOfFirstUser, indexOfLastUser)

  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  const handleDeleteUser = async (userId, isGeneralManager, userName) => {
    if (!confirm("Are you sure you want to delete this user?")) return
    try {
      if (isGeneralManager) {
        await deleteManager(userId)
      } else {
        await deleteUser(userId)
      }

      addLog({
        action: "delete-user",
        message: `Deleted ${isGeneralManager ? "General Manager" : "user"} with name: ${userName}`,
        metadata: { userId: userId, deletedBy: userDetails?.fullname, role: userDetails?.role },
      })

      toast({
        title: "Success",
        description: `User ${userName} has been deleted successfully`,
      })
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      })
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

  const renderLoadingSkeleton = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Branch</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(5)].map((_, index) => (
          <TableRow key={index}>
            <TableCell>
              <Skeleton className="h-4 w-[100px]" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-[150px]" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-[80px]" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-[150px]" />
            </TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">Manage users and general managers</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={triggerSync}
                  disabled={loading || !isOnline}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
                  Sync Data
                  {getSyncStatusBadge()}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sync users with the remote database</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Dialog open={dialogMode === "createUser"} onOpenChange={(open) => setDialogMode(open ? "createUser" : null)}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <UserForm
                mode="create"
                onSuccess={() => {
                  fetchUsers()
                  setDialogMode(null)
                }}
                onCancel={() => setDialogMode(null)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={dialogMode === "createGM"} onOpenChange={(open) => setDialogMode(open ? "createGM" : null)}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Add General Manager
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New General Manager</DialogTitle>
              </DialogHeader>
              <GeneralManagerForm
                mode="create"
                onSuccess={() => {
                  fetchUsers()
                  setDialogMode(null)
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select a branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.branchName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="w-full sm:w-auto"
            >
              Sort by Name
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            renderLoadingSkeleton()
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          No users found. Try adjusting your search or filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === "General-Manager" ? "default" : "secondary"}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.branchName || "All Branches"}</TableCell>
                          <TableCell>
                            <div className="flex justify-end space-x-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setSelectedUser(user)
                                        setDialogMode("view")
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View user details</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setSelectedUser(user)
                                        setDialogMode(user.role === "General-Manager" ? "editGM" : "editUser")
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Edit user</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                      onClick={() =>
                                        handleDeleteUser(user.id, user.role === "General-Manager", user.name)
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete user</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {filteredAndSortedUsers.length > usersPerPage && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} />
                    </PaginationItem>
                    {[...Array(Math.ceil(filteredAndSortedUsers.length / usersPerPage))].map((_, index) => (
                      <PaginationItem key={index}>
                        <PaginationLink onClick={() => paginate(index + 1)} isActive={currentPage === index + 1}>
                          {index + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === Math.ceil(filteredAndSortedUsers.length / usersPerPage)}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogMode === "view"} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && <UserDetails user={selectedUser} />}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode === "editUser"} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <UserForm
              mode="edit"
              initialData={selectedUser}
              onSuccess={() => {
                fetchUsers()
                setDialogMode(null)
              }}
              onCancel={() => setDialogMode(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode === "editGM"} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit General Manager</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <GeneralManagerForm
              mode="edit"
              initialData={selectedUser}
              onSuccess={() => {
                fetchUsers()
                setDialogMode(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

