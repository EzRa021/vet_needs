"use client";
import { BranchProvider } from '@/context/BranchContext';
import { BranchTable } from '@/components/general-manager/branch/BranchTable';
import { CreateBranchDialog } from '@/components/general-manager/branch/BranchDialog';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


export const dynamic = 'force-static'
export default function BranchesPage() {
  return (

      <Card className=" mx-4 mt-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Branch Management</CardTitle>
          <CreateBranchDialog />
        </CardHeader>
        <CardContent>
          <BranchTable />
        </CardContent>
      </Card>
  );
}