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
    const [activeTab, setActiveTab] = useState("pending");
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
            const [
                { data: mismatchData, error: mismatchError },
                { data: coordinatedReturnData, error: coordinatedReturnError },
            ] = await Promise.all([
                supabase
                    .from("Mismatch")
                    .select("*")
                    .eq("Status", "Purchase Return")
                    .eq("coordination_status", "COORDINATED"),
                supabase
                    .from("purchaser_coordinates")
                    .select("*")
                    .eq("status", "COORDINATED")
                    .eq("type", "Return Material and Make Debit Note"),
            ]);

            if (mismatchError) throw mismatchError;
            if (coordinatedReturnError) throw coordinatedReturnError;

            let fetchedReturns = returnData || [];
            let fetchedMismatches = mismatchData || [];

            const existingPendingIds = new Set(
                fetchedMismatches.map((m) => String(m.id || "").trim()).filter(Boolean)
            );
            const coordinatedMismatchIds = (coordinatedReturnData || [])
                .map((item) => String(item.mismatch_id || "").trim())
                .filter((id) => id && !existingPendingIds.has(id));

            if (coordinatedMismatchIds.length > 0) {
                const { data: fallbackMismatchData, error: fallbackMismatchError } = await supabase
                    .from("Mismatch")
                    .select("*")
                    .in("id", coordinatedMismatchIds);

                if (fallbackMismatchError) throw fallbackMismatchError;
                fetchedMismatches = [...fetchedMismatches, ...(fallbackMismatchData || [])];
            }

            // Calculate total returned quantity per mismatch
            const returnedQtyMap = {};
            fetchedReturns.forEach(r => {
                const mId = String(r.mismatch_id || "").trim();
                if (mId) {
                    returnedQtyMap[mId] = (returnedQtyMap[mId] || 0) + (parseFloat(r.Qty) || 0);
                }
            });

            // Fetch LIFT-ACCOUNTS data for these mismatches to get the correct received quantity
            const liftNos = Array.from(
                new Set(
                    fetchedMismatches
                        .map(m => m["Lift Number"] || m["Lift ID"])
                        .filter(Boolean)
                )
            );

            let liftAccounts = [];
            if (liftNos.length > 0) {
                const { data: liftData, error: liftError } = await supabase
                    .from("LIFT-ACCOUNTS")
                    .select('"Lift No", "Actual Quantity"')
                    .in("Lift No", liftNos);
                if (!liftError && liftData) {
                    liftAccounts = liftData;
                }
            }

            const liftQtyMap = {};
            liftAccounts.forEach(la => {
                const lNo = String(la["Lift No"] || "").trim();
                if (lNo) {
                    liftQtyMap[lNo] = parseFloat(la["Actual Quantity"]) || 0;
                }
            });

            // Keep track of pending quantity for each mismatch and filter out completed ones
            fetchedMismatches = fetchedMismatches.map(m => {
                const mId = String(m.id || "").trim();
                const liftNo = String(m["Lift Number"] || m["Lift ID"] || "").trim();
                
                // Prioritize received quantity from LIFT-ACCOUNTS (Actual Quantity) if available, fallback to mismatch fields
                const receivedQty = liftQtyMap[liftNo];
                const totalQty = (receivedQty !== undefined && receivedQty > 0)
                    ? receivedQty
                    : (parseFloat(m["Qty"]) || parseFloat(m["Quantity"]) || parseFloat(m["Lifting Quantity"]) || 0);

                const returnedQty = returnedQtyMap[mId] || 0;
                const pendingQty = Math.max(0, totalQty - returnedQty);
                return {
                    ...m,
                    pendingQty: pendingQty,
                    totalQty: totalQty,
                    returnedQty: returnedQty
                };
            }).filter(m => m.pendingQty > 0);

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
            actionType: mismatch["Action Type"] || "Purchase Return",
            partyName: mismatch["Party Name"] || "",
            productName: mismatch["Product Name"] || "",
            qty: mismatch.pendingQty !== undefined ? String(mismatch.pendingQty) : (mismatch["Qty"] || mismatch["Quantity"] || mismatch["Lifting Quantity"] || "0"),
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

    const updateMismatchStatus = async (mismatchId, actionType) => {
        if (!mismatchId) return;
        try {
            const { data: mismatch, error: mismatchFetchError } = await supabase
                .from("Mismatch")
                .select("*")
                .eq("id", mismatchId)
                .single();

            if (mismatchFetchError || !mismatch) throw mismatchFetchError || new Error("Mismatch not found");

            const { data: allReturns, error: returnsFetchError } = await supabase
                .from("Purchase Returns")
                .select("Qty")
                .eq("mismatch_id", mismatchId);

            if (returnsFetchError) throw returnsFetchError;

            // Fetch LIFT-ACCOUNTS to get actual received quantity as base
            let totalQty = 0;
            const liftNo = String(mismatch["Lift Number"] || mismatch["Lift ID"] || "").trim();
            if (liftNo) {
                const { data: liftData, error: liftError } = await supabase
                    .from("LIFT-ACCOUNTS")
                    .select('"Actual Quantity"')
                    .eq("Lift No", liftNo)
                    .maybeSingle();
                
                if (!liftError && liftData && liftData["Actual Quantity"]) {
                    totalQty = parseFloat(liftData["Actual Quantity"]) || 0;
                }
            }

            if (!totalQty) {
                totalQty = parseFloat(mismatch["Qty"]) || parseFloat(mismatch["Quantity"]) || parseFloat(mismatch["Lifting Quantity"]) || 0;
            }

            const totalReturned = (allReturns || []).reduce((sum, r) => sum + (parseFloat(r.Qty) || 0), 0);

            if (totalReturned >= totalQty) {
                const shouldMakeDebitAfterReturn =
                    actionType === "Return Material and Make Debit Note";

                const mismatchUpdate = shouldMakeDebitAfterReturn
                    ? {
                        Status: "Credit Notes",
                        coordination_status: "COORDINATED",
                        "Action Type": "Make Debit Note",
                    }
                    : {
                        Status: "Resolved - Return",
                        "Action Type": actionType,
                    };

                await supabase
                    .from("Mismatch")
                    .update(mismatchUpdate)
                    .eq("id", mismatchId);
            } else {
                const mismatchUpdate = {
                    Status: "Purchase Return",
                    coordination_status: "COORDINATED",
                    "Action Type": actionType,
                };
                await supabase
                    .from("Mismatch")
                    .update(mismatchUpdate)
                    .eq("id", mismatchId);
            }
        } catch (err) {
            console.error("Error updating mismatch status:", err);
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

                if (form.mismatch_id) {
                    await updateMismatchStatus(form.mismatch_id, form.actionType);
                }
            } else {
                // INSERT
                const { error } = await supabase
                    .from("Purchase Returns")
                    .insert([payload]);
                if (error) throw error;

                // Also update the Mismatch record status to indicate it's been processed
                if (form.mismatch_id) {
                    await updateMismatchStatus(form.mismatch_id, form.actionType);
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
                    <TabsTrigger value="pending" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 h-9 px-4">
                        Pending Mismatches ({pendingMismatches.length})
                    </TabsTrigger>
                    <TabsTrigger value="finalized" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700 h-9 px-4">
                        Finalized Returns ({records.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="finalized">
                    <Card className="shadow-sm border border-border overflow-hidden flex flex-col">
                        <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/30">
                            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#7da23a]" />
                                Finalized Return Records
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 flex flex-col">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                                    <span>Loading finalized returns...</span>
                                </div>
                            ) : (
                                <div className="overflow-auto max-h-[calc(100vh-250px)] relative custom-scrollbar">
                                    <table className="w-full text-sm border-collapse">
                                        <thead className="sticky top-0 z-30">
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Actions</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm w-[60px]">#</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">PR No.</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">PO No.</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Party Name</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Product Name</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {records.map((rec, idx) => (
                                                <tr key={rec.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-green-50/50 transition-colors border-b border-gray-100`}>
                                                    <td className="px-4 py-3 whitespace-nowrap text-left">
                                                        <div className="flex items-center justify-start gap-1">
                                                            <Button variant="ghost" size="xs" className="h-7 w-7 p-0 text-[#7da23a] hover:bg-[#7da23a]/10" onClick={() => setViewRecord(rec)}>
                                                                <Eye className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button variant="ghost" size="xs" className="h-7 w-7 p-0 text-primary hover:bg-primary/10" onClick={() => handleEditRecord(rec)}>
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono text-xs">{idx + 1}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap font-bold text-[#6b8e2f]">{rec["Purchase Return No."]}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-primary">{rec["Po No."] || "—"}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 italic font-medium">{rec["Party Name"]}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{rec["Product Name"]}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap font-bold text-gray-900">{rec["Qty"]}</td>
                                                </tr>
                                            ))}
                                            {records.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 bg-gray-50/30">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <RotateCcw className="w-10 h-10 text-gray-300 mb-3 opacity-20" />
                                                            <p className="text-sm font-medium">No finalized returns found.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pending">
                    <Card className="shadow-sm border border-border overflow-hidden flex flex-col">
                        <CardHeader className="pb-3 border-b border-orange-100 bg-orange-50/20">
                            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                                <RotateCcw className="w-4 h-4 text-orange-500" />
                                Pending Mismatches Needs Return
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 flex flex-col">
                            <div className="overflow-auto max-h-[calc(100vh-250px)] relative custom-scrollbar">
                                <table className="w-full text-sm border-collapse">
                                    <thead className="sticky top-0 z-30">
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Actions</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm w-[60px]">#</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Lift No</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">PO No</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Party Name</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Product Name</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {pendingMismatches.map((m, idx) => (
                                            <tr key={m.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-orange-50/10'} hover:bg-orange-50/20 transition-colors border-b border-gray-100`}>
                                                <td className="px-4 py-3 whitespace-nowrap text-left">
                                                    <Button 
                                                        size="xs" 
                                                        className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm h-7 text-[10px] font-bold uppercase tracking-wider px-3"
                                                        onClick={() => handleCreateFromMismatch(m)}
                                                    >
                                                        <Plus className="w-3 h-3 mr-1" />
                                                        Create PR
                                                    </Button>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono text-xs">{idx + 1}</td>
                                                <td className="px-4 py-3 whitespace-nowrap font-bold text-orange-700">{m["Lift Number"]}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-primary">{m["Indent Number"] || "—"}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 italic font-medium">{m["Party Name"]}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{m["Product Name"]}</td>
                                            </tr>
                                        ))}
                                        {pendingMismatches.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 bg-gray-50/30">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <RotateCcw className="w-10 h-10 text-gray-300 mb-3 opacity-20" />
                                                        <p className="text-sm font-medium">No pending mismatches found.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
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
