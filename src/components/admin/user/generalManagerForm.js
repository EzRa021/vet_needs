"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { toast } from "@/hooks/use-toast"
import { useLogs } from "@/context/LogContext"
import { useAuth } from "@/context/AuthContext"
import { Shield } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

// Schema reduced to match backend expectations
const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z
    .string()
    .email()
    .refine((email) => email.includes("@") && email.endsWith(".com"), {
      message: "Email must be a valid address ending with .com",
    }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }).optional(),
})

export function GeneralManagerForm({ initialData = {}, mode = "create", onSuccess }) {
  const { addLog } = useLogs()
  const { userDetails, createManager, updateManager } = useAuth()
  const [loading, setLoading] = useState(false)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData.name || "",
      email: initialData.email || "",
      ...(mode === "create" && { password: "" }),
    },
  })

  const onSubmit = async (values) => {
    try {
      setLoading(true)

      // Data structure strictly matching backend expectations
      const userData = {
        id: initialData.id,
        name: values.name,
        email: values.email,
        ...(mode === "create" && { password: values.password }),
        role: "General-Manager",
      }

      if (mode === "create") {
        await createManager(userData)
        toast({
          title: "Success",
          description: "General Manager created successfully",
        })
      } else {
        await updateManager(userData)
        toast({
          title: "Success",
          description: "General Manager updated successfully",
        })
      }

      addLog({
        action: mode === "create" ? "create-general-manager" : "update-general-manager",
        message: `General Manager ${mode === "create" ? "created" : "updated"} successfully`,
        metadata: {
          userId: mode === "create" ? null : initialData.id,
          userName: values.name,
          createdBy: mode === "create" ? userDetails?.fullname : undefined,
          updatedBy: mode === "update" ? userDetails?.fullname : undefined,
        },
      })

      if (onSuccess) onSuccess()
    } catch (err) {
      console.error("Error in GeneralManagerForm:", err)
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
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">
            {mode === "create" ? "Create New General Manager" : "Update General Manager"}
          </h3>
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
              <Button type="button" variant="outline" onClick={() => onSuccess()}>
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

