"use client"
import React, { useState, useEffect } from 'react';
import { useBranches } from '@/context/BranchContext';
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Calendar as CalendarIcon, ChevronDown, ChevronUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTransactions } from '@/context/TransactionContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const SalesSummary = () => {
  const [date, setDate] = useState(new Date());
  const [salesData, setSalesData] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [grandTotal, setGrandTotal] = useState({
    amount: 0,
    items: 0,
    quantity: 0
  });
  const { getDepartmentCategorySales } = useTransactions();
  const { activeBranch } = useBranches();

  useEffect(() => {
    const fetchSalesData = async () => {
      console.log("Fetching sales data for branch:", activeBranch?.id, "date:", date);
      const data = await getDepartmentCategorySales(activeBranch?.id, date);
      console.log("Received data:", data);
      if (data) {
        setSalesData(data);

        // Calculate grand totals
        const totals = data.reduce((acc, dept) => {
          acc.amount += dept.totalAmount || 0;
          acc.quantity += dept.totalQuantity || 0;
          acc.items += dept.categories ? Object.values(dept.categories).reduce((sum, cat) => sum + (cat.items?.length || 0), 0) : 0;
          return acc;
        }, { amount: 0, items: 0, quantity: 0 });

        setGrandTotal(totals);
      }
    };
    fetchSalesData();
  }, [activeBranch?.id, date, getDepartmentCategorySales]);
  const toggleCategory = (catId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(catId)) {
      newExpanded.delete(catId);
    } else {
      newExpanded.add(catId);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Sales Summary</CardTitle>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {format(date, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => newDate && setDate(newDate)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </CardHeader>
      <CardContent>
        {/* Grand Total Summary Card */}
        <Card className="mb-4 bg-primary/10">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-2">
              <h3 className="font-bold text-lg">Grand Total</h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 bg-background/80 px-3 py-2 rounded-md">
                  <span className="font-semibold">Total Sales:</span>
                  <span className="text-lg font-bold">₦{grandTotal.amount.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2 bg-background/80 px-3 py-2 rounded-md">
                  <span className="font-semibold">Total Items:</span>
                  <span className="text-lg font-bold">{grandTotal.items}</span>
                </div>
                <div className="flex items-center gap-2 bg-background/80 px-3 py-2 rounded-md">
                  <span className="font-semibold">Total Quantity:</span>
                  <span className="text-lg font-bold">{grandTotal.quantity}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <ScrollArea className="h-[520px] pr-4">
          <div className="space-y-6">
            {salesData.map((dept) => (
              <div key={dept.departmentId} className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-lg">{dept.departmentName}</h3>
                    <div className="flex gap-4">
                      <span className="text-sm px-2 py-1 bg-primary/10 rounded-md">
                        {dept.categories ? Object.values(dept.categories).reduce((sum, cat) => sum + (cat.items?.length || 0), 0) : 0} items
                      </span>
                      <span className="text-sm px-2 py-1 bg-primary/10 rounded-md">
                        ₦{(dept.totalAmount || 0).toFixed(2)}
                      </span>
                      <span className="text-sm px-2 py-1 bg-primary/10 rounded-md">
                        Qty: {dept.totalQuantity || 0}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {dept.categories && Object.values(dept.categories).map((category) => (
                      <Collapsible
                        key={category.categoryId}
                        open={expandedCategories.has(category.categoryId)}
                        className="border rounded-lg bg-background"
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full p-3 flex justify-between items-center"
                            onClick={() => toggleCategory(category.categoryId)}
                          >
                            <div className="flex items-center gap-4">
                              <span className="font-medium">{category.categoryName}</span>
                              <div className="flex gap-4 text-base font-bold text-green-600">
                                <span>₦{(category.totalAmount || 0).toFixed(2)}</span>
                                <span>Items: {category.items?.length || 0}</span>
                                <span>Qty: {category.totalQuantity || 0}</span>
                              </div>
                            </div>
                            {expandedCategories.has(category.categoryId) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="p-3 border-t">
                            <div className="grid gap-2">
                              {category.items && category.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="grid grid-cols-4 text-sm items-center py-1"
                                >
                                  <span className="font-medium">{item.name}</span>
                                  <span>₦{(item.sellingPrice || 0).toFixed(2)}/{item.stockManagementType === 'weight' ? 'kg' : 'unit'}</span>
                                  <span>Sold: {item.quantitySold || 0} {item.stockManagementType === 'weight' ? 'kg' : 'units'}</span>
                                  <span className="text-right">₦{(item.totalAmount || 0).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t py-3">
        <div className="w-full flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total for {format(date, "MMMM d, yyyy")}</span>
          <span className="font-bold">₦{grandTotal.amount.toFixed(2)}</span>
        </div>
      </CardFooter>
    </Card>
  );
};

export default SalesSummary;