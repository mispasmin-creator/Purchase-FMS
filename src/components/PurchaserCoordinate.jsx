"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  PhoneCall, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  Search, 
  Filter, 
  Info, 
  AlertCircle,
  Truck,
  User,
  Package,
  ArrowRightCircle
} from "lucide-react";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from "./ui/card";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from "./ui/table";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "./ui/dialog";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { toast } from "sonner";

export default function PurchaserCoordinate() {
  const { user } = useAuth();
  const { updateCount } = useNotification();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedCoord, setSelectedCoord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: coordData, error } = await supabase
        .from("purchaser_coordinates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setData(coordData || []);
      
      const pendingCount = (coordData || []).filter(i => i.status === 'PENDING').length;
      updateCount("purchaser-coordinate", pendingCount);
    } catch (err) {
      console.error("Error fetching coordination data:", err);
      toast.error("Failed to load coordination data");
    } finally {
      setLoading(false);
    }
  }, [updateCount]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = 
        item.po_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.material_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTab = activeTab === "pending" ? item.status === "PENDING" : item.status === "COORDINATED";
      
      return matchesSearch && matchesTab;
    });
  }, [data, searchQuery, activeTab]);

  const handleCoordinate = async () => {
    if (!selectedCoord) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      
      // 1. Update Coordination table
      const { error: coordError } = await supabase
        .from("purchaser_coordinates")
        .update({
          status: "COORDINATED",
          coordinated_by: user?.email || user?.id,
          coordinated_at: now
        })
        .eq("id", selectedCoord.id);

      if (coordError) throw coordError;

      // 2. Update Mismatch table status
      const { error: mismatchError } = await supabase
        .from("Mismatch")
        .update({ coordination_status: "COORDINATED" })
        .eq("id", selectedCoord.mismatch_id);

      if (mismatchError) {
        console.warn("Could not update Mismatch status, but coordination saved.", mismatchError);
      }

      toast.success("✅ Coordination Confirmed!", {
        description: `Coordination for PO ${selectedCoord.po_number} has been recorded.`
      });
      
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Coordination error:", err);
      toast.error("Failed to save coordination");
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeText = (type) => {
    switch(type) {
      case 'DEBIT_NOTE_VENDOR': return 'Debit Note (Vendor)';
      case 'DEBIT_NOTE_TRANSPORTER': return 'Debit Note (Transporter)';
      case 'PURCHASE_RETURN': return 'Purchase Return';
      default: return type;
    }
  };

  const getTypeColor = (type) => {
    if (type?.startsWith('DEBIT')) return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-orange-100 text-orange-700 border-orange-200';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
      <Card className="shadow-md border-gray-200">
        <CardHeader className="border-b bg-white">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <PhoneCall className="h-6 w-6 text-[#7da23a]" />
                Purchaser Coordination
              </CardTitle>
              <CardDescription className="mt-1">
                Verify and coordinate mismatches with vendors/transporters before final processing.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="p-4 bg-white border-b flex flex-col sm:flex-row gap-4 justify-between items-center">
              <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending
                  <Badge variant="secondary" className="ml-1">{data.filter(i => i.status === 'PENDING').length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Coordinated
                </TabsTrigger>
              </TabsList>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search PO, Vendor..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <TabsContent value="pending" className="m-0">
              <CoordinationTable 
                items={filteredData} 
                onCoordinate={(item) => {
                  setSelectedCoord(item);
                  setIsModalOpen(true);
                }}
                loading={loading}
                getTypeColor={getTypeColor}
                getTypeText={getTypeText}
              />
            </TabsContent>

            <TabsContent value="history" className="m-0">
              <CoordinationTable 
                items={filteredData} 
                isHistory
                loading={loading}
                getTypeColor={getTypeColor}
                getTypeText={getTypeText}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-[#7da23a]" />
              Confirm Coordination
            </DialogTitle>
            <DialogDescription>
              Verify details with the parties involved before proceeding.
            </DialogDescription>
          </DialogHeader>

          {selectedCoord && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm font-medium">PO Number:</span>
                  <span className="font-bold">{selectedCoord.po_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm font-medium">Type:</span>
                  <Badge className={getTypeColor(selectedCoord.type)}>{getTypeText(selectedCoord.type)}</Badge>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-500 text-sm font-medium block">Details:</span>
                  <div className="text-sm pl-2 border-l-2 border-[#7da23a]">
                    {selectedCoord.vendor_name && <p><strong>Vendor:</strong> {selectedCoord.vendor_name}</p>}
                    {selectedCoord.transporter_name && <p><strong>Transporter:</strong> {selectedCoord.transporter_name}</p>}
                    {selectedCoord.material_name && <p><strong>Material:</strong> {selectedCoord.material_name}</p>}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-[#7da23a]/20 bg-green-50 text-green-800 text-sm flex gap-3">
                <Info className="h-5 w-5 shrink-0" />
                <p>By clicking "Yes", you confirm that you have spoken with the authorized contact and agreed upon the next steps.</p>
              </div>

              <p className="text-center font-bold text-gray-800">Was the coordination done successfully?</p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={submitting}>No, Later</Button>
            <Button 
              className="bg-[#7da23a] hover:bg-[#6b8e2f]" 
              onClick={handleCoordinate}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CoordinationTable({ items, onCoordinate, isHistory, loading, getTypeColor, getTypeText }) {
  if (loading) {
    return (
      <div className="py-20 text-center text-gray-500">
        <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-[#7da23a]" />
        <p>Loading records...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-10 w-10 text-gray-400" />
        </div>
        <p className="text-gray-500 font-medium">No results found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="w-[120px]">Action</TableHead>
            <TableHead>PO Number</TableHead>
            <TableHead>Mismatch Type</TableHead>
            <TableHead>Involved Party</TableHead>
            <TableHead>Material</TableHead>
            <TableHead>Created On</TableHead>
            {isHistory && <TableHead>Coordinated Info</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className="hover:bg-slate-50/50">
              <TableCell>
                {!isHistory ? (
                  <Button 
                    size="sm" 
                    className="bg-[#7da23a] hover:bg-[#6b8e2f] gap-2"
                    onClick={() => onCoordinate(item)}
                  >
                    Coordinate
                  </Button>
                ) : (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    Done
                  </Badge>
                )}
              </TableCell>
              <TableCell className="font-bold">{item.po_number}</TableCell>
              <TableCell>
                <Badge variant="outline" className={getTypeColor(item.type)}>
                  {getTypeText(item.type)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {item.vendor_name && (
                    <div className="flex items-center gap-1.5">
                      <User className="h-3 w-3 text-slate-400" />
                      {item.vendor_name}
                    </div>
                  )}
                  {item.transporter_name && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Truck className="h-3 w-3 text-slate-400" />
                      {item.transporter_name}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-sm">
                  <Package className="h-3 w-3 text-slate-400" />
                  {item.material_name}
                </div>
              </TableCell>
              <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                {new Date(item.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </TableCell>
              {isHistory && (
                <TableCell className="text-xs">
                  <p className="font-medium text-gray-700">{item.coordinated_by}</p>
                  <p className="text-gray-400">{new Date(item.coordinated_at).toLocaleDateString()}</p>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
