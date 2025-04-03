"use client"

import { ReturnList } from "@/components/admin/transaction/returnList";


export const dynamic = 'force-static'
export default function ReturnsPage() {
  return (
    <div className=" mx-4">
      <ReturnList />
    </div>
  );
}
