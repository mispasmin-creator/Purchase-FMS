"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Navigate, Route, Routes, Link } from "react-router-dom";
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
import DebitNote from "./components/Debit-note";

import { useAuth } from "./context/AuthContext";
import { useNotification } from "./context/NotificationContext"; // Import hook
import { supabase } from "./supabase";
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
  const { user, isAuthenticated, allowedSteps } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // State for notification counts
  const { notificationCounts, loadingNotifications } = useNotification(); // Use context state

  // Router hooks
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Notification fetching is now handled by NotificationProvider

  const toggleDesktopSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Updated allTabs with notification configurations AND paths
  const allTabs = [
    {
      id: "dashboard",
      label: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard size={20} />,
      stepName: "Dashboard",
      showNotification: false,
      component: <Dashboard />
    },
    {
      id: "indent",
      label: "Indent",
      path: "/indent",
      icon: <FilePlus size={20} />,
      stepName: "Generate Indent",
      showNotification: false,
      component: <IndentForm />
    },
    {
      id: "stock",
      label: "Management Approval",
      path: "/management-approval",
      icon: <PackageCheck size={20} />,
      stepName: "Recheck the Stock And Approve Quantity",
      showNotification: true,
      countKey: "stock",
      countLabel: "Pending",
      component: <StockApproval />
    },
    {
      id: "generate-po",
      label: " Make PO",
      path: "/make-po",
      icon: <FileText size={20} />,
      stepName: "Generate Purchase Order",
      showNotification: true,
      countKey: "generate-po",
      countLabel: "Pending",
      component: <GeneratePO />
    },
    {
      id: "tally-entry",
      label: "PO Entry",
      path: "/po-entry",
      icon: <Calculator size={20} />,
      stepName: "Purchase Order Entry In Tally",
      showNotification: true,
      countKey: "tally-entry",
      countLabel: "Pending",
      component: <TallyEntry />
    },
    {
      id: "original-bills",
      label: "Advance Payement",
      path: "/advance-payement",
      icon: <Archive size={20} />,
      countKey: "original-bills",  // ✅ Make sure this matches
      stepName: "accounts",
      showNotification: true,
      component: <OriginalBillsFiledPage />
    },
    {
      id: "lift-material",
      label: "Lift",
      path: "/lift",
      icon: <Truck size={20} />,
      stepName: "Lift The Material",
      showNotification: true,
      countKey: "lift-material",
      countLabel: "Pending",
      component: <LiftMaterial />
    },
    {
      id: "receipt-check",
      label: "Receipt",
      path: "/receipt",
      icon: <CheckSquare size={20} />,
      stepName: "Receipt Of Material / Physical Quality Check",
      showNotification: true,
      countKey: "receipt-check",
      countLabel: "Pending",
      component: <ReceiptCheck />
    },
    {
      id: "lab-testing",
      label: "Lab",
      path: "/lab",
      icon: <TestTube size={20} />,
      stepName: "Lab Testing - Is The Quality Good?",
      showNotification: true,
      countKey: "lab-testing",
      countLabel: "Pending",
      component: <LabTesting />
    },
    {
      id: "bilty",
      label: "Bilty",
      path: "/bilty",
      icon: <Receipt size={20} />,
      stepName: "Bilty",
      showNotification: true,
      countKey: "bilty",
      countLabel: "Pending",
      component: <BiltyPage />
    },
    {
      id: "fullkitting",
      label: "Fullkitting",
      path: "/fullkitting",
      icon: <PackageSearch size={20} />,
      stepName: "Fullkitting",
      showNotification: true,
      countKey: "fullkitting",
      countLabel: "Pending",
      component: <FullkittingTransportingPage />
    },
    {
      id: "mismatch",
      label: "Mismatch",
      path: "/mismatch",
      icon: <AlertTriangle size={20} />,
      stepName: "mismatch",
      showNotification: true,
      countKey: "mismatch",
      countLabel: "Issues",
      component: <Mismatch />
    },
    {
      id: "debit-note",
      label: "Debit Note",
      path: "/debit-note",
      icon: <FileText size={20} />,
      stepName: "Debit Note",
      showNotification: true,
      countKey: "debit-note",
      countLabel: "Pending",
      component: <DebitNote />
    },
    {
      id: "audit-data",
      label: "Accounts Audit",
      path: "/accounts-audit",
      icon: <Search size={20} />,
      stepName: "accounts",
      showNotification: true,
      countKey: "audit-data",
      countLabel: "Pending",
      component: <AuditData />
    },
    {
      id: "rectify-mistake",
      label: "Rectify Mistake",
      path: "/rectify-mistake",
      // Not in sidebar explicitly in original code but has a component import
      icon: <FileEdit size={20} />, // Placeholder icon
      stepName: "rectify-mistake", // Guessing step name or using generic
      showNotification: false,
      component: <RactifyMistake />,
      hidden: true // Mark as hidden from sidebar if not originally there but needed for routing
    },
    {
      id: "final-tally-entry",
      label: "Final Tally Entry",
      path: "/final-tally-entry",
      icon: <Calculator size={20} />,
      stepName: "accounts", // Guessing
      showNotification: false,
      component: <FinalTallyEntry />,
      hidden: true
    },
    {
      id: "rectify-mistake-2",
      label: "Rectify Mistake 2",
      path: "/rectify-mistake-2",
      icon: <FileEdit size={20} />,
      stepName: "rectify-mistake",
      showNotification: false,
      component: <RactifyMistake2 />,
      hidden: true
    },
    {
      id: "take-entry-tally",
      label: "Take Entry Tally",
      path: "/take-entry-tally",
      icon: <Calculator size={20} />,
      stepName: "accounts",
      showNotification: false,
      component: <TakeEntryTallyPage />,
      hidden: true
    },
    {
      id: "again-auditing",
      label: "Again Auditing",
      path: "/again-auditing",
      icon: <Search size={20} />,
      stepName: "accounts",
      showNotification: false,
      component: <AgainAuditingPage />,
      hidden: true
    },
    {
      id: "tolerance",
      label: "Tolerance",
      path: "/tolrance", // Keeping original typo in switch case if intentional, or fixing it. Original switch had "tolrance".
      icon: <Scale size={20} />,
      stepName: "accounts",
      showNotification: false,
      component: <TolrancePage />,
      hidden: true
    },
    {
      id: "kyc",
      label: "KYC",
      path: "/kyc",
      icon: <UserCheck size={20} />,
      stepName: "accounts",
      showNotification: false,
      component: <KycPage />,
      hidden: true
    },
    {
      id: "vendor-payment",
      label: "Vendor Payment",
      path: "/vendor-payment",
      icon: <Wallet size={20} />,
      stepName: "accounts",
      showNotification: false,
      component: <VendorPaymentPage />,
      hidden: true
    }
  ];

  const accessibleTabs = allTabs.filter(tab => {
    // Always show dashboard
    if (tab.id === "dashboard") return !tab.hidden;

    // If admin, show all
    if (allowedSteps.includes("admin")) return !tab.hidden;

    // Check if tab label or stepName matches any allowedSteps (case-insensitive)
    const tabLabel = tab.label?.toLowerCase().trim();
    const tabStepName = tab.stepName?.toLowerCase().trim();

    return allowedSteps.some(step => {
      const stepLower = step.toLowerCase().trim();
      return stepLower === tabLabel || stepLower === tabStepName;
    }) && !tab.hidden;
  });

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
        <nav className="space-y-1 p-2 pr-3 pb-20">
          {accessibleTabs.map((tab) => {
            const isActive = location.pathname === tab.path || (tab.path === '/dashboard' && location.pathname === '/');
            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={`w-full flex items-center h-12 relative group rounded-lg transition-all duration-200 ease-in-out text-sm font-medium no-underline
                        ${isMobile ? 'px-4' : (isSidebarOpen ? 'pl-4' : 'justify-center')}
                        ${isActive
                    ? "bg-purple-600 text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-purple-50 hover:text-gray-900"
                  }`}
                onClick={() => {
                  if (isMobile) setIsMobileSidebarOpen(false);
                }}
                title={tab.label}
              >
                <span className={`transition-colors duration-150 ease-in-out flex-shrink-0
                              ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-gray-900'}`}>
                  {tab.icon}
                </span>

                {(isMobile || isSidebarOpen) && (
                  <div className="ml-3 flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate mr-2">{tab.label}</span>
                    {renderNotificationBadge(tab)}
                  </div>
                )}

                {!isMobile && !isSidebarOpen && isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-purple-600 rounded-r-full"></span>
                )}

                {!isMobile && !isSidebarOpen && tab.showNotification && notificationCounts[tab.countKey] > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-[8px] text-white font-bold">
                      {notificationCounts[tab.countKey] > 9 ? '9+' : notificationCounts[tab.countKey]}
                    </span>
                  </span>
                )}
              </Link>
            )
          })}
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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex bg-white shadow-lg transition-all duration-300 ease-in-out flex-col flex-shrink-0 relative ${isSidebarOpen ? "w-80" : "w-20"
          }`}
      >
        {/* Header */}
        <div
          className={`h-16 flex items-center border-b border-gray-200 flex-shrink-0 z-10 bg-white ${isSidebarOpen ? "px-4 justify-start" : "px-0 justify-center"
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
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            {allTabs.map(tab => (
              <Route
                key={tab.id}
                path={tab.path}
                element={
                  // Check access control - same logic as sidebar filtering
                  (tab.id === "dashboard" ||
                    allowedSteps.includes("admin") ||
                    allowedSteps.some(step => {
                      const stepLower = step.toLowerCase().trim();
                      const tabLabel = tab.label?.toLowerCase().trim();
                      const tabStepName = tab.stepName?.toLowerCase().trim();
                      return stepLower === tabLabel || stepLower === tabStepName;
                    }))
                    ? tab.component
                    : <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center text-gray-500">
                      <X size={48} className="text-red-400 mb-4" />
                      <h2 className="text-2xl font-bold">Access Denied</h2>
                      <p className="mt-2">You do not have permission to view this section.</p>
                      <Button onClick={() => navigate("/dashboard")} className="mt-4">Go to Dashboard</Button>
                    </div>
                }
              />
            ))}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
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

// Helper functions (getPending*...) have been moved to NotificationContext.jsx


async function getPendingMismatches() {
  try {
    const [lifts, pos, tlData] = await Promise.all([
      getLiftAccountsData(),
      getPurchaseOrdersData(),
      getTLData()
    ]);

    const rateMismatchCount = countRateMismatches(lifts, pos);
    const quantityMismatchCount = countQuantityMismatches(lifts);
    const materialMismatchCount = countMaterialMismatches(lifts, tlData, pos);

    return rateMismatchCount + quantityMismatchCount + materialMismatchCount;

  } catch (error) {
    console.error("Error fetching pending mismatches:", error);
    return 0;
  }
}

async function getLiftAccountsData() {
  const SHEET_ID = "13_sHCFkVxAzPbel-k9BuUBFY-E11vdKJAOgvzhBMLMY";
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

  return data.table.rows.map((row) => {
    if (!row || !row.c) return null;

    const getStringValue = (colIndex) => {
      const cell = row.c?.[colIndex];
      if (cell && cell.v !== undefined && cell.v !== null) {
        return String(cell.v).trim();
      }
      return "";
    };

    return {
      id: getStringValue(1),
      indentNo: getStringValue(2),
      vendorName: getStringValue(3),
      material: getStringValue(5),
      materialRate: parseFloat(getStringValue(16)) || 0,
      liftedQty: parseFloat(getStringValue(9)) || 0,
      actualQuantityY: parseFloat(getStringValue(24)) || 0,
      liftAlumina: parseFloat(getStringValue(42)) || 0,
      liftIron: parseFloat(getStringValue(43)) || 0,
      liftAP: parseFloat(getStringValue(41)) || 0,
      firmName: getStringValue(56),
      createdAt: getStringValue(0)
    };
  }).filter(row => row !== null && row.id && row.id.trim() !== "");
}

async function getPurchaseOrdersData() {
  const SHEET_ID = "13_sHCFkVxAzPbel-k9BuUBFY-E11vdKJAOgvzhBMLMY";
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
      indentNo: getStringValue(1),
      poRate: parseFloat(getStringValue(21)) || 0,
      poAluminaPercent: parseFloat(getStringValue(30)) || 0,
      poIronPercent: parseFloat(getStringValue(31)) || 0,
      firmName: getStringValue(2)
    };
  }).filter(row => row !== null && row.indentNo && row.indentNo.trim() !== "");
}

async function getTLData() {
  const SHEET_ID = "13_sHCFkVxAzPbel-k9BuUBFY-E11vdKJAOgvzhBMLMY";
  const TL_SHEET = "TL";

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(TL_SHEET)}&cb=${new Date().getTime()}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch TL data: ${response.status}`);

  const text = await response.text();
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) throw new Error("Invalid response format");
  const jsonString = text.substring(jsonStart, jsonEnd + 1);
  const dataTable = JSON.parse(jsonString).table;

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

function countRateMismatches(lifts, pos) {
  let count = 0;
  lifts.forEach(lift => {
    if (!lift.materialRate || lift.materialRate <= 0) return;
    const correspondingPO = pos.find(po => po.indentNo === lift.indentNo);
    if (!correspondingPO || !correspondingPO.poRate || correspondingPO.poRate <= 0) return;
    const rateDifference = Math.abs(lift.materialRate - correspondingPO.poRate);
    if (rateDifference >= 0.01) count++;
  });
  return count;
}

function countQuantityMismatches(lifts) {
  let count = 0;
  lifts.forEach(lift => {
    if (!lift.liftedQty || lift.liftedQty <= 0 || !lift.actualQuantityY || lift.actualQuantityY <= 0) return;
    const qtyDifference = Math.abs(lift.liftedQty - lift.actualQuantityY);
    if (qtyDifference >= 0.01) count++;
  });
  return count;
}

function countMaterialMismatches(lifts, tlData, pos) {
  let count = 0;
  lifts.forEach(lift => {
    if (!lift.material) return;
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

    if ((aluminaMismatch || ironMismatch || apMismatch) &&
      (tlAlumina > 0 || liftAlumina > 0 || tlIron > 0 || liftIron > 0 || tlAP > 0 || liftAP > 0)) {
      count++;
    }
  });
  return count;
}

async function getPendingFullkitting() {
  try {
    const sheetId = "13_sHCFkVxAzPbel-k9BuUBFY-E11vdKJAOgvzhBMLMY";
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

    let pendingCount = 0;
    const rows = data.table.rows;

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
      if (planned !== "" && actual === "") {
        pendingCount++;
      }
    });

    return pendingCount;

  } catch (error) {
    console.error("Error fetching pending fullkitting:", error);
    return 0;
  }
}

