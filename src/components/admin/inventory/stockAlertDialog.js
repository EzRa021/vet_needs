import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

const StockAlertDialog = ({
  isOpen,
  onClose,
  onConfirm,
  item,
}) => {
  if (!item) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
            Out of Stock Warning
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <div className="mt-4 rounded-lg border p-4">
              <div className="mb-3">
                <span className="font-medium text-foreground">{item.name}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Current Stock:</span>
                  <Badge variant="destructive" className="font-mono">
                    {item.stockManagement?.type === 'weight' 
                      ? `${item.stockManagement.totalWeight} ${item.stockManagement.weightUnit}`
                      : `${item.stockManagement.quantity} units`
                    }
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Category:</span>
                  <span className="font-medium">{item.categoryName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Department:</span>
                  <span className="font-medium">{item.departmentName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Price:</span>
                  <span className="font-medium">₦{item.sellingPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground">
              This item is currently out of stock. Would you like to continue with the transaction?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Continue Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default StockAlertDialog;