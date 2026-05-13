"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  History, 
  FileText, 
  Eye, 
  Download, 
  Filter,
  Loader2,
  ExternalLink
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [poList, setPoList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const fetchPOHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("INDENT-PO")
        .select("*")
        .not("Actual2", "is", null) // Actual2 is when PO is generated
        .order("Actual2", { ascending: false });

      if (error) throw error;

      // Group by PO number, Vendor, and Firm to avoid incorrect merging of different POs with same ID
      const groupedPOs = (data || []).reduce((acc, row) => {
        const poId = row.po_number || "Draft";
        const vendorName = row["Vendor name"] || row["Vendor Name 1"] || "N/A";
        const firmName = row["Firm Name"] || "N/A";
        
        // Composite key ensures unique grouping
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
            status: row.ActualLogistics ? "Logistics Arranged" : 
                    row.Actual3 ? "Entered in Tally" : "PO Created"
          };
        }
        if (row.Material && !acc[groupKey].items.includes(row.Material)) {
          acc[groupKey].items.push(row.Material);
        }
        return acc;
      }, {});

      let result = Object.values(groupedPOs);

      // Filter by firm if user is restricted
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
    return poList.filter(po => {
      const searchMatch = 
        po.poId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (po.firmName && po.firmName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        po.items.join(", ").toLowerCase().includes(searchQuery.toLowerCase());
      
      const dateMatch = !dateFilter || (po.date && po.date.startsWith(dateFilter));
      
      return searchMatch && dateMatch;
    });
  }, [poList, searchQuery, dateFilter]);

  return (
    <Card className="w-full max-w-7xl mx-auto bg-white shadow-lg border-0">
      <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
            <History size={24} />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-gray-800">PO History</CardTitle>
            <CardDescription>View and track all generated Purchase Orders</CardDescription>
          </div>
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
            <Button variant="outline" onClick={() => { setSearchQuery(""); setDateFilter(""); }}>
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
          <div className="border rounded-xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold">PO ID</TableHead>
                  <TableHead className="font-bold">Creation Date</TableHead>
                  <TableHead className="font-bold">Firm Name</TableHead>
                  <TableHead className="font-bold">Vendor Name</TableHead>
                  <TableHead className="font-bold">Items</TableHead>
                  <TableHead className="font-bold">Amount</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="text-right font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.map((po) => (
                  <TableRow key={po.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-medium text-blue-600">{po.poId}</TableCell>
                    <TableCell className="text-gray-600">{formatDate(po.date)}</TableCell>
                    <TableCell className="text-gray-700 font-medium">{po.firmName || "N/A"}</TableCell>
                    <TableCell className="font-semibold text-gray-800">{po.vendorName}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {po.items.map((item, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">₹{Number(po.totalAmount).toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <Badge className={
                        po.status === "Logistics Arranged" ? "bg-green-100 text-green-700 border-green-200" :
                        po.status === "Entered in Tally" ? "bg-blue-100 text-blue-700 border-blue-200" :
                        "bg-amber-100 text-amber-700 border-amber-200"
                      }>
                        {po.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {po.pdfUrl && (
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
                        )}
                        {!po.pdfUrl && (
                           <Badge variant="outline" className="text-gray-400">No PDF</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
