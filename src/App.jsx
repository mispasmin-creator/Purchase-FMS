"use client";
import React, { useState, useEffect, useCallback } from "react";
import Dashboard from "./components/Dashboard";
import IndentForm from "./components/IndentForm";
import StockApproval from "./components/StockApproval";
import GeneratePO from "./components/generate-po";
import TallyEntry from "./components/tally-entry";
import LiftMaterial from "./components/lift-material";
import ReceiptCheck from "./components/receipt-check";
import LabTesting from "./components/lab-testing";
import FinalTallyEntry from "./components/final-tally-entry";
import LoginForm from "./components/LoginForm";
import AppHeader from "./components/AppHeader";
import RactifyMistake from "./components/Ractify-mistake";
import AuditData from "./components/Audit-data";
import RactifyMistake2 from "./components/Ractify-mistake2";
import TakeEntryTallyPage from "./components/Take-entryby-tally";
import AgainAuditingPage from "./components/Again-for-auditing";
import OriginalBillsFiledPage from "./components/Originals-billto-fill";
import TolrancePage from "./components/Tolrance";
import Mismatch from "./components/Mis-match";

import { useAuth } from "./context/AuthContext";
import BiltyPage from "./components/BiltyPage";
import FullkittingTransportingPage from "./components/FullkittingTransportingPage";
import Accounts from "./components/Accounts";
import KycPage from "./components/KycPage";
import VendorPaymentPage from "./components/VendorPaymentPage";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  LayoutDashboard, FilePlus, PackageCheck, FileText, Calculator,
  Truck, CheckSquare, TestTube, Archive, Menu, X, Receipt, PackageSearch,
  UserCheck, Wallet, Landmark, User, Database, 
  FileEdit, Search, FileCheck, RotateCcw, Save, Edit2, Gauge, Loader2, Scale, AlertTriangle 
} from 'lucide-react';
import { Toaster } from "@/components/ui/sonner";

function App() {
  const { isAuthenticated, allowedSteps } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // State for notification counts
  const [notificationCounts, setNotificationCounts] = useState({
    stock: 0,
    "generate-po": 0,
    "tally-entry": 0,
    "lift-material": 0,
    "receipt-check": 0,
    "lab-testing": 0,
    mismatch: 0,
    "rectify-mistake": 0,
    "audit-data": 0,
    "original-bills": 0, // Add this line
    "take-entry-tally": 0,
    bilty: 0,
    fullkitting: 0,
  });
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Function to fetch notification counts from Google Sheets
  const fetchNotificationCounts = useCallback(async () => {
    setLoadingNotifications(true);
    try {
      // This is a placeholder function - you'll need to implement actual API calls
      // For each component, you should create a function that queries Google Sheets
      // and returns the count of pending items
      
      // Example structure:
      const counts = {
        stock: await getPendingStockApprovals(),
        "generate-po": await getPendingPOs(),
        "tally-entry": await getPendingTallyEntries(),
        "lift-material": await getPendingLifts(),
        "receipt-check": await getPendingReceipts(),
        "lab-testing": await getPendingLabTests(),
        "mismatch": await getPendingMismatches(), // This now counts all 3 mismatch types
        "rectify-mistake": await getPendingRectifications(),
        "audit-data": await getPendingAudits(),
        "original-bills": await getPendingOriginalBills(), // Add this line
        "take-entry-tally": await getPendingTallyEntries2(),
        bilty: await getPendingBilties(),
        fullkitting: await getPendingFullkitting(),
      };
      
      setNotificationCounts(counts);
    } catch (error) {
      console.error("Error fetching notification counts:", error);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  // Fetch notification counts on mount and periodically
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotificationCounts();
      
      // Refresh counts every 2 minutes
      const interval = setInterval(fetchNotificationCounts, 120000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchNotificationCounts]);

  const toggleDesktopSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Updated allTabs with notification configurations
  const allTabs = [
    { 
      id: "dashboard", 
      label: "Dashboard", 
      icon: <LayoutDashboard size={20} />, 
      stepName: "Dashboard",
      showNotification: false 
    },
    { 
      id: "indent", 
      label: "Indent", 
      icon: <FilePlus size={20} />, 
      stepName: "Generate Indent",
      showNotification: false 
    },
    { 
      id: "stock", 
      label: "Management Approval", 
      icon: <PackageCheck size={20} />, 
      stepName: "Recheck the Stock And Approve Quantity",
      showNotification: true,
      countKey: "stock",
      countLabel: "Pending"
    },
    { 
      id: "generate-po", 
      label: " Make PO", 
      icon: <FileText size={20} />, 
      stepName: "Generate Purchase Order",
      showNotification: true,
      countKey: "generate-po",
      countLabel: "Pending"
    },
    { 
      id: "tally-entry", 
      label: "PO Entry", 
      icon: <Calculator size={20} />, 
      stepName: "Purchase Order Entry In Tally",
      showNotification: true,
      countKey: "tally-entry",
      countLabel: "Pending"
    },
    { 
      id: "lift-material", 
      label: "Lift", 
      icon: <Truck size={20} />, 
      stepName: "Lift The Material",
      showNotification: true,
      countKey: "lift-material",
      countLabel: "Pending"
    },
    { 
      id: "receipt-check", 
      label: "Receipt", 
      icon: <CheckSquare size={20} />, 
      stepName: "Receipt Of Material / Physical Quality Check",
      showNotification: true,
      countKey: "receipt-check",
      countLabel: "Pending"
    },
    { 
      id: "lab-testing", 
      label: "Lab", 
      icon: <TestTube size={20} />, 
      stepName: "Lab Testing - Is The Quality Good?",
      showNotification: true,
      countKey: "lab-testing",
      countLabel: "Pending"
    },
    { 
      id: "bilty", 
      label: "Bilty", 
      icon: <Receipt size={20} />, 
      stepName: "Bilty",
      showNotification: true,
      countKey: "bilty",
      countLabel: "Pending"
    },
    { 
      id: "fullkitting", 
      label: "Fullkitting", 
      icon: <PackageSearch size={20} />, 
      stepName: "Fullkitting",
      showNotification: true,
      countKey: "fullkitting",
      countLabel: "Pending"
    },
    { 
      id: "mismatch", 
      label: "Mismatch", 
      icon: <AlertTriangle size={20} />, 
      stepName: "mismatch",
      showNotification: true,
      countKey: "mismatch",
      countLabel: "Issues"
    },
     { 
      id: "audit-data", 
      label: "Audit Data", 
      icon: <Search size={20} />, 
      stepName: "accounts",
      showNotification: true,
      countKey: "audit-data",
      countLabel: "Pending"
    },
    { 
      id: "rectify-mistake", 
      label: "Rectify & Bilty", 
      icon: <FileEdit size={20} />, 
      stepName: "accounts",
      showNotification: true,
      countKey: "rectify-mistake",
      countLabel: "To Fix"
    },
   
    { 
      id: "take-entry-tally", 
      label: "Tally Entry", 
      icon: <Calculator size={20} />, 
      stepName: "accounts",
      showNotification: true,
      countKey: "take-entry-tally",
      countLabel: "Pending"
    },
    { 
      id: "original-bills", 
      label: "Bills Filing", 
      icon: <Archive size={20} />, 
      stepName: "accounts",
      showNotification: true, 
    },
  ];

  const accessibleTabs = allTabs.filter(tab =>
    tab.id === "dashboard" ||
    allowedSteps.includes("admin") ||
    allowedSteps.includes(tab.stepName?.toLowerCase())
  );

  useEffect(() => {
    if (!activeTab || !accessibleTabs.some(tab => tab.id === activeTab)) {
      setActiveTab("dashboard");
    }
  }, [accessibleTabs, activeTab]);

  // Helper function to render notification badge
  const renderNotificationBadge = (tab) => {
    if (!tab.showNotification || !notificationCounts[tab.countKey] || notificationCounts[tab.countKey] === 0) {
      return null;
    }
    
    const count = notificationCounts[tab.countKey];
    return (
      <div className="ml-auto flex items-center justify-center">
        <div className="relative">
          <div className="h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
            {count > 99 ? '99+' : count}
          </div>
          {loadingNotifications && (
            <div className="absolute inset-0 rounded-full border-2 border-red-500 border-t-transparent animate-spin"></div>
          )}
        </div>
      </div>
    );
  };

  const renderSidebarContent = (isMobile = false) => (
    <>
      <ScrollArea className={`${isMobile ? 'h-[calc(100vh-4rem)]' : 'h-[calc(100vh-4rem)]'} flex-1`}>
        <nav className="space-y-1 p-2 pb-20">
          {accessibleTabs.map((tab) => (
            <Button
              key={tab.id}
              className={`w-full justify-start h-12 relative group rounded-lg transition-all duration-200 ease-in-out
                        ${isMobile ? 'px-4' : (isSidebarOpen ? 'pl-4' : 'justify-center')}
                        ${activeTab === tab.id
                          ? "bg-purple-600 text-white shadow-md"
                          : "bg-white text-gray-700 hover:bg-purple-50 hover:text-gray-900"
                        }`}
              onClick={() => {
                setActiveTab(tab.id);
                if (isMobile) setIsMobileSidebarOpen(false);
              }}
              title={tab.label}
            >
              <span className={`transition-colors duration-150 ease-in-out
                              ${activeTab === tab.id ? 'text-white' : 'text-gray-600 group-hover:text-gray-900'}`}>
                {tab.icon}
              </span>
              
              {(isMobile || isSidebarOpen) && (
                <div className="ml-3 text-base font-medium flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate mr-2">{tab.label}</span>
                  {renderNotificationBadge(tab)}
                </div>
              )}
              
              {!isMobile && !isSidebarOpen && activeTab === tab.id && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-purple-600 rounded-r-full"></span>
              )}
              
              {!isMobile && !isSidebarOpen && tab.showNotification && notificationCounts[tab.countKey] > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-[8px] text-white font-bold">
                    {notificationCounts[tab.countKey] > 9 ? '9+' : notificationCounts[tab.countKey]}
                  </span>
                </span>
              )}
            </Button>
          ))}
        </nav>
      </ScrollArea>
      
      {!isMobile && isSidebarOpen && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 text-center bg-white">
          <p className="text-sm text-gray-500 font-semibold">Powered By</p>
          <a className="text-base font-bold bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent" href="https://www.botivate.in/">Botivate</a>
        </div>
      )}
    </>
  );

  const renderContent = () => {
    if (!accessibleTabs.some(tab => tab.id === activeTab)) {
      return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center text-gray-500">
          <X size={48} className="text-red-400 mb-4" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="mt-2">You do not have permission to view this section.</p>
          <Button onClick={() => setActiveTab("dashboard")} className="mt-4">Go to Dashboard</Button>
        </div>
      );
    }
    
    switch (activeTab) {
      case "dashboard": return <Dashboard />;
      case "indent": return <IndentForm />;
      case "stock": return <StockApproval />;
      case "generate-po": return <GeneratePO />;
      case "tally-entry": return <TallyEntry />;
      case "lift-material": return <LiftMaterial />;
      case "receipt-check": return <ReceiptCheck />;
      case "lab-testing": return <LabTesting />;
      case "final-tally-entry": return <FinalTallyEntry />;
      case "bilty": return <BiltyPage />;
      case "fullkitting": return <FullkittingTransportingPage />;
      case "rectify-mistake": return <RactifyMistake />;
      case "audit-data": return <AuditData />;
      case "rectify-mistake-2": return <RactifyMistake2 />;
      case "take-entry-tally": return <TakeEntryTallyPage />;
      case "again-auditing": return <AgainAuditingPage />;
      case "original-bills": return <OriginalBillsFiledPage />;
      case "tolrance": return <TolrancePage />;
      case "mismatch": return <Mismatch />;
      case "kyc": return <KycPage />;
      case "vendor-payment": return <VendorPaymentPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex bg-white shadow-lg transition-all duration-300 ease-in-out flex-col flex-shrink-0 relative ${
          isSidebarOpen ? "w-64" : "w-20"
        }`}
      >
        {/* Header */}
        <div
          className={`h-16 flex items-center border-b border-gray-200 flex-shrink-0 z-10 bg-white ${
            isSidebarOpen ? "px-4 justify-start" : "px-0 justify-center"
          }`}
        >
          {isSidebarOpen ? (
            <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Purchase Management
            </span>
          ) : (
            <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              P
            </span>
          )}
        </div>
        {/* Sidebar Content */}
        <div className="flex-1 relative">
          {renderSidebarContent(false)}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader
          toggleDesktopSidebar={toggleDesktopSidebar}
          isSidebarOpen={isSidebarOpen}
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 flex flex-col w-60 relative">
          {/* Mobile Header */}
          <div className="h-16 flex items-center border-b border-gray-200 px-4 justify-start flex-shrink-0 bg-white z-10">
            <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Purchase Management
            </span>
          </div>
          {/* Mobile Sidebar Content */}
          <div className="flex-1">
            {renderSidebarContent(true)}
          </div>
        </SheetContent>
      </Sheet>

      <Toaster />
    </div>
  );
}

export default App;

// Placeholder functions for notification counts - You need to implement these based on your Google Sheets data
async function getPendingStockApprovals() {
  try {
    const sheetId = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
    const sheetName = "INDENT-PO";
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
      sheetName,
    )}&cb=${new Date().getTime()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Invalid response format from Google Sheets");
    }
    
    const jsonString = text.substring(jsonStart, jsonEnd + 1);
    const data = JSON.parse(jsonString);
    
    if (!data.table || !data.table.rows) {
      return 0;
    }
    
    // Column indices (0-based):
    // Column L (11) - Planned 1 timestamp
    // Column M (12) - Actual 1 timestamp
    let pendingCount = 0;
    
    data.table.rows.forEach((row) => {
      const colL = row.c?.[11]?.v; // Planned 1
      const colM = row.c?.[12]?.v; // Actual 1
      
      // Check if Column L has value but Column M is empty/null
      if (colL && (!colM || colM.toString().trim() === "")) {
        pendingCount++;
      }
    });
    
    return pendingCount;
    
  } catch (error) {
    console.error("Error fetching pending stock approvals:", error);
    return 0;
  }
}

async function getPendingPOs() {
  try {
    const sheetId = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
    const sheetName = "INDENT-PO";
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
      sheetName,
    )}&cb=${new Date().getTime()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Invalid response format from Google Sheets");
    }
    
    const jsonString = text.substring(jsonStart, jsonEnd + 1);
    const data = JSON.parse(jsonString);
    
    if (!data.table || !data.table.rows) {
      return 0;
    }
    
    
    let pendingCount = 0;
    
    data.table.rows.forEach((row) => {
      const planned = row.c?.[17]?.v || row.c?.[17]?.f;  // Column R (index 17)
      const poTimestamp = row.c?.[18]?.v || row.c?.[18]?.f; // Column S (index 18)
      const haveToPO = row.c?.[20]?.v || row.c?.[20]?.f; // Column U (index 20)
      
      // Check if planned has value but poTimestamp is empty
      // Also check if haveToPO is not "no" (if you want to exclude cases where PO is intentionally not made)
      if (planned && 
          (!poTimestamp || poTimestamp.toString().trim() === "") && 
          haveToPO !== "no") {
        pendingCount++;
      }
    });
    
    console.log(`Found ${pendingCount} pending POs`);
    return pendingCount;
    
  } catch (error) {
    console.error("Error fetching pending POs:", error);
    return 0;
  }
}

async function getPendingTallyEntries() {
  try {
    const sheetId = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
    const sheetName = "INDENT-PO";
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
      sheetName,
    )}&cb=${new Date().getTime()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Invalid response format from Google Sheets");
    }
    
    const jsonString = text.substring(jsonStart, jsonEnd + 1);
    const data = JSON.parse(jsonString);
    
    if (!data.table || !data.table.rows) {
      return 0;
    }
    

    
    let pendingCount = 0;
    
    data.table.rows.forEach((row) => {
      // Get the cell values
      const getStringValue = (colIndex) => {
        const cell = row.c?.[colIndex];
        if (cell && (cell.v !== undefined && cell.v !== null)) {
          return String(cell.f ?? cell.v).trim();
        }
        return "";
      };
      
      const deliveryOrderNo = getStringValue(36); // Column AJ
      const tallyEntryTimestamp = getStringValue(37); // Column AK
      
      // Match the exact filter logic from your component:
      // hasDeliveryOrder && !hasTallyTimestamp
      const hasDeliveryOrder = deliveryOrderNo !== "";
      const hasTallyTimestamp = tallyEntryTimestamp !== "";
      
      if (hasDeliveryOrder && !hasTallyTimestamp) {
        pendingCount++;
      }
    });
    
    console.log(`Found ${pendingCount} pending tally entries`);
    return pendingCount;
    
  } catch (error) {
    console.error("Error fetching pending tally entries:", error);
    return 0;
  }
}

async function getPendingLifts() {
  try {
    const sheetId = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
    const sheetName = "INDENT-PO";
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
      sheetName,
    )}&cb=${new Date().getTime()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Invalid response format from Google Sheets");
    }
    
    const jsonString = text.substring(jsonStart, jsonEnd + 1);
    const data = JSON.parse(jsonString);
    
    if (!data.table || !data.table.rows) {
      return 0;
    }
    
    // Based on your LiftMaterial component logic:
    // Column indices (0-based):
    // Column AN (39) - Planned (col39)
    // Column AO (40) - Lifted On Timestamp (col40)
    
    let pendingCount = 0;
    
    // Skip the header row (if applicable)
    const rows = data.table.rows.slice(1); // Skip first row if it's header
    
    rows.forEach((row) => {
      // Get the cell values
      const getStringValue = (colIndex) => {
        const cell = row.c?.[colIndex];
        if (cell && (cell.v !== undefined && cell.v !== null)) {
          return String(cell.f ?? cell.v).trim();
        }
        return "";
      };
      
      const planned = getStringValue(39); // Column AN
      const liftedTimestamp = getStringValue(40); // Column AO
      
      // Match the exact filter logic from your component:
      // planned is not empty AND liftedTimestamp is empty
      if (planned !== "" && liftedTimestamp === "") {
        pendingCount++;
      }
    });
    
    console.log(`Found ${pendingCount} pending lifts (AN filled, AO empty)`);
    return pendingCount;
    
  } catch (error) {
    console.error("Error fetching pending lifts:", error);
    return 0;
  }
}

async function getPendingReceipts() {
  try {
    const sheetId = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
    const sheetName = "LIFT-ACCOUNTS";
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
      sheetName,
    )}&cb=${new Date().getTime()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Invalid response format from Google Sheets");
    }
    
    const jsonString = text.substring(jsonStart, jsonEnd + 1);
    const data = JSON.parse(jsonString);
    
    if (!data.table || !data.table.rows) {
      return 0;
    }
    
    // Column indices (0-based):
    // Column T (19) - Planned (col19)
    // Column U (20) - Actual Timestamp (col20)
    // Column BD (55) - Firm Name
    
    let pendingCount = 0;
    const rows = data.table.rows;
    
    // Function to get cell value
    const getStringValue = (row, colIndex) => {
      const cell = row.c?.[colIndex];
      if (cell && (cell.v !== undefined && cell.v !== null)) {
        return String(cell.f ?? cell.v).trim();
      }
      return "";
    };
    
    rows.forEach((row) => {
      const planned = getStringValue(row, 19); // Column T
      const actualTimestamp = getStringValue(row, 20); // Column U
      
      // Match the exact filter logic from your component:
      // planned has value AND actualTimestamp is empty
      if (planned !== "" && actualTimestamp === "") {
        pendingCount++;
      }
    });
    
    console.log(`Found ${pendingCount} pending receipts (T filled, U empty)`);
    return pendingCount;
    
  } catch (error) {
    console.error("Error fetching pending receipts:", error);
    return 0;
  }
}


async function getPendingLabTests() {
  try {
    const sheetId = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
    const sheetName = "LIFT-ACCOUNTS";
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
      sheetName,
    )}&cb=${new Date().getTime()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Invalid response format from Google Sheets");
    }
    
    const jsonString = text.substring(jsonStart, jsonEnd + 1);
    const data = JSON.parse(jsonString);
    
    if (!data.table || !data.table.rows) {
      return 0;
    }
    
    
    
    let pendingCount = 0;
    const rows = data.table.rows;
    
    // Function to get cell value
    const getStringValue = (row, colIndex) => {
      const cell = row.c?.[colIndex];
      if (cell && (cell.v !== undefined && cell.v !== null)) {
        return String(cell.f ?? cell.v).trim();
      }
      return "";
    };
    
    rows.forEach((row) => {
      const aiValue = getStringValue(row, 34); // Column AI
      const ajValue = getStringValue(row, 35); // Column AJ
      
      // Match the exact filter logic from your component:
      // AI has value AND AJ is empty
      if (aiValue !== "" && ajValue === "") {
        pendingCount++;
      }
    });
    
    console.log(`Found ${pendingCount} pending lab tests (AI filled, AJ empty)`);
    return pendingCount;
    
  } catch (error) {
    console.error("Error fetching pending lab tests:", error);
    return 0;
  }
}


async function getPendingRectifications() {
  try {
    const sheetId = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
    const sheetName = "ACCOUNTS";
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
      sheetName,
    )}&cb=${new Date().getTime()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    
    let text = await response.text();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Invalid response format from Google Sheets");
    }
    
    const jsonString = text.substring(jsonStart, jsonEnd + 1);
    const data = JSON.parse(jsonString);
    
    if (!data.table || !data.table.rows) {
      return 0;
    }

    let pendingCount = 0;
    const rows = data.table.rows;
    
    // Helper function to get cell value
    const getCellValue = (row, colIndex) => {
      const cell = row.c?.[colIndex];
      if (!cell) return null;
      if (cell.v !== undefined && cell.v !== null) return String(cell.v).trim();
      return null;
    };
    
    rows.forEach((row, index) => {
      if (!row || !row.c) return;
      
      const firstCellValue = getCellValue(row, 0);
      const secondCellValue = getCellValue(row, 1);
      
      // Skip header rows and empty rows (same logic as your component)
      if (firstCellValue === 'Timestamp' || 
          firstCellValue === 'Rectify The Mistake & Bilty Add' ||
          secondCellValue === 'Lift Number' ||
          !firstCellValue || firstCellValue === '') {
        return;
      }
      
      // Check if column V (index 21) is empty (Actual column)
      const actualValue = getCellValue(row, 21);
      
      // If actual column is empty, count as pending
      if (!actualValue || actualValue === '') {
        pendingCount++;
      }
    });
    
    console.log(`Found ${pendingCount} pending rectifications (Column V empty)`);
    return pendingCount;
    
  } catch (error) {
    console.error("Error fetching pending rectifications:", error);
    return 0;
  }
}

async function getPendingAudits() {
  try {
    const sheetId = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
    const sheetName = "ACCOUNTS";
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
      sheetName,
    )}&cb=${new Date().getTime()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    
    let text = await response.text();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Invalid response format from Google Sheets");
    }
    
    const jsonString = text.substring(jsonStart, jsonEnd + 1);
    const data = JSON.parse(jsonString);
    
    if (!data.table || !data.table.rows) {
      return 0;
    }

    let pendingCount = 0;
    const rows = data.table.rows;
    
    // Helper function to get cell value
    const getCellValue = (row, colIndex) => {
      const cell = row.c?.[colIndex];
      if (!cell) return null;
      if (cell.v !== undefined && cell.v !== null) return String(cell.v).trim();
      return null;
    };
    
    rows.forEach((row, index) => {
      if (!row || !row.c) return;
      
      const firstCellValue = getCellValue(row, 0);
      const secondCellValue = getCellValue(row, 1);
      
      // Skip header rows and empty rows (same logic as your component)
      if (firstCellValue === 'Timestamp' || 
          firstCellValue === 'Rectify The Mistake & Bilty Add' ||
          secondCellValue === 'Lift Number' ||
          !firstCellValue || firstCellValue === '') {
        return;
      }
      
      // Check conditions from your component:
      // 1. Column Z (index 25) has data
      const columnZValue = getCellValue(row, 25); // Column Z
      
      // 2. Column AA (index 26) is empty
      const columnAAValue = getCellValue(row, 26); // Column AA
      
      // 3. Column V (index 21) has data (Total Freight column)
      const totalFreightValue = getCellValue(row, 21); // Column V
      
      // Count if: Column Z has data AND Column AA is empty AND Column V has data
      if (columnZValue && columnZValue !== '' && 
          (!columnAAValue || columnAAValue === '') &&
          totalFreightValue && totalFreightValue !== '') {
        pendingCount++;
      }
    });
    
    console.log(`Found ${pendingCount} pending audits (Column Z filled, Column AA empty, Column V filled)`);
    return pendingCount;
    
  } catch (error) {
    console.error("Error fetching pending audits:", error);
    return 0;
  }
}

async function getPendingTallyEntries2() {
  try {
    const sheetId = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
    const sheetName = "ACCOUNTS";
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
      sheetName,
    )}&cb=${new Date().getTime()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    
    let text = await response.text();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Invalid response format from Google Sheets");
    }
    
    const jsonString = text.substring(jsonStart, jsonEnd + 1);
    const data = JSON.parse(jsonString);
    
    if (!data.table || !data.table.rows) {
      return 0;
    }

    let pendingCount = 0;
    const rows = data.table.rows;
    
    // Helper function to get cell value
    const getCellValue = (row, colIndex) => {
      const cell = row.c?.[colIndex];
      if (!cell) return null;
      if (cell.v !== undefined && cell.v !== null) return String(cell.v).trim();
      return null;
    };
    
    rows.forEach((row, index) => {
      if (!row || !row.c) return;
      
      const firstCellValue = getCellValue(row, 0);
      const secondCellValue = getCellValue(row, 1);
      
      // Skip header rows and empty rows (same logic as your component)
      if (firstCellValue === 'Timestamp' || 
          firstCellValue === 'Rectify The Mistake & Bilty Add' ||
          secondCellValue === 'Lift Number' ||
          !firstCellValue || firstCellValue === '') {
        return;
      }
      
      // Check conditions from your component:
      // 1. Column AJ (index 35) has data (not empty)
      const ajValue = getCellValue(row, 35); // Column AJ
      
      // 2. Column AK (index 36) is empty
      const akValue = getCellValue(row, 36); // Column AK
      
      // Count if: Column AJ has data AND Column AK is empty
      if (ajValue && ajValue !== '' && (!akValue || akValue === '')) {
        pendingCount++;
      }
    });
    
    console.log(`Found ${pendingCount} pending tally entries (Column AJ filled, Column AK empty)`);
    return pendingCount;
    
  } catch (error) {
    console.error("Error fetching pending tally entries:", error);
    return 0;
  }
}

async function getPendingOriginalBills() {
  try {
    const sheetId = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
    const sheetName = "ACCOUNTS";
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
      sheetName,
    )}&cb=${new Date().getTime()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    
    let text = await response.text();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Invalid response format from Google Sheets");
    }
    
    const jsonString = text.substring(jsonStart, jsonEnd + 1);
    const data = JSON.parse(jsonString);
    
    if (!data.table || !data.table.rows) {
      return 0;
    }

    let pendingCount = 0;
    const rows = data.table.rows;
    
    // Helper function to get cell value
    const getCellValue = (row, colIndex) => {
      const cell = row.c?.[colIndex];
      if (!cell) return null;
      if (cell.v !== undefined && cell.v !== null) return String(cell.v).trim();
      return null;
    };
    
    rows.forEach((row, index) => {
      if (!row || !row.c) return;
      
      const firstCellValue = getCellValue(row, 0);
      const secondCellValue = getCellValue(row, 1);
      
      // Skip header rows and empty rows (same logic as your component)
      if (firstCellValue === 'Timestamp' || 
          firstCellValue === 'Rectify The Mistake & Bilty Add' ||
          secondCellValue === 'Lift Number' ||
          !firstCellValue || firstCellValue === '') {
        return;
      }
      
      // Check conditions from your component:
      // 1. Column AT (index 45) has data
      const columnATValue = getCellValue(row, 45); // Column AT
      
      // 2. Column AU (index 46) is empty
      const columnAUValue = getCellValue(row, 46); // Column AU
      
      // Count if: Column AT has data AND Column AU is empty
      if (columnATValue && columnATValue !== '' && (!columnAUValue || columnAUValue === '')) {
        pendingCount++;
      }
    });
    
    console.log(`Found ${pendingCount} pending original bills (Column AT filled, Column AU empty)`);
    return pendingCount;
    
  } catch (error) {
    console.error("Error fetching pending original bills:", error);
    return 0;
  }
}
async function getPendingBilties() {
  try {
    const sheetId = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
    const sheetName = "LIFT-ACCOUNTS";
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
      sheetName,
    )}&cb=${new Date().getTime()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Invalid response format from Google Sheets");
    }
    
    const jsonString = text.substring(jsonStart, jsonEnd + 1);
    const data = JSON.parse(jsonString);
    
    if (!data.table || !data.table.rows) {
      return 0;
    }
     
    let pendingCount = 0;
    const rows = data.table.rows;
    
    // Function to get cell value
    const getStringValue = (row, colIndex) => {
      const cell = row.c?.[colIndex];
      if (cell && (cell.v !== undefined && cell.v !== null)) {
        return String(cell.f ?? cell.v).trim();
      }
      return "";
    };
    
    rows.forEach((row) => {
      const planned2 = getStringValue(row, 29); // Column AD
      const actual2 = getStringValue(row, 30); // Column AE
      
      // Match the exact filter logic from your component:
      // Column AD has value AND Column AE is empty
      if (planned2 !== "" && actual2 === "") {
        pendingCount++;
      }
    });
    
    console.log(`Found ${pendingCount} pending bilties (AD filled, AE empty)`);
    return pendingCount;
    
  } catch (error) {
    console.error("Error fetching pending bilties:", error);
    return 0;
  }
}

// Add these functions to your existing notification functions

async function getPendingMismatches() {
  try {
    // Fetch all required data
    const [lifts, pos, tlData] = await Promise.all([
      getLiftAccountsData(),
      getPurchaseOrdersData(),
      getTLData()
    ]);

    // Count rate mismatches
    const rateMismatchCount = countRateMismatches(lifts, pos);
    
    // Count quantity mismatches  
    const quantityMismatchCount = countQuantityMismatches(lifts);
    
    // Count material property mismatches
    const materialMismatchCount = countMaterialMismatches(lifts, tlData, pos);

    // Return total or individual counts based on your needs
    return rateMismatchCount + quantityMismatchCount + materialMismatchCount;
    
  } catch (error) {
    console.error("Error fetching pending mismatches:", error);
    return 0;
  }
}

// Helper function to fetch LIFT-ACCOUNTS data
async function getLiftAccountsData() {
  const SHEET_ID = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
  const LIFT_ACCOUNTS_SHEET = "LIFT-ACCOUNTS";
  
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(LIFT_ACCOUNTS_SHEET)}&cb=${new Date().getTime()}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch lifts data: ${response.status}`);
  
  const text = await response.text();
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) throw new Error("Invalid response format");
  
  const jsonString = text.substring(jsonStart, jsonEnd + 1);
  const data = JSON.parse(jsonString);
  
  if (!data.table || !data.table.cols) return [];
  if (!data.table.rows) data.table.rows = [];

  return data.table.rows.map((row, index) => {
    if (!row || !row.c) return null;
    
    const getStringValue = (colIndex) => {
      const cell = row.c?.[colIndex];
      if (cell && cell.v !== undefined && cell.v !== null) {
        return String(cell.v).trim();
      }
      return "";
    };

    return {
      id: getStringValue(1), // col1 - Lift ID
      indentNo: getStringValue(2), // col2 - Indent Number
      vendorName: getStringValue(3),
      material: getStringValue(5),
      rawMaterialName: getStringValue(5),
      materialRate: parseFloat(getStringValue(16)) || 0, // col16 - Rate (Lift)
      liftedQty: parseFloat(getStringValue(9)) || 0, // col9 - Lifting Qty
      actualQuantityY: parseFloat(getStringValue(24)) || 0, // col24 - Actual Quantity
      liftAlumina: parseFloat(getStringValue(42)) || 0, // col42 - Alumina % (Lift)
      liftIron: parseFloat(getStringValue(43)) || 0, // col43 - Iron % (Lift)
      liftAP: parseFloat(getStringValue(41)) || 0, // col41 - AP % (Lift)
      firmName: getStringValue(56), // col56 - Firm Name
      createdAt: getStringValue(0)
    };
  }).filter(row => row !== null && row.id && row.id.trim() !== "");
}

// Helper function to fetch INDENT-PO data
async function getPurchaseOrdersData() {
  const SHEET_ID = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
  const INDENT_PO_SHEET = "INDENT-PO";
  
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(INDENT_PO_SHEET)}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch PO data: ${response.status}`);
  
  const text = await response.text();
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  const jsonString = text.substring(jsonStart, jsonEnd + 1);
  const data = JSON.parse(jsonString);
  
  if (!data.table || !data.table.rows) return [];
  
  return data.table.rows.slice(1).map(row => {
    if (!row.c) return null;
    
    const getStringValue = (colIndex) => {
      const cell = row.c?.[colIndex];
      if (cell && cell.v !== undefined && cell.v !== null) {
        return String(cell.v).trim();
      }
      return "";
    };

    return {
      indentNo: getStringValue(1), // col1 - Indent Id
      poRate: parseFloat(getStringValue(21)) || 0, // col21 - Rate (PO)
      poAluminaPercent: parseFloat(getStringValue(30)) || 0, // col30 - Alumina % (PO)
      poIronPercent: parseFloat(getStringValue(31)) || 0, // col31 - Iron % (PO)
      firmName: getStringValue(2) // col2 - Firm Name
    };
  }).filter(row => row !== null && row.indentNo && row.indentNo.trim() !== "");
}

// Helper function to fetch TL data
async function getTLData() {
  const SHEET_ID = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
  const TL_SHEET = "TL";
  
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(TL_SHEET)}&cb=${new Date().getTime()}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch TL data: ${response.status}`);
  
  const text = await response.text();
  const parseGvizResponse = (text, sheetName) => {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error(`Invalid response format for ${sheetName}`);
    }
    const jsonString = text.substring(jsonStart, jsonEnd + 1);
    return JSON.parse(jsonString).table;
  };
  
  const dataTable = parseGvizResponse(text, TL_SHEET);
  
  return dataTable.rows.map(row => {
    if (!row.c) return null;
    
    const getStringValue = (colIndex) => {
      const cell = row.c?.[colIndex];
      if (cell && cell.v !== undefined && cell.v !== null) {
        return String(cell.v).trim();
      }
      return "";
    };

    return {
      rawMaterial: getStringValue(1),
      alumina: parseFloat(getStringValue(2)) || 0,
      iron: parseFloat(getStringValue(3)) || 0,
      ap: parseFloat(getStringValue(4)) || 0
    };
  }).filter(row => row !== null && row.rawMaterial && row.rawMaterial.trim() !== "");
}

// Function to count rate mismatches
function countRateMismatches(lifts, pos) {
  let count = 0;
  
  lifts.forEach(lift => {
    if (!lift.materialRate || lift.materialRate <= 0) return;
    
    const correspondingPO = pos.find(po => po.indentNo === lift.indentNo);
    if (!correspondingPO || !correspondingPO.poRate || correspondingPO.poRate <= 0) return;
    
    const rateDifference = Math.abs(lift.materialRate - correspondingPO.poRate);
    
    // Condition: Rate difference >= 0.01
    if (rateDifference >= 0.01) {
      count++;
    }
  });
  
  return count;
}

// Function to count quantity mismatches
function countQuantityMismatches(lifts) {
  let count = 0;
  
  lifts.forEach(lift => {
    if (!lift.liftedQty || lift.liftedQty <= 0 || !lift.actualQuantityY || lift.actualQuantityY <= 0) return;
    
    const qtyDifference = Math.abs(lift.liftedQty - lift.actualQuantityY);
    
    // Condition: Quantity difference >= 0.01
    if (qtyDifference >= 0.01) {
      count++;
    }
  });
  
  return count;
}

// Function to count material property mismatches
function countMaterialMismatches(lifts, tlData, pos) {
  let count = 0;
  
  lifts.forEach(lift => {
    if (!lift.material || !lift.liftAlumina && !lift.liftIron && !lift.liftAP) return;
    
    const correspondingTL = tlData.find(tl => 
      tl.rawMaterial && lift.material && 
      tl.rawMaterial.toLowerCase().trim() === lift.material.toLowerCase().trim()
    );
    
    if (!correspondingTL) return;

    const tlAlumina = correspondingTL.alumina || 0;
    const liftAlumina = lift.liftAlumina || 0;
    const tlIron = correspondingTL.iron || 0;
    const liftIron = lift.liftIron || 0;
    const tlAP = correspondingTL.ap || 0;
    const liftAP = lift.liftAP || 0;

    const aluminaMismatch = Math.abs(tlAlumina - liftAlumina) >= 0.01;
    const ironMismatch = Math.abs(tlIron - liftIron) >= 0.01;
    const apMismatch = Math.abs(tlAP - liftAP) >= 0.01;

    // Condition: Any mismatch exists AND at least one value is > 0
    if ((aluminaMismatch || ironMismatch || apMismatch) && 
        (tlAlumina > 0 || liftAlumina > 0 || tlIron > 0 || liftIron > 0 || tlAP > 0 || liftAP > 0)) {
      count++;
    }
  });
  
  return count;
}

// OPTIONAL: If you want separate counts for each mismatch type in your badge
async function getMismatchBreakdown() {
  try {
    const [lifts, pos, tlData] = await Promise.all([
      getLiftAccountsData(),
      getPurchaseOrdersData(),
      getTLData()
    ]);

    return {
      rateMismatchCount: countRateMismatches(lifts, pos),
      quantityMismatchCount: countQuantityMismatches(lifts),
      materialMismatchCount: countMaterialMismatches(lifts, tlData, pos)
    };
    
  } catch (error) {
    console.error("Error fetching mismatch breakdown:", error);
    return {
      rateMismatchCount: 0,
      quantityMismatchCount: 0,
      materialMismatchCount: 0
    };
  }
}
async function getPendingFullkitting() {
  try {
    const sheetId = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
    const sheetName = "Freight full kittingg";
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
      sheetName,
    )}&cb=${new Date().getTime()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Invalid response format from Google Sheets");
    }
    
    const jsonString = text.substring(jsonStart, jsonEnd + 1);
    const data = JSON.parse(jsonString);
    
    if (!data.table || !data.table.rows) {
      return 0;
    }
    
    // Column indices (0-based):
    // Column W (22) - Planned (Condition column 1)
    // Column X (23) - Actual (Condition column 2)
    // Column B (1) - Firm Name
    
    let pendingCount = 0;
    const rows = data.table.rows;
    
    // Function to get cell value
    const getStringValue = (row, colIndex) => {
      const cell = row.c?.[colIndex];
      if (cell && (cell.v !== undefined && cell.v !== null)) {
        return String(cell.f ?? cell.v).trim();
      }
      return "";
    };
    
    rows.forEach((row) => {
      const planned = getStringValue(row, 22); // Column W
      const actual = getStringValue(row, 23); // Column X
      
      // Match the exact filter logic from your component:
      // Column W has value AND Column X is empty
      // Also check if planned is not null (which your component does)
      if (planned !== "" && actual === "") {
        pendingCount++;
      }
    });
    
    console.log(`Found ${pendingCount} pending fullkitting (W filled, X empty)`);
    return pendingCount;
    
  } catch (error) {
    console.error("Error fetching pending fullkitting:", error);
    return 0;
  }
}