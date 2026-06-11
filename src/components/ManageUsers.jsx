"use client";
import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  User,
  Edit2,
  Trash2,
  Shield,
  CheckCircle2,
  XCircle,
  Search,
  Key,
  Building2,
  Lock,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Eye,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";

// List of all possible pages/permissions based on App.jsx
const ALL_PAGES = [
  "Dashboard",
  "Indent",
  "HOD Approval",
  "Three Party",
  "Factory App.",
  "Mgmt App.",
  "Make PO",
  "PO History",
  "Arrange Logistics",
  "Logistics App.",
  "PO Entry",
  "Advance Payement",
  "Lift",
  "Receipt",
  "Lab",
  "Lab Report",
  "Bilty",
  "Mismatch",
  "Purchaser Coord.",
  "Debit Note",
  "Fullkitting",
  "Accounts Audit",
  "Sale Of Raw Material",
  "Purchase Return",
  "Rectify Mistake",
  "Final Tally Entry",
  "Rectify Mistake 2",
  "Take Entry Tally",
  "Again Auditing",
  "Tolerance",
  "KYC",
  "Vendor Payment",
];

const SIDEBAR_PAGES = [
  { id: "dashboard", label: "Dashboard", stepName: "Dashboard" },
  { id: "indent", label: "Indent", stepName: "Generate Indent" },
  { id: "stock", label: "HOD Approval", stepName: "Recheck the Stock And Approve Quantity" },
  { id: "three-party", label: "Three Party", stepName: "vendor" },
  { id: "factory-approval", label: "Factory App.", stepName: "management" },
  { id: "management-approval", label: "Mgmt App.", stepName: "management" },
  { id: "generate-po", label: " Make PO", stepName: "Generate Purchase Order" },
  { id: "po-history", label: "PO History", stepName: "Generate Purchase Order" },
  { id: "arrange-logistics", label: "Arrange Logistics", stepName: "Arrange Logistics" },
  { id: "logistics-approval", label: "Logistics App.", stepName: "Logistics Approval" },
  { id: "tally-entry", label: "PO Entry", stepName: "Purchase Order Entry In Tally" },
  { id: "original-bills", label: "Advance Payement", stepName: "accounts" },
  { id: "lift-material", label: "Lift", stepName: "Lift The Material" },
  { id: "receipt-check", label: "Receipt", stepName: "Receipt Of Material / Physical Quality Check" },
  { id: "lab-testing", label: "Lab", stepName: "Lab Testing - Is The Quality Good?" },
  { id: "lab-report", label: "Lab Report", stepName: "Lab Testing - Is The Quality Good?" },
  { id: "tat-report", label: "TAT & Delay Report", stepName: "Dashboard" },
  { id: "bilty", label: "Bilty", stepName: "Bilty" },
  { id: "mismatch", label: "Mismatch", stepName: "mismatch" },
  { id: "purchaser-coordinate", label: "Purchaser Coord.", stepName: "mismatch" },
  { id: "debit-note", label: "Debit Note", stepName: "Debit Note" },
  { id: "audit-data", label: "Accounts Audit", stepName: "accounts" },
  { id: "fullkitting", label: "Fullkitting", stepName: "Fullkitting" },
  { id: "sale-of-raw-material", label: "Sale Of Raw Material", stepName: "Sale Of Raw Material" },
  { id: "purchase-return", label: "Purchase Return", stepName: "mismatch" },
  { id: "manage-users", label: "Manage Users", stepName: "admin" }
];

const getAccessibleSidebarPages = (userRecord) => {
  const rawPages = userRecord["Pages"];
  const isViewOnly = rawPages === "viewonly" || (typeof rawPages === "string" && rawPages.trim().toLowerCase() === "viewonly");
  
  let allowedSteps = [];
  if (isViewOnly) {
    allowedSteps = ["admin"];
  } else if (typeof rawPages === "string" && (rawPages.trim().toLowerCase() === "all" || rawPages.trim().toLowerCase() === "super admin" || rawPages.trim().toLowerCase() === "admin")) {
    allowedSteps = ["admin"];
  } else if (Array.isArray(rawPages)) {
    allowedSteps = rawPages.map(p => typeof p === "string" ? p.trim().toLowerCase() : String(p || "").trim().toLowerCase()).filter(Boolean);
  } else if (typeof rawPages === "string" && rawPages.trim() !== "") {
    try {
      const parsed = JSON.parse(rawPages.trim());
      if (Array.isArray(parsed)) {
        allowedSteps = parsed.map(p => typeof p === "string" ? p.trim().toLowerCase() : String(p || "").trim().toLowerCase()).filter(Boolean);
      } else if (parsed && typeof parsed === "object") {
        allowedSteps = Object.keys(parsed).map(p => p.trim().toLowerCase()).filter(Boolean);
      }
    } catch (e) {
      allowedSteps = rawPages.trim().split(",").map(p => p.trim().toLowerCase()).filter(Boolean);
    }
  }

  return SIDEBAR_PAGES.filter((tab) => {
    // Always show dashboard
    if (tab.id === "dashboard") return true;

    // View-only users cannot see Manage Users page
    if (isViewOnly && tab.id === "manage-users") return false;

    // If admin, show all
    if (allowedSteps.includes("admin")) return true;

    // Check if tab label or stepName matches any allowedSteps (case-insensitive)
    const tabLabel = tab.label?.toLowerCase().trim();
    const tabStepName = tab.stepName?.toLowerCase().trim();

    return allowedSteps.some((step) => {
      const stepLower = step.toLowerCase().trim();
      return stepLower === tabLabel || stepLower === tabStepName;
    });
  });
};

const FIRMS = ["Pmmpl", "Purab", "Rkl", "all"];

const parsePermissions = (pages) => {
  if (!pages) return [];
  if (Array.isArray(pages)) return pages;
  if (pages && typeof pages === "object") return Object.keys(pages);
  if (typeof pages !== "string") return [];

  const trimmed = pages.trim();
  if (trimmed === "") return [];
  if (trimmed.toLowerCase() === "all" || trimmed.toLowerCase() === "admin") return ["admin"];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") {
      return Object.keys(parsed);
    }
  } catch (e) {
    // Fallback for older CSV-formatted records
    return trimmed.split(",").map((p) => p.trim()).filter(Boolean);
  }
  return [];
};

const parseFirms = (firmName) => {
  if (!firmName) return [];
  if (Array.isArray(firmName)) return firmName;
  if (typeof firmName !== "string") return [];

  const trimmed = firmName.trim();
  if (trimmed === "") return [];
  if (trimmed.toLowerCase() === "all") return ["all"];
  
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    // Fallback for older records or CSV
    if (trimmed.includes(",")) {
      return trimmed.split(",").map((f) => f.trim()).filter(Boolean);
    }
    return [trimmed];
  }
  return [];
};

const syncGlobalFirms = (pageFirmsObj) => {
  const uniqueFirms = new Set();
  Object.values(pageFirmsObj).forEach((val) => {
    const firms = Array.isArray(val) ? val : (val?.firms || []);
    if (Array.isArray(firms)) {
      firms.forEach((f) => uniqueFirms.add(f));
    }
  });
  return Array.from(uniqueFirms);
};

const getPagePermissionsWithFirms = (rawPages) => {
  if (!rawPages) return [];
  
  const processEntry = (page, val) => {
    let firms = [];
    let isReadOnly = false;
    if (Array.isArray(val)) {
      firms = val;
    } else if (val && typeof val === "object") {
      firms = val.firms || [];
      isReadOnly = !!val.readOnly;
    } else {
      firms = parseFirms(val);
    }
    const firmStr = firms.length > 0 ? ` (${firms.join(", ")})` : "";
    const accessStr = isReadOnly ? " [View Only]" : "";
    return `${page}${firmStr}${accessStr}`;
  };

  if (rawPages && typeof rawPages === "object" && !Array.isArray(rawPages)) {
    return Object.entries(rawPages).map(([page, val]) => processEntry(page, val));
  }

  const parsedPermissions = parsePermissions(rawPages);
  
  if (typeof rawPages === "string") {
    try {
      const parsed = JSON.parse(rawPages.trim());
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return Object.entries(parsed).map(([page, val]) => processEntry(page, val));
      }
    } catch (e) {
      // Fallback
    }
  }
  return parsedPermissions;
};


export default function ManageUsers() {
  const { user: currentUser, allowedSteps, isReadOnly } = useAuth();
  const isAdmin = allowedSteps?.includes("admin") && !isReadOnly;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageSearch, setPageSearch] = useState("");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [sidebarPageFilter, setSidebarPageFilter] = useState("all");

  // Form State
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    firmName: [],
    permissions: [],
    pageFirms: {},
    isViewOnly: false,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("Login")
        .select("*")
        .order("User Name", { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddDialog = () => {
    setEditingUser(null);
    setPageSearch("");
    setFormData({
      username: "",
      password: "",
      name: "",
      firmName: [],
      permissions: [],
      pageFirms: {},
      isViewOnly: false,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (user) => {
    setEditingUser(user);
    setPageSearch("");
    const rawPages = user["Pages"];
    const isViewOnly = rawPages === "viewonly" ||
      (typeof rawPages === "string" && rawPages.trim().toLowerCase() === "viewonly");
    
    let pageFirms = {};
    let userPermissions = [];

    const expandAll = (firms) => {
      return firms.includes("all") ? ["Pmmpl", "Purab", "Rkl"] : firms;
    };

    if (isViewOnly) {
      // viewonly users
    } else if (typeof rawPages === "string" && (rawPages.trim().toLowerCase() === "all" || rawPages.trim().toLowerCase() === "super admin")) {
      userPermissions = ["admin"];
    } else if (rawPages) {
      if (Array.isArray(rawPages)) {
        const globalFirms = expandAll(parseFirms(user["Firm Name"]));
        rawPages.forEach((page) => {
          pageFirms[page] = { firms: globalFirms, readOnly: false };
        });
        userPermissions = rawPages;
      } else if (typeof rawPages === "object") {
        pageFirms = {};
        Object.entries(rawPages).forEach(([page, val]) => {
          let firms = [];
          let isReadOnly = false;
          if (Array.isArray(val)) {
            firms = val;
          } else if (val && typeof val === "object") {
            firms = val.firms || [];
            isReadOnly = !!val.readOnly;
          } else {
            firms = parseFirms(val);
          }
          pageFirms[page] = { firms: expandAll(firms), readOnly: isReadOnly };
        });
        userPermissions = Object.keys(rawPages);
      } else if (typeof rawPages === "string") {
        const trimmed = rawPages.trim();
        if (trimmed !== "") {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              const globalFirms = expandAll(parseFirms(user["Firm Name"]));
              parsed.forEach((page) => {
                pageFirms[page] = { firms: globalFirms, readOnly: false };
              });
              userPermissions = parsed;
            } else if (parsed && typeof parsed === "object") {
              pageFirms = {};
              Object.entries(parsed).forEach(([page, val]) => {
                let firms = [];
                let isReadOnly = false;
                if (Array.isArray(val)) {
                  firms = val;
                } else if (val && typeof val === "object") {
                  firms = val.firms || [];
                  isReadOnly = !!val.readOnly;
                } else {
                  firms = parseFirms(val);
                }
                pageFirms[page] = { firms: expandAll(firms), readOnly: isReadOnly };
              });
              userPermissions = Object.keys(parsed);
            }
          } catch (e) {
            const globalFirms = expandAll(parseFirms(user["Firm Name"]));
            const pagesArray = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
            pagesArray.forEach((page) => {
              pageFirms[page] = { firms: globalFirms, readOnly: false };
            });
            userPermissions = pagesArray;
          }
        }
      }
    }

    setFormData({
      username: user["User Name"] || "",
      password: user["Password"] || "",
      name: user["Name"] || "",
      firmName: (isViewOnly || userPermissions.includes("admin")) ? parseFirms(user["Firm Name"]) : syncGlobalFirms(pageFirms),
      permissions: userPermissions,
      pageFirms,
      isViewOnly,
    });

    setIsDialogOpen(true);
  };

  const handleToggleViewOnly = () => {
    setFormData((prev) => ({
      ...prev,
      isViewOnly: !prev.isViewOnly,
      permissions: [],
      pageFirms: {},
    }));
  };

  const handleTogglePermission = (permission) => {
    setFormData((prev) => {
      let newPermissions;
      let newPageFirms = { ...prev.pageFirms };
      if (permission === "admin") {
        newPermissions = prev.permissions.includes("admin") ? [] : ["admin"];
        newPageFirms = {};
      } else {
        const filtered = prev.permissions.filter((p) => p !== "admin");
        if (filtered.includes(permission)) {
          newPermissions = filtered.filter((p) => p !== permission);
          delete newPageFirms[permission];
        } else {
          newPermissions = [...filtered, permission];
          newPageFirms[permission] = {
            firms: prev.firmName.length > 0 ? prev.firmName : ["Pmmpl"],
            readOnly: false
          };
        }
      }
      const newGlobalFirms = permission === "admin" ? prev.firmName : syncGlobalFirms(newPageFirms);
      return { 
        ...prev, 
        permissions: newPermissions, 
        pageFirms: newPageFirms,
        firmName: newGlobalFirms 
      };
    });
  };

  const handleToggleFirm = (firm) => {
    setFormData((prev) => {
      let newFirms;
      if (firm === "all") {
        newFirms = prev.firmName.includes("all") ? [] : ["all"];
      } else {
        const filtered = prev.firmName.filter((f) => f !== "all");
        if (filtered.includes(firm)) {
          newFirms = filtered.filter((f) => f !== firm);
        } else {
          newFirms = [...filtered, firm];
        }
      }
      return { ...prev, firmName: newFirms };
    });
  };

  const handleTogglePageFirm = (page, firm) => {
    setFormData((prev) => {
      const currentPageObj = prev.pageFirms?.[page] || { firms: [], readOnly: false };
      const currentPageFirms = currentPageObj.firms || [];
      let newPageFirms;
      if (currentPageFirms.includes(firm)) {
        newPageFirms = currentPageFirms.filter((f) => f !== firm);
      } else {
        newPageFirms = [...currentPageFirms, firm];
      }

      const updatedPageFirms = {
        ...prev.pageFirms,
        [page]: {
          firms: newPageFirms,
          readOnly: currentPageObj.readOnly
        },
      };

      if (newPageFirms.length === 0) {
        delete updatedPageFirms[page];
      }

      const newPermissions = Object.keys(updatedPageFirms);
      const newGlobalFirms = syncGlobalFirms(updatedPageFirms);

      return {
        ...prev,
        pageFirms: updatedPageFirms,
        permissions: newPermissions,
        firmName: newGlobalFirms,
      };
    });
  };

  const handleToggleColumnFirm = (firm, checked) => {
    setFormData((prev) => {
      const updatedPageFirms = { ...prev.pageFirms };
      const activePages = ALL_PAGES.filter(p => p.toLowerCase().includes(pageSearch.toLowerCase()));
      
      activePages.forEach((page) => {
        const currentPageObj = updatedPageFirms[page] || { firms: [], readOnly: false };
        const currentPageFirms = currentPageObj.firms || [];
        if (checked) {
          if (!currentPageFirms.includes(firm)) {
            updatedPageFirms[page] = {
              firms: [...currentPageFirms, firm],
              readOnly: currentPageObj.readOnly
            };
          }
        } else {
          updatedPageFirms[page] = {
            firms: currentPageFirms.filter((f) => f !== firm),
            readOnly: currentPageObj.readOnly
          };
        }

        if (updatedPageFirms[page] && updatedPageFirms[page].firms.length === 0) {
          delete updatedPageFirms[page];
        }
      });

      const newPermissions = Object.keys(updatedPageFirms);
      const newGlobalFirms = syncGlobalFirms(updatedPageFirms);

      return {
        ...prev,
        pageFirms: updatedPageFirms,
        permissions: newPermissions,
        firmName: newGlobalFirms,
      };
    });
  };

  const handleToggleRowAll = (page, checked) => {
    setFormData((prev) => {
      const updatedPageFirms = { ...prev.pageFirms };
      if (checked) {
        const currentReadOnly = updatedPageFirms[page]?.readOnly || false;
        updatedPageFirms[page] = {
          firms: ["Pmmpl", "Purab", "Rkl"],
          readOnly: currentReadOnly
        };
      } else {
        delete updatedPageFirms[page];
      }

      const newPermissions = Object.keys(updatedPageFirms);
      const newGlobalFirms = syncGlobalFirms(updatedPageFirms);

      return {
        ...prev,
        pageFirms: updatedPageFirms,
        permissions: newPermissions,
        firmName: newGlobalFirms,
      };
    });
  };

  const handleTogglePageAccessLevel = (page, readOnly) => {
    setFormData((prev) => {
      if (!prev.pageFirms?.[page]) return prev;
      
      const updatedPageFirms = {
        ...prev.pageFirms,
        [page]: {
          ...prev.pageFirms[page],
          readOnly: readOnly
        }
      };
      
      return {
        ...prev,
        pageFirms: updatedPageFirms
      };
    });
  };

  const isFirmCheckedForAllPages = (firm) => {
    const activePages = ALL_PAGES.filter(p => p.toLowerCase().includes(pageSearch.toLowerCase()));
    if (activePages.length === 0) return false;
    return activePages.every((page) => {
      const pageObj = formData.pageFirms?.[page];
      const firms = pageObj ? (Array.isArray(pageObj) ? pageObj : (pageObj.firms || [])) : [];
      return firms.includes(firm);
    });
  };

  const isPageCheckedForAllFirms = (page) => {
    const pageObj = formData.pageFirms?.[page];
    const firms = pageObj ? (Array.isArray(pageObj) ? pageObj : (pageObj.firms || [])) : [];
    return ["Pmmpl", "Purab", "Rkl"].every((f) => firms.includes(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      toast.error("Username and Password are required");
      return;
    }

    if (!formData.isViewOnly && !formData.permissions.includes("admin") && Object.keys(formData.pageFirms || {}).length === 0) {
      toast.error("Please configure at least one page permission");
      return;
    }

    setIsSubmitting(true);
    try {
      const isSuperAdminFlag = editingUser && typeof editingUser["Pages"] === "string" && editingUser["Pages"].trim().toLowerCase() === "super admin";
      
      const pagesValue = formData.isViewOnly
        ? "viewonly"
        : formData.permissions.includes("admin")
          ? (isSuperAdminFlag ? "super admin" : "all")
          : JSON.stringify(formData.pageFirms || {});
      
      const firmsValue = formData.firmName.includes("all")
        ? "all"
        : formData.firmName;

      const payload = {
        "User Name": formData.username,
        Password: formData.password,
        "Firm Name": firmsValue,
        Pages: pagesValue,
        Name: formData.name || null,
      };


      if (editingUser) {
        const { error } = await supabase
          .from("Login")
          .update(payload)
          .eq("User Name", editingUser["User Name"]);
        if (error) throw error;
        toast.success("User updated successfully");
      } else {
        const { error } = await supabase.from("Login").insert([payload]);
        if (error) throw error;
        toast.success("User added successfully");
      }

      setIsDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error(error.message || "Failed to save user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (username) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;

    try {
      const { error } = await supabase
        .from("Login")
        .delete()
        .eq("User Name", username);

      if (error) throw error;
      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  const filteredUsers = users.filter((u) => {
    const userName = (u["User Name"] || "").toLowerCase();
    const name = (u["Name"] || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    const parsedFirms = parseFirms(u["Firm Name"]);
    const firmsText = (parsedFirms.includes("all") ? "all firms" : parsedFirms.join(", ")).toLowerCase();
    return userName.includes(query) || name.includes(query) || firmsText.includes(query);
  });


  const filteredSidebarUsers = users.filter((u) => {
    // 1. Name or Username filter
    const userName = (u["User Name"] || "").toLowerCase();
    const name = (u["Name"] || "").toLowerCase();
    const query = sidebarSearch.toLowerCase();
    if (!userName.includes(query) && !name.includes(query)) return false;

    // 2. Sidebar Page filter
    if (sidebarPageFilter === "all") return true;

    const accessible = getAccessibleSidebarPages(u);
    return accessible.some(page => page.id === sidebarPageFilter || page.label.toLowerCase() === sidebarPageFilter.toLowerCase());
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-[#7da23a]/10 rounded-xl">
              <Users className="h-8 w-8 text-[#7da23a]" />
            </div>
            Manage Users
          </h1>
          <p className="text-gray-500 mt-1">
            Configure system access and firm assignments
          </p>
        </div>
        <Button
          onClick={handleOpenAddDialog}
          className="bg-[#7da23a] hover:bg-[#6b8e2f] text-white shadow-lg shadow-[#7da23a]/20 transition-all active:scale-95"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add New User
        </Button>
      </div>

      <Tabs defaultValue="users" className="w-full space-y-6">
        <TabsList className={`grid w-full sm:w-[400px] ${isAdmin ? "grid-cols-2" : "grid-cols-1"} bg-slate-100 p-1 rounded-lg`}>
          <TabsTrigger value="users">Users List</TabsTrigger>
          {isAdmin && <TabsTrigger value="sidebar-access">Sidebar Page Access</TabsTrigger>}
        </TabsList>

        <TabsContent value="users">
          <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-gray-100 bg-slate-50/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or firm..."
                    className="pl-10 bg-white border-gray-200 focus:ring-[#7da23a] focus:border-[#7da23a]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="bg-white px-3 py-1 border-gray-200"
                  >
                    Total: {users.length} Users
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[200px] font-bold">
                        User Name
                      </TableHead>
                      <TableHead className="w-[180px] font-bold">
                        Firm Name
                      </TableHead>
                      <TableHead className="font-bold">
                        Access Permissions
                      </TableHead>
                      <TableHead className="w-[150px] text-right font-bold">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array(5)
                        .fill(0)
                        .map((_, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div className="h-4 bg-gray-100 rounded w-24 animate-pulse"></div>
                            </TableCell>
                            <TableCell>
                              <div className="h-4 bg-gray-100 rounded w-32 animate-pulse"></div>
                            </TableCell>
                            <TableCell>
                              <div className="h-4 bg-gray-100 rounded w-full animate-pulse"></div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="h-8 bg-gray-100 rounded w-20 ml-auto animate-pulse"></div>
                            </TableCell>
                          </TableRow>
                        ))
                    ) : filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => {
                        const rawPages = user["Pages"];
                        const isViewOnly = rawPages === "viewonly" ||
                          (typeof rawPages === "string" && rawPages.trim().toLowerCase() === "viewonly");
                        const userPermsArray = isViewOnly ? [] : parsePermissions(rawPages);
                        const isAdmin = !isViewOnly && userPermsArray.includes("admin");
                        const perms = isAdmin ? [] : getPagePermissionsWithFirms(rawPages);

                        return (
                          <TableRow
                            key={user["User Name"]}
                            className="group hover:bg-[#7da23a]/5 transition-colors"
                          >
                            <TableCell className="font-medium text-gray-900">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[#7da23a] font-bold">
                                  {user["Name"]?.charAt(0).toUpperCase() || user["User Name"]?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900">{user["Name"] || "—"}</div>
                                  <div className="text-xs text-gray-500 font-normal">@{user["User Name"]}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none"
                              >
                                <Building2 className="h-3 w-3 mr-1" />
                                {(() => {
                                  const parsed = parseFirms(user["Firm Name"]);
                                  if (parsed.length === 0) return "N/A";
                                  if (parsed.includes("all")) return "All Firms";
                                  return parsed.join(", ");
                                })()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1.5">
                                {isViewOnly ? (
                                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none font-bold">
                                    <Eye className="h-3 w-3 mr-1" />
                                    View Only (All Pages, No Edits)
                                  </Badge>
                                ) : isAdmin ? (
                                  <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-none font-bold">
                                    <ShieldCheck className="h-3 w-3 mr-1" />
                                    Administrator (All Access)
                                  </Badge>
                                ) : perms.length > 0 ? (
                                  perms.map((p, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className="text-[11px] font-medium border-[#7da23a]/20 bg-[#7da23a]/5 hover:bg-[#7da23a]/10 text-[#7da23a]"
                                    >
                                      {p}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-xs text-gray-400 italic">
                                    No specialized access
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-500 hover:text-[#7da23a] hover:bg-[#7da23a]/10"
                                onClick={() => handleOpenEditDialog(user)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteUser(user["User Name"])}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <Users className="h-12 w-12 text-gray-200 mb-2" />
                            <p>No users found matching your search</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {isAdmin && (
          <TabsContent value="sidebar-access">
            <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b border-gray-100 bg-slate-50/50 p-6">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-gray-800">
                  <Shield className="h-5 w-5 text-[#7da23a]" />
                  Sidebar Page Access
                </CardTitle>
                <CardDescription>
                  Compare user permissions against the frontend sidebar stages to see which pages they can access.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 bg-slate-50 p-4 rounded-lg">
                  <div className="relative flex-1 max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or username..."
                      className="pl-10 bg-white border-gray-200 focus:ring-[#7da23a] focus:border-[#7da23a]"
                      value={sidebarSearch}
                      onChange={(e) => setSidebarSearch(e.target.value)}
                    />
                  </div>
                  <div className="w-full sm:w-64">
                    <Select value={sidebarPageFilter} onValueChange={setSidebarPageFilter}>
                      <SelectTrigger className="bg-white border-gray-200">
                        <SelectValue placeholder="Filter by Sidebar Page" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sidebar Pages (No Filter)</SelectItem>
                        {SIDEBAR_PAGES.map((page) => (
                          <SelectItem key={page.id} value={page.id}>{page.label.trim()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="overflow-x-auto border border-gray-100 rounded-lg">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-[250px] font-bold">User Details</TableHead>
                        <TableHead className="w-[180px] font-bold">Access Level</TableHead>
                        <TableHead className="font-bold">Allowed Sidebar Pages</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSidebarUsers.length > 0 ? (
                        filteredSidebarUsers.map((user) => {
                          const rawPages = user["Pages"];
                          const isViewOnly = rawPages === "viewonly" || (typeof rawPages === "string" && rawPages.trim().toLowerCase() === "viewonly");
                          const userPermsArray = isViewOnly ? [] : parsePermissions(rawPages);
                          const isSuperAdmin = typeof rawPages === "string" && rawPages.trim().toLowerCase() === "super admin";
                          const isNormalAdmin = !isViewOnly && !isSuperAdmin && userPermsArray.includes("admin");
                          
                          let accessLevelBadge = null;
                          if (isSuperAdmin) {
                            accessLevelBadge = (
                              <Badge className="bg-red-100 text-red-700 border-none font-bold">
                                Super Admin
                              </Badge>
                            );
                          } else if (isNormalAdmin) {
                            accessLevelBadge = (
                              <Badge className="bg-purple-100 text-purple-700 border-none font-bold">
                                Administrator
                              </Badge>
                            );
                          } else if (isViewOnly) {
                            accessLevelBadge = (
                              <Badge className="bg-blue-100 text-blue-700 border-none font-bold">
                                View Only
                              </Badge>
                            );
                          } else {
                            accessLevelBadge = (
                              <Badge variant="outline" className="text-gray-600 bg-gray-50 border-gray-200">
                                Custom Access
                              </Badge>
                            );
                          }

                          const accessiblePages = getAccessibleSidebarPages(user);

                          return (
                            <TableRow key={user["User Name"]} className="hover:bg-slate-50/50">
                              <TableCell className="font-medium align-top py-4">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[#7da23a] font-bold">
                                    {user["Name"]?.charAt(0).toUpperCase() || user["User Name"]?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900">{user["Name"] || "—"}</div>
                                    <div className="text-xs text-gray-500 font-normal">@{user["User Name"]}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="align-top py-4">
                                {accessLevelBadge}
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex flex-wrap gap-2">
                                  {accessiblePages.length > 0 ? (
                                    accessiblePages.map((page) => {
                                      const isHighlighted = sidebarPageFilter !== "all" && page.id === sidebarPageFilter;
                                      return (
                                        <Badge
                                          key={page.id}
                                          variant="outline"
                                          className={`text-[11px] px-2.5 py-1 font-medium ${
                                            isHighlighted 
                                              ? "bg-[#7da23a] text-white border-[#7da23a] font-semibold shadow-sm" 
                                              : "bg-white text-gray-700 border-gray-200"
                                          }`}
                                        >
                                          {page.label.trim()}
                                        </Badge>
                                      );
                                    })
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">No access to any sidebar pages</span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="h-48 text-center text-gray-500">
                            <div className="flex flex-col items-center justify-center">
                              <AlertTriangle className="h-8 w-8 text-gray-400 mb-2" />
                              <p className="font-medium text-gray-700">No matching users</p>
                              <p className="text-xs text-gray-400">Try adjusting your search query or filters.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Add/Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-3xl w-full p-0 overflow-hidden rounded-xl sm:rounded-2xl border-none shadow-2xl max-h-[90vh] flex flex-col">
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
            <DialogHeader className="bg-slate-50 p-6 border-b border-gray-100 shrink-0">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                {editingUser ? (
                  <Edit2 className="h-5 w-5 text-[#7da23a]" />
                ) : (
                  <UserPlus className="h-5 w-5 text-[#7da23a]" />
                )}
                {editingUser ? "Edit User Access" : "Register New User"}
              </DialogTitle>
              <DialogDescription>
                Configure account credentials and module permissions
              </DialogDescription>
            </DialogHeader>

            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-5 gap-6 bg-white overflow-y-auto flex-1 min-h-0">
              <div className="space-y-4 md:col-span-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="fullName"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="fullName"
                      placeholder="e.g. John Doe"
                      className="pl-10"
                      value={formData.name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="username"
                    className="text-sm font-semibold text-gray-700"
                  >
                    User Identification (Username) <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="username"
                      placeholder="e.g. john_doe"
                      className="pl-10"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      disabled={!!editingUser}
                    />
                  </div>
                  {editingUser && (
                    <p className="text-[10px] text-gray-400 italic">
                      Username cannot be changed after creation
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Access Key (Password) <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="text"
                      placeholder="Set a secure password"
                      className="pl-10"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center justify-between">
                    Assigned Firms <span className="text-red-500">*</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold">
                      {formData.firmName.includes("all") ? "All Firms" : `${formData.firmName.length} Selected`}
                    </Badge>
                  </Label>
                  
                  <div className="border border-gray-100 rounded-xl p-3 bg-slate-50/30 space-y-2">
                    {!(formData.isViewOnly || formData.permissions.includes("admin")) ? (
                      <div className="p-2 text-xs text-slate-500 bg-slate-100/50 rounded-lg border border-dashed border-slate-200">
                        <p className="font-semibold text-slate-600">Dynamic Firm Assignment</p>
                        <p className="mt-1 text-[11px]">Firms are automatically derived from the page permissions grid below:</p>
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {formData.firmName.length > 0 ? (
                            formData.firmName.map(f => (
                              <Badge key={f} variant="secondary" className="bg-[#7da23a]/10 text-[#7da23a] border-none text-[10px]">
                                {f}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-[10px] italic text-slate-400">No firms assigned yet (select in grid below)</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-3 p-2 bg-blue-50 rounded-lg border border-blue-100 group cursor-pointer">
                          <Checkbox
                            id="firm-all"
                            checked={formData.firmName.includes("all")}
                            onCheckedChange={() => handleToggleFirm("all")}
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          <Label htmlFor="firm-all" className="text-sm font-bold text-blue-900 cursor-pointer flex items-center flex-1">
                            <Building2 className="h-3 w-3 mr-1.5" /> All Firms Access
                          </Label>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {FIRMS.filter(f => f !== "all").map((firm) => (
                            <div key={firm} className="flex items-center space-x-2 p-1.5 hover:bg-white rounded-md transition-colors border border-transparent hover:border-gray-50 group">
                              <Checkbox
                                id={`firm-${firm}`}
                                checked={formData.firmName.includes(firm) || formData.firmName.includes("all")}
                                onCheckedChange={() => handleToggleFirm(firm)}
                                disabled={formData.firmName.includes("all")}
                                className="data-[state=checked]:bg-[#7da23a] data-[state=checked]:border-[#7da23a]"
                              />
                              <Label
                                htmlFor={`firm-${firm}`}
                                className={`text-xs cursor-pointer flex-1 ${formData.firmName.includes("all") ? "text-gray-400" : "text-gray-700"}`}
                              >
                                {firm}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <div className="flex gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-900">
                        Security Note
                      </p>
                      <p className="text-[10px] text-amber-800 leading-relaxed mt-1">
                        Permissions are assigned immediately. Users will need to
                        refresh their browser to see module changes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 md:col-span-3">
                <Label className="text-sm font-semibold text-gray-700 flex items-center justify-between">
                  Module Permissions
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-bold"
                  >
                    {formData.permissions.includes("admin")
                      ? "All Modules"
                      : `${formData.permissions.length} Selected`}
                  </Badge>
                </Label>

                <div className="border border-gray-100 rounded-xl p-4 bg-slate-50/30">
                  {/* View Only Access */}
                  <div className="flex items-center space-x-3 p-2 bg-blue-50 rounded-lg border border-blue-100 mb-2 group cursor-pointer">
                    <Checkbox
                      id="viewonly"
                      checked={formData.isViewOnly}
                      onCheckedChange={handleToggleViewOnly}
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <div className="flex-1">
                      <Label htmlFor="viewonly" className="text-sm font-bold text-blue-900 cursor-pointer flex items-center">
                        <Eye className="h-3 w-3 mr-1.5" /> View Only Access
                      </Label>
                      <p className="text-[10px] text-blue-700 font-medium">
                        Can see all pages but cannot make any changes
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-2 bg-purple-50 rounded-lg border border-purple-100 mb-3 group cursor-pointer">
                    <Checkbox
                      id="admin"
                      checked={formData.permissions.includes("admin")}
                      onCheckedChange={() => handleTogglePermission("admin")}
                      disabled={formData.isViewOnly}
                      className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="admin"
                        className="text-sm font-bold text-purple-900 cursor-pointer flex items-center"
                      >
                        <Shield className="h-3 w-3 mr-1.5" /> Full Admin Access
                      </Label>
                      <p className="text-[10px] text-purple-700 font-medium">
                        Overwrites all specific module selections
                      </p>
                    </div>
                  </div>

                  {!(formData.isViewOnly || formData.permissions.includes("admin")) && (
                    <div className="mb-2">
                      <Input
                        placeholder="Search pages..."
                        value={pageSearch}
                        onChange={(e) => setPageSearch(e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                  )}

                  <div className="h-[280px] overflow-y-auto overflow-x-auto border border-gray-100 rounded-lg bg-white relative custom-scrollbar">
                    {formData.isViewOnly || formData.permissions.includes("admin") ? (
                      <div className="p-4 text-center text-xs text-gray-500 italic">
                        {formData.isViewOnly ? "View Only mode enables access to all pages." : "Full Admin mode enables access to all pages."}
                      </div>
                    ) : (
                      <table className="w-full text-xs border-separate border-spacing-0 relative" style={{ minWidth: "500px" }}>
                        <thead>
                          <tr>
                            <th className="font-bold text-gray-700 bg-slate-50 py-2.5 px-3 text-left align-middle sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0] w-[30%]">
                              Page Name
                            </th>
                            {["Pmmpl", "Purab", "Rkl"].map((firm) => (
                              <th key={firm} className="text-center font-bold text-gray-700 bg-slate-50 py-2.5 px-2 align-middle sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0] w-[14%]">
                                <div className="flex flex-col items-center gap-1">
                                  <span>{firm}</span>
                                  <Checkbox
                                    checked={isFirmCheckedForAllPages(firm)}
                                    onCheckedChange={(checked) => handleToggleColumnFirm(firm, !!checked)}
                                    className="h-3 w-3 data-[state=checked]:bg-[#7da23a] data-[state=checked]:border-[#7da23a]"
                                  />
                                </div>
                              </th>
                            ))}
                            <th className="text-center font-bold text-gray-700 bg-slate-50 py-2.5 px-2 align-middle sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0] w-[18%]">
                              Access Level
                            </th>
                            <th className="text-center font-bold text-gray-700 bg-slate-50 py-2.5 px-2 align-middle sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0] w-[10%]">
                              Row Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {ALL_PAGES.filter(p => p.toLowerCase().includes(pageSearch.toLowerCase())).map((page) => {
                            const isAllRowChecked = isPageCheckedForAllFirms(page);
                            const pageObj = formData.pageFirms?.[page];
                            const currentFirms = pageObj ? (Array.isArray(pageObj) ? pageObj : (pageObj.firms || [])) : [];
                            const isPageReadOnly = pageObj && !Array.isArray(pageObj) ? !!pageObj.readOnly : false;
                            const hasAccess = currentFirms.length > 0;
                            return (
                              <tr key={page} className="hover:bg-slate-50/50 transition-colors">
                                <td className="font-medium text-gray-700 py-2 px-3 align-middle border-b border-gray-100">{page}</td>
                                {["Pmmpl", "Purab", "Rkl"].map((firm) => (
                                  <td key={firm} className="text-center py-2 px-2 align-middle border-b border-gray-100">
                                    <div className="flex justify-center">
                                      <Checkbox
                                        checked={currentFirms.includes(firm) || currentFirms.includes("all")}
                                        onCheckedChange={() => handleTogglePageFirm(page, firm)}
                                        className="h-4 w-4 data-[state=checked]:bg-[#7da23a] data-[state=checked]:border-[#7da23a]"
                                      />
                                    </div>
                                  </td>
                                ))}
                                <td className="py-2 px-2 align-middle border-b border-gray-100">
                                  <div className="flex justify-center">
                                    <Select
                                      disabled={!hasAccess}
                                      value={isPageReadOnly ? "view" : "edit"}
                                      onValueChange={(val) => handleTogglePageAccessLevel(page, val === "view")}
                                    >
                                      <SelectTrigger className="h-7 text-[10px] w-24 bg-white border-gray-200">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="edit">Full Access</SelectItem>
                                        <SelectItem value="view">View Only</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </td>
                                <td className="text-center py-2 px-2 align-middle border-b border-gray-100">
                                  <div className="flex justify-center">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleToggleRowAll(page, !isAllRowChecked)}
                                      className="h-6 px-2 text-[10px] border-[#7da23a]/20 text-[#7da23a] hover:bg-[#7da23a] hover:text-white"
                                    >
                                      {isAllRowChecked ? "Clear" : "All"}
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="bg-slate-50 p-4 sm:p-6 border-t border-gray-100 flex flex-row items-center justify-between gap-4 shrink-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                className="text-gray-500 font-semibold"
              >
                Discard Changes
              </Button>
              <Button
                type="submit"
                className="bg-[#7da23a] hover:bg-[#6b8e2f] text-white px-8 shadow-lg shadow-[#7da23a]/20 font-bold"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Serializing..."
                  : editingUser
                    ? "Apply Updates"
                    : "Initialize Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
