"use client";
import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
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
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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
  SelectValue 
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
  "Arrange Logistics",
  "Logistics App.",
  "PO Entry",
  "Advance Payement",
  "Lift",
  "Receipt",
  "Unload App.",
  "Lab",
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

const FIRMS = ["Pmmpl", "Purab", "Rkl"];

export default function ManageUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    firmName: "",
    permissions: [],
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
    setFormData({
      username: "",
      password: "",
      firmName: "",
      permissions: [],
    });
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (user) => {
    setEditingUser(user);
    const pagesStr = (user["Pages"] || "").trim();
    const userPermissions =
      pagesStr.toLowerCase() === "all"
        ? ["admin"]
        : pagesStr
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);

    setFormData({
      username: user["User Name"] || "",
      password: user["Password"] || "",
      firmName: user["Firm Name"] || "",
      permissions: userPermissions,
    });
    setIsDialogOpen(true);
  };

  const handleTogglePermission = (permission) => {
    setFormData((prev) => {
      let newPermissions;
      if (permission === "admin") {
        newPermissions = prev.permissions.includes("admin") ? [] : ["admin"];
      } else {
        // If admin is selected, unselect it when picking other pages
        const filtered = prev.permissions.filter((p) => p !== "admin");
        if (filtered.includes(permission)) {
          newPermissions = filtered.filter((p) => p !== permission);
        } else {
          newPermissions = [...filtered, permission];
        }
      }
      return { ...prev, permissions: newPermissions };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      toast.error("Username and Password are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const pagesValue = formData.permissions.includes("admin")
        ? "all"
        : formData.permissions.join(", ");

      const payload = {
        "User Name": formData.username,
        Password: formData.password,
        "Firm Name": formData.firmName,
        Pages: pagesValue,
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

  const filteredUsers = users.filter(
    (u) =>
      (u["User Name"] || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (u["Firm Name"] || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
                    const pagesStr = (user["Pages"] || "").trim().toLowerCase();
                    const isAdmin = pagesStr === "all";
                    const perms = isAdmin
                      ? []
                      : pagesStr
                          .split(",")
                          .map((p) => p.trim())
                          .filter(Boolean);

                    return (
                      <TableRow
                        key={user["User Name"]}
                        className="group hover:bg-[#7da23a]/5 transition-colors"
                      >
                        <TableCell className="font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[#7da23a] font-bold">
                              {user["User Name"]?.charAt(0).toUpperCase()}
                            </div>
                            {user["User Name"]}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none"
                          >
                            <Building2 className="h-3 w-3 mr-1" />
                            {user["Firm Name"] || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {isAdmin ? (
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

      {/* Add/Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden sm:rounded-2xl border-none shadow-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader className="bg-slate-50 p-6 border-b border-gray-100">
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

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white overflow-hidden">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="username"
                    className="text-sm font-semibold text-gray-700"
                  >
                    User Identification (Username)
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
                    Access Key (Password)
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
                  <Label htmlFor="firm" className="text-sm font-semibold text-gray-700">Organization / Firm Name</Label>
                  <Select 
                    value={formData.firmName} 
                    onValueChange={(value) => setFormData({...formData, firmName: value})}
                  >
                    <SelectTrigger className="w-full bg-white border-gray-200">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <SelectValue placeholder="Select Organization" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {FIRMS.map(firm => (
                        <SelectItem key={firm} value={firm}>{firm}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

              <div className="space-y-4">
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
                  <div className="flex items-center space-x-3 p-2 bg-purple-50 rounded-lg border border-purple-100 mb-3 group cursor-pointer">
                    <Checkbox
                      id="admin"
                      checked={formData.permissions.includes("admin")}
                      onCheckedChange={() => handleTogglePermission("admin")}
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

                  <ScrollArea className="h-[280px] pr-4 mt-2">
                    <div className="space-y-2">
                      {ALL_PAGES.map((page) => (
                        <div
                          key={page}
                          className="flex items-center space-x-3 p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-100 group"
                        >
                          <Checkbox
                            id={`perm-${page}`}
                            checked={
                              formData.permissions.includes(page) ||
                              formData.permissions.includes("admin")
                            }
                            onCheckedChange={() => handleTogglePermission(page)}
                            disabled={formData.permissions.includes("admin")}
                            className="data-[state=checked]:bg-[#7da23a] data-[state=checked]:border-[#7da23a]"
                          />
                          <Label
                            htmlFor={`perm-${page}`}
                            className={`text-sm cursor-pointer flex-1 transition-colors ${
                              formData.permissions.includes("admin")
                                ? "text-gray-400"
                                : "text-gray-700 group-hover:text-gray-900"
                            }`}
                          >
                            {page}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>

            <DialogFooter className="bg-slate-50 p-6 border-t border-gray-100 flex items-center justify-between">
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
