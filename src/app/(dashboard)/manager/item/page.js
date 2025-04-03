'use client';

import Item from '@/components/manager/inventory/item';

export const dynamic = 'force-static'
export default function AdminItemPage() {
  return (
    <div className=" mx-4">
      <Item />
    </div>
  );
}
