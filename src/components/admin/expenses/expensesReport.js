'use client'

import React, { useState, useEffect } from 'react';
import { useExpenses } from '@/context/ExpensesContext';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { format, isValid } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useLogs } from '@/context/LogContext';
import { useAuth } from '@/context/AuthContext';
import { useBranches } from '@/context/BranchContext';

const ITEMS_PER_PAGE = 10;

// Safe date formatting function
const formatDate = (date) => {
  if (!date) return 'Invalid Date';
  const dateObj = date instanceof Date ? date : new Date(date);
  return isValid(dateObj) ? format(dateObj, 'PP') : 'Invalid Date';
};

export function ExpensesReport() {
  const { expenses, loading, error, addExpense, updateExpense, deleteExpense, fetchExpenses, branchId, setBranchId } = useExpenses();
  const { branches, activeBranch} = useBranches();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [newExpense, setNewExpense] = useState({ 
    title: '', 
    description: '', 
    amount: '', 
    category: 'salary', // Updated to match ExpensesContext naming
    date: new Date() 
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('daily');
  const [filterDate, setFilterDate] = useState(new Date());
  const [filterExpenseType, setFilterExpenseType] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'descending' }); // Updated to match property name
  const { addLog } = useLogs();
  const { userDetails, fullname } = useAuth();
  const [filteredExpenses, setFilteredExpenses] = useState([]);

  // Set branch ID from current branch when component mounts
  useEffect(() => {
    if ( activeBranch && activeBranch?.id ) {
      setBranchId(activeBranch?.id);
    }
  }, [activeBranch, setBranchId]);

  useEffect(() => {
    // Make sure we have a branch ID before fetching
    if (branchId) {
      // Call the fetch expenses function with the branch ID and date
      fetchExpenses(branchId, filterDate);
    }
  }, [branchId, filterDate, fetchExpenses]);

  // Process and filter expenses when expenses or filter changes
  useEffect(() => {
    if (expenses.length > 0) {
      let filtered = [...expenses];
      
      if (filterExpenseType !== 'all') {
        filtered = filtered.filter(expense => 
          expense.category === filterExpenseType
        );
      }
      
      // Sort the filtered expenses
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
      
      setFilteredExpenses(filtered);
      
      // Reset to page 1 when filters change
      setCurrentPage(1);
    } else {
      setFilteredExpenses([]);
    }
  }, [expenses, filterExpenseType, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE));
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleAddExpense = async () => {
    try {
      await addExpense(
        branchId,
        parseFloat(newExpense.amount),
        newExpense.category,
        newExpense.description
      );
      
      addLog({
        action: "create-expense",
        message: `Created an expense with amount: ${newExpense.amount}`,
        metadata: { title: newExpense.title, amount: newExpense.amount, createdBy: fullname, role: userDetails?.role },
      });
      
      setIsAddDialogOpen(false);
      setNewExpense({ 
        title: '', 
        description: '', 
        amount: '', 
        category: 'salary', 
        date: new Date() 
      });
    } catch (error) {
      console.error("Failed to add expense:", error);
    }
  };

  const handleUpdateExpense = async () => {
    if (selectedExpense) {
      try {
        await updateExpense(
          selectedExpense.id,
          branchId,
          parseFloat(newExpense.amount),
          newExpense.category,
          newExpense.description
        );
        
        addLog({
          action: "update-expense",
          message: `Updated an expense with amount: ${newExpense.amount}`,
          metadata: { description: newExpense.description, amount: newExpense.amount, createdBy: fullname, role: userDetails?.role },
        });
        
        setIsAddDialogOpen(false);
        setSelectedExpense(null);
        setNewExpense({ 
          title: '', 
          description: '', 
          amount: '', 
          category: 'salary', 
          date: new Date() 
        });
      } catch (error) {
        console.error("Failed to update expense:", error);
      }
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await deleteExpense(id, branchId);
      
      addLog({
        action: "delete-expense",
        message: `Deleted an expense`,
        metadata: { id: id, createdBy: fullname, role: userDetails?.role },
      });
    } catch (error) {
      console.error("Failed to delete expense:", error);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Loading expenses...</span>
    </div>
  );
  
  if (error) return (
    <div className="flex justify-center items-center h-64">
      <div className="text-red-500">Error: {error}</div>
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Expenses Report</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Expense</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{selectedExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
              <DialogDescription>
                Enter the details of the expense here. Click save when you are done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Input
                  id="description"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">Category</Label>
                <Select
                  value={newExpense.category}
                  onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select expense category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salary">Salary</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={selectedExpense ? handleUpdateExpense : handleAddExpense}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="Select filter type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <Select value={filterExpenseType} onValueChange={setFilterExpenseType}>
            <SelectTrigger>
              <SelectValue placeholder="Select expense category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="salary">Salary</SelectItem>
              <SelectItem value="repair">Repair</SelectItem>
              <SelectItem value="transport">Transport</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filterDate ? formatDate(filterDate) : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filterDate}
                onSelect={(date) => setFilterDate(date || new Date())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="bg-card rounded-lg shadow p-8 text-center">
          <p className="text-lg text-muted-foreground">No expenses found for the selected filters.</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg shadow">
          <Table>
            <TableCaption>A list of your expenses.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Description</TableHead>
                <TableHead onClick={() => requestSort('amount')} className="cursor-pointer">
                  Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </TableHead>
                <TableHead onClick={() => requestSort('category')} className="cursor-pointer">
                  Category {sortConfig.key === 'category' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </TableHead>
                <TableHead onClick={() => requestSort('createdAt')} className="cursor-pointer">
                  Date {sortConfig.key === 'createdAt' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedExpenses.map((expense, index) => (
                <TableRow key={expense.id}>
                  <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>{expense.amount.toFixed(2)}</TableCell>
                  <TableCell>{expense.category}</TableCell>
                  <TableCell>{formatDate(expense.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" className="mr-2" onClick={() => {
                      setSelectedExpense(expense);
                      setNewExpense({
                        description: expense.description,
                        amount: expense.amount.toString(),
                        category: expense.category,
                        date: new Date(expense.createdAt),
                      });
                      setIsAddDialogOpen(true);
                    }}>
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">Delete</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the expense
                            from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteExpense(expense.id)}>
                            Continue
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              />
            </PaginationItem>
            {[...Array(totalPages)].map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink 
                  onClick={() => setCurrentPage(i + 1)} 
                  isActive={currentPage === i + 1}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}