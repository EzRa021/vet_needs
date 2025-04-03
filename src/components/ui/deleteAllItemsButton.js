"use client";

import React, { useState } from "react";
import { Trash } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { useItems } from "@/context/ItemContext";

export function DeleteAllItemsButton() {
  const { deleteAllItems, items, loading } = useItems();
  const [isOpen, setIsOpen] = useState(false);

  const handleDeleteAll = async () => {
    await deleteAllItems();
    setIsOpen(false);
  };

  // If there are no items, disable the button
  if (items.length === 0) {
    return (
      <Button 
        variant="destructive" 
        size="sm" 
        disabled
        className="ml-2"
      >
        <Trash className="h-4 w-4 mr-1" />
        Delete All Items
      </Button>
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="destructive" 
          size="sm" 
          disabled={loading}
          className="ml-2"
        >
          <Trash className="h-4 w-4 mr-1" />
          Delete All Items
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete All Items</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete all {items.length} items
            from the inventory.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDeleteAll}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete All
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}