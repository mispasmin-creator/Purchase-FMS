import React, { useState, useEffect, useCallback, useContext } from "react";
import { useSearchParams } from "react-router-dom";
import {
    Loader2,
    Plus,
    X,
    Save,
    RotateCcw,
    FileText,
    Eye,
    Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableHeader,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "../supabase";
import { AuthContext } from "../context/AuthContext";
import { useRealtime } from "../hooks/useRealtime";
import { canViewFirm } from "../utils/firmFilter";

const EMPTY_FORM = {
    purchaseReturnNo: "",
    poNo: "",
    actionType: "",
    partyName: "",
    productName: "",
    qty: "",
    returnReason: "",
    transport: "",
    typeOfTransport: "",
    vehicleNo: "",
    builtyNo: "",
    rateType: "",
    amount: "",
    orgBillNo: "",
    billNo: "",
    billCopy: "",
    liftNo: "",
    firmName: "",
    mismatch_id: null,
    id: null,
};

export default function PurchaseReturnPage() {
    const { user } = useContext(AuthContext);
    const [records, setRecords] = useState([]);
    const [pendingMismatches, setPendingMismatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("finalized");
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [viewRecord, setViewRecord] = useState(null);

    // ── Fetch all records ──────────────────────────────────────────────────
    const fetchRecords = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Finalized Returns
            const { data: returnData, error: returnError } = await supabase
                .from("Purchase Returns")
                .select("*")
                .order("Time Stamp", { ascending: false });

            if (returnError) throw returnError;

            // 2. Fetch Pending Mismatches
            const { data: mismatchData, error: mismatchError } = await supabase
                .from("Mismatch")
                .select("*")
                .eq("Status", "Purchase Return")
                .eq("coordination_status", "COORDINATED");

            if (mismatchError) throw mismatchError;

            let fetchedReturns = returnData || [];
            let fetchedMismatches = mismatchData || [];

            // Filter out mismatches that already have a finalized return entry
            const existingMismatchIds = new Set(fetchedReturns.map(r => r.mismatch_id).filter(id => id));
            fetchedMismatches = fetchedMismatches.filter(m => !existingMismatchIds.has(m.id));

            // Role-based filtering
            if (user?.firmName) {
                fetchedReturns = fetchedReturns.filter((rec) =>
                    canViewFirm(user.firmName, rec["Firm Name"])
                );
                fetchedMismatches = fetchedMismatches.filter((rec) =>
                    canViewFirm(user.firmName, rec["Firm Name"])
                );
            }

            setRecords(fetchedReturns);
            setPendingMismatches(fetchedMismatches);
        } catch (err) {
            console.error("Failed to fetch records:", err);
            toast.error("Failed to load records.");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    // Live sync
    useRealtime(["Purchase Returns", "Mismatch"], () => {
        console.log("[Realtime] PR Page refreshing due to table change");
        fetchRecords();
    });

    // ── Auto-generate PR No. ───────────────────────────────────────────────
    const generatePRNumber = async () => {
        try {
            const { count, error } = await supabase
                .from("Purchase Returns")
                .select("*", { count: "exact", head: true });

            if (error) throw error;
            const nextCount = (count || 0) + 1;
            return `PR-${String(nextCount).padStart(3, "0")}`;
        } catch (err) {
            console.error("PR Number generation error:", err);
            return `PR-${Math.floor(Math.random() * 1000)}`;
        }
    };

    // ── Open form for new manual record ────────────────────────────────────
    const handleOpenForm = async () => {
        const prNo = await generatePRNumber();
        setForm({ ...EMPTY_FORM, purchaseReturnNo: prNo });
        setShowForm(true);
    };

    // ── Open form for creating from mismatch ──────────────────────────────
    const handleCreateFromMismatch = async (mismatch) => {
        const prNo = await generatePRNumber();
        setForm({
            ...EMPTY_FORM,
            purchaseReturnNo: prNo,
            poNo: mismatch["Indent Number"] || "",
            actionType: "Purchase Return",
            partyName: mismatch["Party Name"] || "",
            productName: mismatch["Product Name"] || "",
            qty: mismatch["Quantity"] || mismatch["Lifting Quantity"] || "0",
            returnReason: mismatch["Remarks"] || "",
            liftNo: mismatch["Lift Number"] || "",
            firmName: mismatch["Firm Name"] || "",
            mismatch_id: mismatch.id,
            id: null,
        });
        setShowForm(true);
    };

    // ── Open form for editing existing finalized record ────────────────────
    const handleEditRecord = (rec) => {
        setForm({
            purchaseReturnNo: rec["Purchase Return No."],
            poNo: rec["Po No."],
            actionType: rec["Action Type"],
            partyName: rec["Party Name"],
            productName: rec["Product Name"],
            qty: rec["Qty"],
            returnReason: rec["Return Reason"],
            transport: rec["Transport"],
            typeOfTransport: rec["Type of Transport"],
            vehicleNo: rec["Vehicle No"],
            builtyNo: rec["Builty No"],
            rateType: rec["Rate Type"],
            amount: rec["Amount"],
            orgBillNo: rec["Org. Bill No"],
            billNo: rec["Bill No"] || rec["Bill No."],
            billCopy: rec["Bill Copy"] || rec["Bill Image"],
            liftNo: rec["Lift No"],
            firmName: rec["Firm Name"],
            mismatch_id: rec.mismatch_id,
            id: rec.id,
        });
        setShowForm(true);
    };

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    // ── When Po No. changes (optional additional logic) ────────────────────
    const handlePoNoBlur = async (poNo) => {
        if (!poNo) return;
        try {
            const { data, error } = await supabase
                .from("LIFT-ACCOUNTS")
                .select("*")
                .eq("Indent Number", poNo)
                .maybeSingle();

            if (data && !error) {
                setForm(prev => ({
                    ...prev,
                    billNo: data["Bill No."] || prev.billNo,
                    billCopy: data["Bill Copy"] || prev.billCopy,
                    partyName: data["Party Name"] || prev.partyName,
                    productName: data["Product Name"] || prev.productName,
                }));
            }
        } catch (err) {
            console.error("Auto-fetch error:", err);
        }
    };

    // ── Submission Logic ───────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!form.purchaseReturnNo || !form.qty) {
            toast.warning("Please provide PR No. and Quantity.");
            return;
        }

        setSubmitting(true);
        try {
            const istOffset = 5.5 * 60 * 60 * 1000;
            const istDate = new Date(Date.now() + istOffset);
            const istTimestamp = istDate.toISOString().replace("Z", "+05:30");

            const payload = {
                "Time Stamp": istTimestamp,
                "Purchase Return No.": form.purchaseReturnNo,
                "Po No.": form.poNo || null,
                "Action Type": form.actionType || "Purchase Return",
                "Party Name": form.partyName || null,
                "Product Name": form.productName || null,
                "Qty": form.qty || 0,
                "Return Reason": form.returnReason || null,
                "Transport": form.transport || null,
                "Type of Transport": form.typeOfTransport || null,
                "Vehicle No": form.vehicleNo || null,
                "Builty No": form.builtyNo || null,
                "Rate Type": form.rateType || null,
                "Amount": form.amount || null,
                "Org. Bill No": form.orgBillNo || null,
                "Lift No": form.liftNo || null,
                "Firm Name": form.firmName || user?.firmName || null,
                mismatch_id: form.mismatch_id || null,
            };

            if (form.id) {
                // UPDATE
                const { error } = await supabase
                    .from("Purchase Returns")
                    .update(payload)
                    .eq("id", form.id);
                if (error) throw error;
            } else {
                // INSERT
                const { error } = await supabase
                    .from("Purchase Returns")
                    .insert([payload]);
                if (error) throw error;

                // Also update the Mismatch record status to indicate it's been processed
                if (form.mismatch_id) {
                    await supabase
                        .from("Mismatch")
                        .update({ Status: "Resolved - Return" })
                        .eq("id", form.mismatch_id);
                }
            }

            toast.success("✅ Purchase Return saved successfully!");
            setShowForm(false);
            setForm(EMPTY_FORM);
            fetchRecords();
        } catch (err) {
            console.error("Submit error:", err);
            toast.error(`❌ Failed to save: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (val) => {
        if (!val) return "—";
        try {
            return new Date(val).toLocaleString("en-GB", { hour12: false }).replace(",", "");
        } catch {
            return val;
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 rounded-xl">
                        <RotateCcw className="w-6 h-6 text-[#6b8e2f]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Purchase Return</h1>
                        <p className="text-sm text-gray-500 font-medium">Manage and track material returns and credit notes</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={fetchRecords} variant="outline" size="sm" className="h-10" disabled={loading}>
                        <Loader2 className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button onClick={handleOpenForm} className="h-10 bg-[#6b8e2f] hover:bg-[#5a7a27] text-white shadow-lg">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Purchase Return
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-white border rounded-lg p-1">
                    <TabsTrigger value="finalized" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700 h-9 px-4">
                        Finalized Returns ({records.length})
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 h-9 px-4">
                        Pending Mismatches ({pendingMismatches.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="finalized">
                    <Card>
                        <CardHeader className="pb-3 border-b border-gray-50 bg-gray-50/30">
                            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#7da23a]" />
                                Finalized Return Records
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                                    <span>Loading finalized returns...</span>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-gray-50">
                                            <TableRow>
                                                <TableHead className="w-[50px]">#</TableHead>
                                                <TableHead>PR No.</TableHead>
                                                <TableHead>PO No.</TableHead>
                                                <TableHead>Party Name</TableHead>
                                                <TableHead>Product Name</TableHead>
                                                <TableHead>Qty</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {records.map((rec, idx) => (
                                                <TableRow key={rec.id} className="hover:bg-green-50/50 transition-colors">
                                                    <TableCell className="text-gray-500 font-mono text-xs">{idx + 1}</TableCell>
                                                    <TableCell className="font-medium text-[#6b8e2f]">{rec["Purchase Return No."]}</TableCell>
                                                    <TableCell className="text-sm">{rec["Po No."] || "—"}</TableCell>
                                                    <TableCell className="text-sm italic">{rec["Party Name"]}</TableCell>
                                                    <TableCell className="text-sm">{rec["Product Name"]}</TableCell>
                                                    <TableCell className="font-semibold">{rec["Qty"]}</TableCell>
                                                    <TableCell className="text-right flex items-center justify-end gap-2">
                                                        <Button variant="ghost" size="sm" onClick={() => setViewRecord(rec)}>
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleEditRecord(rec)}>
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {records.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-16 text-gray-400">No finalized returns found.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pending">
                    <Card>
                        <CardHeader className="pb-3 border-b border-orange-50 bg-orange-50/10">
                            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                                <RotateCcw className="w-4 h-4 text-orange-500" />
                                Pending Mismatches Needs Return
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-gray-50">
                                        <TableRow>
                                            <TableHead className="w-[50px]">#</TableHead>
                                            <TableHead>Lift No</TableHead>
                                            <TableHead>PO No</TableHead>
                                            <TableHead>Party Name</TableHead>
                                            <TableHead>Product Name</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingMismatches.map((m, idx) => (
                                            <TableRow key={m.id} className="hover:bg-orange-50/30 transition-colors">
                                                <TableCell className="text-gray-500 font-mono text-xs">{idx + 1}</TableCell>
                                                <TableCell className="font-medium text-orange-700">{m["Lift Number"]}</TableCell>
                                                <TableCell className="text-sm">{m["Indent Number"] || "—"}</TableCell>
                                                <TableCell className="text-sm italic">{m["Party Name"]}</TableCell>
                                                <TableCell className="text-sm">{m["Product Name"]}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button 
                                                        size="sm" 
                                                        className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
                                                        onClick={() => handleCreateFromMismatch(m)}
                                                    >
                                                        <Plus className="w-4 h-4 mr-1" />
                                                        Create PR
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {pendingMismatches.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-16 text-gray-400">No pending mismatches found.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Modal Form */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Purchase Return Details</h3>
                                    <p className="text-sm text-gray-500 font-medium">Finalize return and transport info</p>
                                </div>
                                <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-gray-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">PR Number</label>
                                        <input type="text" value={form.purchaseReturnNo} readOnly className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">PO / Indent No</label>
                                        <input type="text" value={form.poNo} onChange={(e) => handleChange("poNo", e.target.value)} onBlur={(e) => handlePoNoBlur(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Party Name</label>
                                        <input type="text" value={form.partyName} readOnly={form.id !== null} onChange={(e) => handleChange("partyName", e.target.value)} className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${form.id !== null ? "bg-gray-50 border-gray-200" : "border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500"}`} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Product Name</label>
                                        <input type="text" value={form.productName} readOnly={form.id !== null} onChange={(e) => handleChange("productName", e.target.value)} className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${form.id !== null ? "bg-gray-50 border-gray-200" : "border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500"}`} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Quantity</label>
                                        <input type="number" value={form.qty} readOnly={form.id !== null} onChange={(e) => handleChange("qty", e.target.value)} className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${form.id !== null ? "bg-gray-50 border-gray-200" : "border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500"}`} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Return Reason</label>
                                        <input type="text" value={form.returnReason} onChange={(e) => handleChange("returnReason", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all" placeholder="Reason for return" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Transporter Name</label>
                                        <input type="text" value={form.transport} onChange={(e) => handleChange("transport", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all" placeholder="Enter transporter" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Vehicle Number</label>
                                        <input type="text" value={form.vehicleNo} onChange={(e) => handleChange("vehicleNo", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all" placeholder="e.g. WB 12 XX XXXX" />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4 mt-6 border-t border-gray-100">
                                    <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1 h-12 rounded-xl text-gray-600 border-gray-200">Cancel</Button>
                                    <Button onClick={handleSubmit} disabled={submitting} className="flex-1 h-12 rounded-xl bg-[#6b8e2f] hover:bg-[#5a7a27] text-white shadow-lg">
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                        Finalize Purchase Return
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {viewRecord && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Record View</h3>
                                    <p className="text-sm text-[#6b8e2f] font-medium">{viewRecord["Purchase Return No."]}</p>
                                </div>
                                <button onClick={() => setViewRecord(null)} className="p-2 text-gray-400 hover:text-gray-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-medium">
                                {[
                                    ["Purchase Return No.", viewRecord["Purchase Return No."]],
                                    ["PO No.", viewRecord["Po No."]],
                                    ["Bill No.", viewRecord["Bill No"] || viewRecord["Bill No."]],
                                    ["Party Name", viewRecord["Party Name"]],
                                    ["Product Name", viewRecord["Product Name"]],
                                    ["Qty", viewRecord["Qty"]],
                                    ["Action Type", viewRecord["Action Type"]],
                                    ["Return Reason", viewRecord["Return Reason"]],
                                    ["Transport", viewRecord["Transport"]],
                                    ["Vehicle No", viewRecord["Vehicle No"]],
                                    ["Lift No", viewRecord["Lift No"]],
                                    ["Date", formatDate(viewRecord["Time Stamp"])],
                                ].map(([label, value]) => (
                                    <div key={label} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-widest">{label}</p>
                                        <p className="text-gray-900">{value || "—"}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end pt-8 mt-8 border-t border-gray-100">
                                <Button onClick={() => setViewRecord(null)} variant="outline" className="rounded-xl px-8 h-10 font-semibold">Close</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
