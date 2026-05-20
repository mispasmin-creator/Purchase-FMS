import React from 'react';
import AuditTable from '../AuditTable';

const BillEntryTab = (props) => {
  return <AuditTable {...props} activeTab="BILL_ENTRY" />;
};

export default BillEntryTab;
