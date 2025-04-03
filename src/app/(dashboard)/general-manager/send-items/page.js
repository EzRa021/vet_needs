import React from 'react';
import ItemSenderForm from '@/components/general-manager/inventory/sendItem';

export const dynamic = 'force-static'
const SendItemsPage = () => {
  return (
    <div className=" mx-4">
      <ItemSenderForm />
    </div>
  );
};

export default SendItemsPage;
