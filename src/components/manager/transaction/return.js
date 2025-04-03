
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { useReturns } from '@/context/manager/ReturnContext';
import { useAuth } from '@/context/AuthContext';
import { useLogs } from '@/context/manager/LogContext';
import { useTransactions } from '@/context/TransactionContext';

export function ReturnForm({ transactionId, items, setDialogOpen }) {
  const { processReturn } = useReturns();
  const { userDetails } = useAuth();
  const { addLog } = useLogs();
  const { fetchTransactions } = useTransactions();
  const [returnItems, setReturnItems] = useState(items.map(item => ({
    ...item,
    returnQuantity: 0
  })));
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleQuantityChange = (id, quantity) => {
    setReturnItems(prev => prev.map(item => {
      if (item.id === id) {
        const parsedQuantity = item.stockManagementType === 'weight' 
          ? parseFloat(quantity)
          : parseInt(quantity);
        return { 
          ...item, 
          returnQuantity: Math.min(Math.max(0, parsedQuantity || 0), item.quantitySold) 
        };
      }
      return item;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!transactionId) {
      toast({
        title: "Error",
        description: "No transaction selected.",
        variant: "destructive",
      });
      return;
    }

    const itemsToReturn = returnItems.filter(item => item.returnQuantity > 0);

    if (itemsToReturn.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item to return.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await processReturn(
        userDetails?.branchId,
        transactionId,
        itemsToReturn.map(item => ({
          id: item.id,
          name: item.name,
          returnQuantity: item.returnQuantity
        })),
        reason
      );
      
      addLog({
        action: "return-items",
        message: `Returned items: ${itemsToReturn.map(item => item.name).join(', ')}`,
        metadata: { 
          transactionId, 
          returnedBy: userDetails.name, 
          role: userDetails.role 
        },
      });

      toast({
        title: "Return Processed",
        description: "The return has been successfully processed.",
      });

      setReturnItems(items.map(item => ({ ...item, returnQuantity: 0 })));
      setReason('');

      fetchTransactions();
      setDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to process return",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Process Return</CardTitle>
        <CardDescription>Select items and quantities to return</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          {returnItems.map(item => (
            <div key={item.id} className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {item.name}
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <Input
                  type="number"
                  min="0"
                  max={item.quantitySold}
                  step={item.stockManagementType === 'weight' ? '0.001' : '1'}
                  value={item.returnQuantity}
                  onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                  className="flex-1 rounded-none rounded-l-md"
                />
                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  / {item.quantitySold} {item.stockManagementType === 'weight' ? 'kg' : 'items'}
                </span>
              </div>
            </div>
          ))}
          <Textarea
            placeholder="Reason for return (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-4"
          />
          <CardFooter className="mt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Return...
                </>
              ) : (
                "Submit Return"
              )}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}