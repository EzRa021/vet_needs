'use client';

import React from 'react';
import UserTable from '@/components/admin/user/userManagement';

export const dynamic = 'force-static'
export default function UserManagement() {
  return (
    <div className=" m-4">
      <UserTable />
    </div>
  );
}
