import TransactionDashboard from "@/components/admin/transaction/transaction";


import React from 'react'


export const dynamic = 'force-static'
const TransactioPage = () => {
  return (
    <div className=" mx-4">
      <TransactionDashboard />
    </div>
  );
};

export default TransactioPage