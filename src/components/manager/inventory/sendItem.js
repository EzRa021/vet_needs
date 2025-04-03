'use client';

import React, { useState } from 'react';
import { useItems } from '@/context/ItemContext';
import { useBranches } from '@/context/BranchContext';
import { useDepartments } from '@/context/DepartmentContext';
import { useCategories } from '@/context/CategoryContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';



const ItemSenderForm = () => {
  const { toast } = useToast();
  const { addItem } = useItems();
  const { branches } = useBranches();
  const { departments, fetchDepartments } = useDepartments();
  const { categories, fetchCategories } = useCategories();

  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [itemsJSON, setItemsJSON] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get department and category names for reference
  const selectedDepartmentName = departments.find(d => d.id === selectedDepartment)?.name || '';
  const selectedCategoryName = categories.find(c => c.id === selectedCategory)?.name || '';

  const handleBranchChange = (branchId) => {
    setSelectedBranch(branchId);
    setSelectedDepartment('');
    setSelectedCategory('');
    fetchDepartments(branchId);
  };

  const handleDepartmentChange = (departmentId) => {
    setSelectedDepartment(departmentId);
    setSelectedCategory('');
    fetchCategories(selectedBranch, departmentId);
  };

  const handleSendItems = async () => {
    if (!selectedBranch || !selectedDepartment || !selectedCategory || !itemsJSON) {
      toast({
        title: 'Error',
        description: 'Please fill out all fields and provide valid JSON.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      const parsedItems = JSON.parse(itemsJSON);

      if (!Array.isArray(parsedItems)) {
        throw new Error('JSON data must be an array of items.');
      }

      let successCount = 0;
      for (const item of parsedItems) {
        // Ensure each item has the required fields
        if (!item.name) {
          toast({
            title: 'Warning',
            description: `Item without a name was skipped.`,
            variant: 'warning',
          });
          continue;
        }

        // Create a properly formatted item object that aligns with ItemContext requirements
        const formattedItem = {
          id: item.id, // Generate ID if not provided
          branchId: selectedBranch,
          departmentId: selectedDepartment,
          departmentName: selectedDepartmentName,
          categoryId: selectedCategory, 
          categoryName: selectedCategoryName,
          name: item.name,
          description: item.description || '',
          costPrice: parseFloat(item.costPrice || 0),
          sellingPrice: parseFloat(item.sellingPrice || 0),
          discountPrice: parseFloat(item.discountPrice || 0),
          inStock: item.inStock === undefined ? true : Boolean(item.inStock),
          stockManagement: item.stockManagement || { type: 'quantity', quantity: 0 }
        };
        
        // Now call addItem with the properly formatted object
        await addItem(formattedItem);
        successCount++;
      }

      toast({
        title: 'Success',
        description: `${successCount} items sent successfully!`,
      });
      setItemsJSON('');
    } catch (error) {
      console.error('Error sending items:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send items.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-card rounded shadow">
      <h2 className="text-xl font-bold mb-4">Send Items to a Category</h2>

      <div className="mb-4">
        <Label>Branch</Label>
        <Select
          value={selectedBranch}
          onValueChange={handleBranchChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Branch" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.branchName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-4">
        <Label>Department</Label>
        <Select
          value={selectedDepartment}
          onValueChange={handleDepartmentChange}
          disabled={!selectedBranch}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-4">
        <Label>Category</Label>
        <Select
          value={selectedCategory}
          onValueChange={setSelectedCategory}
          disabled={!selectedDepartment}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-4">
        <Label>Items (JSON Format)</Label>
        <Textarea
          value={itemsJSON}
          onChange={(e) => setItemsJSON(e.target.value)}
          placeholder='[{"name": "Item A", "description": "Description A", "costPrice": 100, "sellingPrice": 150, "inStock": true, "stockManagement": {"type": "quantity", "quantity": 10}}, {"name": "Item B", ...}]'
          rows={6}
        />
      </div>

      <Button onClick={handleSendItems} className="w-full" disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send Items'}
      </Button>
    </div>
  );
};

export default ItemSenderForm;