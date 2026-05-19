"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  History,
  FileText,
  Eye,
  Loader2,
  Edit2,
  Save,
  X,
  ShieldCheck,
} from "lucide-react";

import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import { canViewFirm } from "../utils/firmFilter";
import { toast } from "sonner";

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function POHistory() {
  const { user, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [poList, setPoList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Super Admin edit state
  const [editingPO, setEditingPO] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchPOHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("INDENT-PO")
        .select("*")
        .not("Actual2", "is", null)
        .order("Actual2", { ascending: false });

      if (error) throw error;

      const groupedPOs = (data || []).reduce((acc, row) => {
        const poId = row.po_number || "Draft";
        const vendorName = row["Vendor name"] || row["Vendor Name 1"] || "N/A";
        const firmName = row["Firm Name"] || "N/A";
        const groupKey = `${poId}_${vendorName}_${firmName}`;

        if (!acc[groupKey]) {
          acc[groupKey] = {
            id: row.id,
            poId: poId,
            date: row.Actual2,
            vendorName: vendorName,
            items: [],
            totalAmount: row["Total Amount"] || 0,
            pdfUrl: row["PO Copy"],
            firmName: firmName,
            status:
              row.ActualLogistics
                ? "Logistics Arranged"
                : row.Actual3
                ? "Entered in Tally"
                : "PO Created",
          };
        }
        if (row.Material && !acc[groupKey].items.includes(row.Material)) {
          acc[groupKey].items.push(row.Material);
        }
        return acc;
      }, {});

      let result = Object.values(groupedPOs);

      if (user?.firmName) {
        result = result.filter((po) => canViewFirm(user.firmName, po.firmName));
      }

      setPoList(result);
    } catch (error) {
      console.error("Error fetching PO history:", error);
      toast.error("Failed to load PO history");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPOHistory();
  }, [fetchPOHistory]);

  const filteredPOs = useMemo(() => {
    return poList.filter((po) => {
      const searchMatch =
        po.poId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (po.firmName &&
          po.firmName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        po.items.join(", ").toLowerCase().includes(searchQuery.toLowerCase());

      const dateMatch =
        !dateFilter || (po.date && po.date.startsWith(dateFilter));

      return searchMatch && dateMatch;
    });
  }, [poList, searchQuery, dateFilter]);

  const openEditModal = (po) => {
    setEditingPO(po);
    setEditForm({
      vendorName: po.vendorName,
      totalAmount: po.totalAmount,
      pdfUrl: po.pdfUrl || "",
      firmName: po.firmName,
    });
  };

  const handleEditSave = async () => {
    if (!editingPO) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("INDENT-PO")
        .update({
          "Vendor name": editForm.vendorName,
          "Total Amount": editForm.totalAmount,
          "PO Copy": editForm.pdfUrl,
          "Firm Name": editForm.firmName,
        })
        .eq("po_number", editingPO.poId)
        .eq("Firm Name", editingPO.firmName);

      if (error) throw error;

      toast.success(`PO ${editingPO.poId} updated successfully`);
      setEditingPO(null);
      fetchPOHistory();
    } catch (err) {
      console.error("Save error:", err);
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const renderEditModal = () => {
    if (!editingPO) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-lg max-w-lg w-full">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Edit PO — Super Admin</h3>
              </div>
              <button onClick={() => setEditingPO(null)} className="text-gray-400 hover:text-gray-600">
                <X size={22} />
              </button>
            </div>

            <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-700">
              PO ID: <span className="font-semibold">{editingPO.poId}</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                <input
                  value={editForm.vendorName}
                  onChange={(e) => setEditForm((p) => ({ ...p, vendorName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Firm Name</label>
                <input
                  value={editForm.firmName}
                  onChange={(e) => setEditForm((p) => ({ ...p, firmName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹)</label>
                <input
                  type="number"
                  value={editForm.totalAmount}
                  onChange={(e) => setEditForm((p) => ({ ...p, totalAmount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PO Copy URL</label>
                <input
                  value={editForm.pdfUrl}
                  onChange={(e) => setEditForm((p) => ({ ...p, pdfUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-gray-200">
              <button
                onClick={() => setEditingPO(null)}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-7xl mx-auto bg-white shadow-lg border-0">
      {renderEditModal()}
      <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <History size={24} />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-800">PO History</CardTitle>
              <CardDescription>View and track all generated Purchase Orders</CardDescription>
            </div>
          </div>
          {isSuperAdmin && (
            <div className="flex items-center gap-1.5 bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              <ShieldCheck size={14} />
              Super Admin Mode
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search PO ID, Vendor, or Material..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Input
                type="date"
                className="w-40"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setDateFilter("");
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-gray-500 font-medium">Loading history...</p>
          </div>
        ) : filteredPOs.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-xl">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No purchase orders found</p>
          </div>
        ) : (
          <div className="overflow-auto border border-gray-200 rounded-xl max-h-[calc(100vh-350px)] relative custom-scrollbar shadow-sm">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-30">
                <tr className="bg-slate-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-slate-50/95 backdrop-blur-sm shadow-sm">PO ID</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-slate-50/95 backdrop-blur-sm shadow-sm">Creation Date</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-slate-50/95 backdrop-blur-sm shadow-sm">Firm Name</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-slate-50/95 backdrop-blur-sm shadow-sm">Vendor Name</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-slate-50/95 backdrop-blur-sm shadow-sm">Items</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-slate-50/95 backdrop-blur-sm shadow-sm">Amount</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-slate-50/95 backdrop-blur-sm shadow-sm">Status</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-right bg-slate-50/95 backdrop-blur-sm shadow-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredPOs.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
                    <td className="px-4 py-3 font-medium text-blue-600">{po.poId}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(po.date)}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{po.firmName || "N/A"}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{po.vendorName}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {po.items.map((item, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100"
                          >
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold">
                      ₹{Number(po.totalAmount).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          po.status === "Logistics Arranged"
                            ? "bg-green-100 text-green-700 border-green-200"
                            : po.status === "Entered in Tally"
                            ? "bg-blue-100 text-blue-700 border-blue-200"
                            : "bg-amber-100 text-amber-700 border-amber-200"
                        }
                      >
                        {po.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {isSuperAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-white hover:bg-purple-50 text-purple-600 border-purple-200"
                            onClick={() => openEditModal(po)}
                          >
                            <Edit2 size={14} className="mr-1" /> Edit
                          </Button>
                        )}
                        {po.pdfUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-white hover:bg-blue-50 text-blue-600 border-blue-200"
                            asChild
                          >
                            <a href={po.pdfUrl} target="_blank" rel="noopener noreferrer">
                              <Eye size={16} className="mr-1" /> View PDF
                            </a>
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-gray-400">
                            No PDF
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
