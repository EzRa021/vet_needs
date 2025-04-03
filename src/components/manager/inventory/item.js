'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useDepartments } from '@/context/DepartmentContext';
import { useCategories } from '@/context/CategoryContext';
import { useRouter } from 'next/navigation';
import { useItems } from '@/context/ItemContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { useLogs } from '@/context/manager/LogContext';
import { useToast } from '@/hooks/use-toast';

const ItemManagementPage = () => {
  const { departments, loading: loadingDepartments, fetchDepartments, setBranchId: setDeptBranchId } = useDepartments();
  const { categories, fetchCategories } = useCategories();
  const { userDetails, fullname } = useAuth();
  const { addLog } = useLogs();
  const { addItem } = useItems();
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { toast } = useToast();
  const router = useRouter();
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [itemDetails, setItemDetails] = useState({
    id: '',
    name: '',
    description: '',
    costPrice: 0,
    expiringDate: '',
    sellingPrice: 0,
    discountPrice: 0,
    inStock: true,
    stockManagement: {
      type: 'quantity',
      quantity: 0,
      weightUnit: 'kg',
      totalWeight: 0,
    }
  });
  useEffect(() => {
    if (userDetails?.branchId) {
      // Update both Category and Department contexts with the new branchId
      setDeptBranchId(userDetails?.branchId); // Updates DepartmentContext
    }
  }, [userDetails,  setDeptBranchId]);

  useEffect(() => {
    let unsubscribe;
    const fetchCategoriesData = async () => {
      if (userDetails?.branchId && selectedDepartment?.id) {
        setLoadingCategories(true);
        try {
          unsubscribe = fetchCategories(userDetails?.branchId, selectedDepartment?.id);
        } finally {
          setLoadingCategories(false);
        }
      }
    };

    fetchCategoriesData();

   
  }, [userDetails?.branchId, selectedDepartment?.id]);

  useEffect(() => {
    setSelectedCategory(null);
  }, [selectedDepartment]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('stockManagement.')) {
      const field = name.split('.')[1];
      setItemDetails(prev => ({
        ...prev,
        stockManagement: {
          ...prev.stockManagement,
          [field]: value,
        },
      }));
    } else {
      setItemDetails(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const toggleStockManagementType = () => {
    setItemDetails(prev => ({
      ...prev,
      stockManagement: {
        ...prev.stockManagement,
        type: prev.stockManagement.type === 'quantity' ? 'weight' : 'quantity',
        quantity: 0,
        totalWeight: 0,
        weightUnit: 'kg'
      }
    }));
  };

  const validateItemData = () => {
    if (!userDetails) {
      toast({ title: "Error", description: "No active branch selected.", variant: "destructive" });
      return false;
    }

    if (!selectedDepartment) {
      toast({ title: "Error", description: "Please select a department.", variant: "destructive" });
      return false;
    }

    if (!selectedCategory) {
      toast({ title: "Error", description: "Please select a category.", variant: "destructive" });
      return false;
    }

    if (!itemDetails.id.trim()) {
      toast({ title: "Error", description: "Item ID is required.", variant: "destructive" });
      return false;
    }

    if (!itemDetails.name.trim()) {
      toast({ title: "Error", description: "Item name is required.", variant: "destructive" });
      return false;
    }

    const stockType = itemDetails.stockManagement.type;
    if (stockType === 'quantity') {
      if (!itemDetails.stockManagement.quantity || itemDetails.stockManagement.quantity <= 0) {
        toast({ title: "Error", description: "Please enter a valid quantity.", variant: "destructive" });
        return false;
      }
    } else {
      if (!itemDetails.stockManagement.totalWeight ||
        itemDetails.stockManagement.totalWeight <= 0 ||
        !itemDetails.stockManagement.weightUnit) {
        toast({ title: "Error", description: "Please enter a valid weight and unit.", variant: "destructive" });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateItemData()) return;

    setIsSubmitting(true);
    try {
      const itemData = {
        ...itemDetails,
        categoryName: selectedCategory?.name,
        departmentName: selectedDepartment?.name,
        branchName: userDetails?.branchName,
        branchId: userDetails?.branchId,
        departmentId: selectedDepartment?.id,
        categoryId: selectedCategory?.id

      };

      await addItem(itemData);

      addLog({
        action: "create-item",
        message: `Created item: ${itemDetails.name}`,
        metadata: {
          itemName: itemDetails.name,
          department: selectedDepartment.name,
          category: selectedCategory.name,
          createdBy: fullname,
          role: userDetails.role
        },
      });

      toast({
        title: "Success",
        description: 'Item created successfully!',
      });

      router.back();
    } catch (error) {
      console.error('Error creating item:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to create item.',
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setItemDetails({
      id: '',
      name: '',
      description: '',
      costPrice: 0,
      expiringDate: '',
      sellingPrice: 0,
      discountPrice: 0,
      inStock: true,
      stockManagement: {
        type: 'quantity',
        quantity: 0,
        weightUnit: 'kg',
        totalWeight: 0,
      }
    });
    setSelectedCategory(null);
    setSelectedDepartment(null);
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Item Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="department">Department</Label>
              <Select
                onValueChange={(value) => setSelectedDepartment(departments.find(dept => dept.id === value))}
                value={selectedDepartment?.id || ''}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDepartment && (
              <div>
                <Label htmlFor="category">Category</Label>
                {loadingCategories ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="animate-spin" />
                    <p>Loading categories...</p>
                  </div>
                ) : (
                  <Select
                    onValueChange={(value) =>
                      setSelectedCategory(categories.find(cat => cat.id === value))
                    }
                    value={selectedCategory?.id || ''}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="id">Item ID</Label>
              <Input
                id="id"
                name="id"
                value={itemDetails.id}
                onChange={handleInputChange}
                placeholder="Enter item ID"
                disabled={!selectedCategory}
              />
            </div>
            <div>
              <Label htmlFor="name">Item Name</Label>
              <Input
                id="name"
                name="name"
                value={itemDetails.name}
                onChange={handleInputChange}
                placeholder="Enter item name"
                disabled={!selectedCategory}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={itemDetails.description}
                onChange={handleInputChange}
                placeholder="Item description"
                rows={4}
                disabled={!selectedCategory}
              />
            </div>
            <div>
              <Label htmlFor="expiringDate">Expiring Date</Label>
              <Input
                id="expiringDate"
                name="expiringDate"
                type="date"
                value={itemDetails.expiringDate}
                onChange={handleInputChange}
                placeholder="Enter expiring date"
                disabled={!selectedCategory}
              />
            </div>

            <div className="mt-4">
              <div className="flex items-center space-x-2 mb-4">
                <Label>Stock Management Type</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleStockManagementType}
                  disabled={!selectedCategory}
                >
                  Switch to {itemDetails.stockManagement.type === 'quantity' ? 'Weight' : 'Quantity'}
                </Button>
              </div>

              {itemDetails.stockManagement.type === 'quantity' ? (
                <div>
                  <Label htmlFor="stockManagement.quantity">Quantity in Stock</Label>
                  <Input
                    id="stockManagement.quantity"
                    name="stockManagement.quantity"
                    type="number"
                    value={itemDetails.stockManagement.quantity || ''}
                    onChange={handleInputChange}
                    placeholder="Enter quantity"
                    disabled={!selectedCategory}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stockManagement.totalWeight">Total Weight</Label>
                    <Input
                      id="stockManagement.totalWeight"
                      name="stockManagement.totalWeight"
                      type="number"
                      value={itemDetails.stockManagement.totalWeight || ''}
                      onChange={handleInputChange}
                      placeholder="Total weight"
                      disabled={!selectedCategory}
                    />
                  </div>
                  <div>
                    <Label htmlFor="stockManagement.weightUnit">Weight Unit</Label>
                    <Select
                      value={itemDetails.stockManagement.weightUnit}
                      onValueChange={(value) =>
                        setItemDetails(prev => ({
                          ...prev,
                          stockManagement: {
                            ...prev.stockManagement,
                            weightUnit: value
                          }
                        }))
                      }
                      disabled={!selectedCategory}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">Kilograms (kg)</SelectItem>
                        <SelectItem value="g">Grams (g)</SelectItem>
                        <SelectItem value="lb">Pounds (lb)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
-              
              <div>
                <Label htmlFor="sellingPrice">
                  Price per {itemDetails.stockManagement.type === 'quantity' ? 'Unit' : itemDetails.stockManagement.weightUnit}
                </Label>
                <Input
                  id="sellingPrice"
                  name="sellingPrice"
                  type="number"
                  value={itemDetails.sellingPrice}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  disabled={!selectedCategory}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discountPrice">Discount Price</Label>
                <Input
                  id="discountPrice"
                  name="discountPrice"
                  type="number"
                  value={itemDetails.discountPrice}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  disabled={!selectedCategory}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="inStock"
                  checked={itemDetails.inStock}
                  onCheckedChange={(checked) =>
                    setItemDetails(prev => ({
                      ...prev,
                      inStock: checked,
                    }))
                  }
                  disabled={!selectedCategory}
                />
                <Label htmlFor="inStock">In Stock</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!selectedCategory || isSubmitting}
          className="w-full md:w-auto"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Item...
            </>
          ) : (
            'Create Item'
          )}
        </Button>
      </div>
    </div>
  );
};

export default ItemManagementPage;