"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { useLogs } from "@/context/LogContext"
import { useAuth } from "@/context/AuthContext"
import { useBranches } from "@/context/BranchContext"
import { Card, CardContent } from "@/components/ui/card"
import { UserPlus } from "lucide-react"

// Schema for user form validation
const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z
    .string()
    .email()
    .refine((email) => email.includes("@") && email.endsWith(".com"), {
      message: "Email must be a valid address ending with .com",
    }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }).optional(),
  role: z.string().min(1, { message: "Role is required" }),
  branchId: z.string().min(1, { message: "Branch is required" }),
  phone: z.string().optional(),
})

export function UserForm({ initialData = {}, mode = "create", onSuccess, onCancel }) {
  const { addLog } = useLogs()
  const { userDetails, createUser, updateUser } = useAuth()
  const { branches } = useBranches()
  const [loading, setLoading] = useState(false)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData.name || "",
      email: initialData.email || "",
      role: initialData.role || "Cashier",
      branchId: initialData.branchId || "",
      phone: initialData.phone || "",
      ...(mode === "create" && { password: "" }),
    },
  })

  const onSubmit = async (values) => {
    try {
      setLoading(true)

      // Find branch name for the selected branch ID
      const selectedBranch = branches.find((branch) => branch.id === values.branchId)

      // Data structure matching backend expectations
      const userData = {
        id: initialData.id,
        name: values.name,
        email: values.email,
        ...(mode === "create" && { password: values.password }),
        role: values.role,
        branchId: values.branchId,
        branchName: selectedBranch?.branchName || "",
        branchLocation: selectedBranch?.location || "",
        branchPhone: selectedBranch?.phone,
      }

      if (mode === "create") {
        await createUser(userData)
        toast({
          title: "Success",
          description: "User created successfully",
        })
      } else {
        await updateUser(userData)
        toast({
          title: "Success",
          description: "User updated successfully",
        })
      }

      addLog({
        action: mode === "create" ? "create-user" : "update-user",
        message: `User ${mode === "create" ? "created" : "updated"} successfully`,
        metadata: {
          userId: mode === "create" ? null : initialData.id,
          userName: values.name,
          createdBy: mode === "create" ? userDetails?.fullname : undefined,
          updatedBy: mode === "update" ? userDetails?.fullname : undefined,
        },
      })

      if (onSuccess) onSuccess()
    } catch (err) {
      console.error("Error in UserForm:", err)
      toast({
        title: "Error",
        description: err.message || "An error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-6">
          <UserPlus className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">{mode === "create" ? "Create New User" : "Update User"}</h3>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter full name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="example@gmail.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Cashier">Cashier</SelectItem>
                        <SelectItem value="Manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a branch" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.branchName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter phone number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode === "create" && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="Enter password" />
                    </FormControl>
                    <FormDescription>Password must be at least 6 characters long</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end space-x-4 pt-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="min-w-[120px]">
                {loading ? "Processing..." : mode === "create" ? "Create" : "Update"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

