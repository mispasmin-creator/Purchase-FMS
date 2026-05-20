import React from 'react';
import AuditTable from '../AuditTable';

const HistoryTab = (props) => {
  return <AuditTable {...props} activeTab="HISTORY" />;
};

export default HistoryTab;
