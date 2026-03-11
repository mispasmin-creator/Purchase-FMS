"use client";
import { useState, useEffect, useCallback, useContext } from "react";
import {
    Loader2,
    Plus,
    X,
    Save,
    RefreshCw,
    RotateCcw,
    FileText,
    Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "../supabase";
import { AuthContext } from "../context/AuthContext";

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
};

export default function PurchaseReturnPage() {
    const { user } = useContext(AuthContext);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [viewRecord, setViewRecord] = useState(null);

    // ── Fetch all Purchase Returns ──────────────────────────────────────────
    const fetchRecords = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("Purchase Returns")
                .select("*")
                .order("Time Stamp", { ascending: false });

            if (error) throw error;
            let fetchedData = data || [];

            // Filter by Firm Name
            if (user?.firmName && user.firmName.toLowerCase() !== "all") {
                const userFirmNameLower = user.firmName.toLowerCase();
                fetchedData = fetchedData.filter(
                    (rec) => rec["Firm Name"] && String(rec["Firm Name"]).toLowerCase().trim() === userFirmNameLower
                );
            }

            setRecords(fetchedData);
        } catch (err) {
            console.error("Failed to fetch Purchase Returns:", err);
            toast.error("Failed to load Purchase Returns.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    // ── Auto-generate PR No. ───────────────────────────────────────────────
    const generatePRNumber = async () => {
        try {
            const { count } = await supabase
                .from("Purchase Returns")
                .select("*", { count: "exact", head: true });
            const nextSeq = (count || 0) + 1;
            return `PR-${String(nextSeq).padStart(2, "0")}`;
        } catch {
            return "PR-01";
        }
    };

    // ── Open form ──────────────────────────────────────────────────────────
    const handleOpenForm = async () => {
        const prNo = await generatePRNumber();
        setForm({ ...EMPTY_FORM, purchaseReturnNo: prNo });
        setShowForm(true);
    };

    // ── When Po No. changes, auto-fetch Bill No. & Bill Copy from LIFT-ACCOUNTS ──
    const handlePoNoBlur = async (poNo) => {
        const trimmed = poNo.trim();
        if (!trimmed) return;
        try {
            const { data, error } = await supabase
                .from("LIFT-ACCOUNTS")
                .select('"Bill No.", "Bill Image"')
                .eq('Indent no.', trimmed)
                .limit(1);
            if (error || !data || data.length === 0) return;
            const row = data[0];
            setForm(prev => ({
                ...prev,
                billNo: String(row["Bill No."] || "").trim(),
                billCopy: String(row["Bill Image"] || "").trim(),
            }));
        } catch (err) {
            console.warn("Could not fetch Bill No./Bill Copy:", err);
        }
    };

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    // ── Submit new Purchase Return ─────────────────────────────────────────
    const handleSubmit = async () => {
        if (!form.purchaseReturnNo || !form.poNo || !form.qty) {
            toast.error("Please select a Lift No. and fill required fields (PR No., PO No., Qty).");
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
                "Po No.": form.poNo,
                "Action Type": form.actionType || null,
                "Party Name": form.partyName || null,
                "Product Name": form.productName || null,
                Qty: parseInt(form.qty) || 0,
                "Return Reason": form.returnReason || null,
                Transport: form.transport || null,
                "Type of Transport": form.typeOfTransport || null,
                "Vehicle No": form.vehicleNo || null,
                "Builty No": form.builtyNo || null,
                "Rate Type": form.rateType || null,
                Amount: form.amount ? parseFloat(form.amount) : null,
                "Org. Bill No": form.orgBillNo || null,
                "Lift No": null,
                "Firm Name": user?.firmName || null,
            };

            const { error } = await supabase
                .from("Purchase Returns")
                .insert([payload]);

            if (error) throw error;

            toast.success("✅ Purchase Return added successfully!");
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

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Purchase Returns</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage all purchase return records
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchRecords}
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={handleOpenForm}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Purchase Return
                    </Button>
                </div>
            </div>

            {/* Summary card */}
            <Card className="border border-purple-100 bg-purple-50">
                <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <RotateCcw className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-purple-700">{records.length}</p>
                            <p className="text-sm text-purple-600">Total Purchase Returns</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-600" />
                        Purchase Return List
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                            <span className="ml-3 text-gray-500">Loading records...</span>
                        </div>
                    ) : records.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <RotateCcw className="w-12 h-12 mb-3 opacity-30" />
                            <p className="text-sm">No purchase returns found.</p>
                            <p className="text-xs text-gray-400 mt-1">
                                Click "Add Purchase Return" to create the first entry.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50">
                                        <TableHead className="whitespace-nowrap">#</TableHead>
                                        <TableHead className="whitespace-nowrap">PR No.</TableHead>
                                        <TableHead className="whitespace-nowrap">PO No.</TableHead>
                                        <TableHead className="whitespace-nowrap">Party Name</TableHead>
                                        <TableHead className="whitespace-nowrap">Product Name</TableHead>
                                        <TableHead className="whitespace-nowrap">Qty</TableHead>
                                        <TableHead className="whitespace-nowrap">Action Type</TableHead>
                                        <TableHead className="whitespace-nowrap">Amount</TableHead>
                                        <TableHead className="whitespace-nowrap">Date</TableHead>
                                        <TableHead className="whitespace-nowrap">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {records.map((rec, idx) => (
                                        <TableRow
                                            key={rec.id || idx}
                                            className="hover:bg-purple-50 transition-colors"
                                        >
                                            <TableCell className="text-gray-500 text-sm">{idx + 1}</TableCell>
                                            <TableCell className="font-medium text-purple-700 whitespace-nowrap">
                                                {rec["Purchase Return No."] || "—"}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {rec["Po No."] || "—"}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {rec["Party Name"] || "—"}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {rec["Product Name"] || "—"}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {rec["Qty"] ?? "—"}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {rec["Action Type"] || "—"}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {rec["Amount"] != null ? `₹${rec["Amount"]}` : "—"}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(rec["Time Stamp"])}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                                                    onClick={() => setViewRecord(rec)}
                                                >
                                                    <Eye className="w-4 h-4 mr-1" />
                                                    View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Add Purchase Return Form Modal ── */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-gray-900">
                                    Purchase Return Details
                                </h3>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Form Fields — exactly same as Mismatch */}
                            <div className="border border-blue-100 rounded-lg p-4 bg-blue-50 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                                    {/* 1. Purchase Return No. — readOnly auto */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Purchase Return No. <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={form.purchaseReturnNo}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm cursor-not-allowed"
                                        />
                                    </div>

                                    {/* 2. Po No. — editable, onBlur fetches Bill No. & Bill Copy from LIFT-ACCOUNTS */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Po No. <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={form.poNo}
                                            onChange={(e) => handleChange("poNo", e.target.value)}
                                            onBlur={(e) => handlePoNoBlur(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            placeholder="Enter PO / Indent number"
                                        />
                                    </div>

                                    {/* 3. Bill No. — readOnly (auto-filled from lift) */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Bill No.
                                        </label>
                                        <input
                                            type="text"
                                            value={form.billNo}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm cursor-not-allowed"
                                        />
                                    </div>

                                    {/* 4. Bill Copy — readOnly (auto-filled from lift) */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Bill Copy
                                        </label>
                                        {form.billCopy && String(form.billCopy).startsWith("http") ? (
                                            <a
                                                href={form.billCopy}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center px-3 py-2 text-xs text-blue-600 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 cursor-pointer"
                                            >
                                                View Bill Copy
                                            </a>
                                        ) : (
                                            <input
                                                type="text"
                                                value={form.billCopy || "N/A"}
                                                readOnly
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm cursor-not-allowed"
                                            />
                                        )}
                                    </div>

                                    {/* 5. Action Type — editable */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Action Type
                                        </label>
                                        <input
                                            type="text"
                                            value={form.actionType}
                                            onChange={(e) => handleChange("actionType", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            placeholder="e.g. Full Return"
                                        />
                                    </div>

                                    {/* 6. Party Name — readOnly (auto-filled from lift) */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Party Name
                                        </label>
                                        <input
                                            type="text"
                                            value={form.partyName}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm cursor-not-allowed"
                                        />
                                    </div>

                                    {/* 7. Product Name — readOnly (auto-filled from lift) */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Product Name
                                        </label>
                                        <input
                                            type="text"
                                            value={form.productName}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm cursor-not-allowed"
                                        />
                                    </div>

                                    {/* 8. Qty — readOnly (auto-filled from lift) */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Qty <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={form.qty}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm cursor-not-allowed"
                                        />
                                    </div>

                                    {/* 9. Return Reason — editable */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Return Reason
                                        </label>
                                        <input
                                            type="text"
                                            value={form.returnReason}
                                            onChange={(e) => handleChange("returnReason", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            placeholder="Reason for return"
                                        />
                                    </div>

                                    {/* 10. Transport — editable */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Transport
                                        </label>
                                        <input
                                            type="text"
                                            value={form.transport}
                                            onChange={(e) => handleChange("transport", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            placeholder="Transporter name"
                                        />
                                    </div>

                                    {/* 11. Type of Transport — editable (select) */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Type of Transport
                                        </label>
                                        <select
                                            value={form.typeOfTransport}
                                            onChange={(e) => handleChange("typeOfTransport", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                                        >
                                            <option value="">-- Select Type --</option>
                                            <option value="Logistics">Logistics</option>
                                            <option value="Paid by Us">Paid by Us</option>
                                            <option value="Paid by Party">Paid by Party</option>
                                        </select>
                                    </div>

                                    {/* 12. Vehicle No — editable */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Vehicle No
                                        </label>
                                        <input
                                            type="text"
                                            value={form.vehicleNo}
                                            onChange={(e) => handleChange("vehicleNo", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            placeholder="Vehicle number"
                                        />
                                    </div>

                                    {/* 13. Builty No — editable */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Builty No
                                        </label>
                                        <input
                                            type="text"
                                            value={form.builtyNo}
                                            onChange={(e) => handleChange("builtyNo", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            placeholder="Builty number"
                                        />
                                    </div>

                                    {/* 14. Rate Type — editable */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Rate Type
                                        </label>
                                        <input
                                            type="text"
                                            value={form.rateType}
                                            onChange={(e) => handleChange("rateType", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            placeholder="e.g. Per MT"
                                        />
                                    </div>

                                    {/* 15. Amount — editable */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Amount
                                        </label>
                                        <input
                                            type="number"
                                            value={form.amount}
                                            onChange={(e) => handleChange("amount", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            placeholder="Enter amount"
                                        />
                                    </div>

                                    {/* 16. Org. Bill No — editable */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Org. Bill No
                                        </label>
                                        <input
                                            type="text"
                                            value={form.orgBillNo}
                                            onChange={(e) => handleChange("orgBillNo", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            placeholder="Original bill number"
                                        />
                                    </div>

                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
                                <button
                                    onClick={() => setShowForm(false)}
                                    disabled={submitting}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                    {submitting ? (
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4 mr-2" />
                                    )}
                                    {submitting ? "Saving..." : "Save Purchase Return"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── View Record Modal ── */}
            {viewRecord && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-xl font-semibold text-gray-900">
                                    Purchase Return — {viewRecord["Purchase Return No."] || "Details"}
                                </h3>
                                <button
                                    onClick={() => setViewRecord(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                {[
                                    ["Purchase Return No.", viewRecord["Purchase Return No."]],
                                    ["PO No.", viewRecord["Po No."]],
                                    ["Bill No.", viewRecord["Bill No"]],
                                    ["Party Name", viewRecord["Party Name"]],
                                    ["Product Name", viewRecord["Product Name"]],
                                    ["Qty", viewRecord["Qty"]],
                                    ["Action Type", viewRecord["Action Type"]],
                                    ["Return Reason", viewRecord["Return Reason"]],
                                    ["Transport", viewRecord["Transport"]],
                                    ["Type of Transport", viewRecord["Type of Transport"]],
                                    ["Vehicle No", viewRecord["Vehicle No"]],
                                    ["Builty No", viewRecord["Builty No"]],
                                    ["Rate Type", viewRecord["Rate Type"]],
                                    ["Amount", viewRecord["Amount"] != null ? `₹${viewRecord["Amount"]}` : null],
                                    ["Org. Bill No", viewRecord["Org. Bill No"]],
                                    ["Lift No", viewRecord["Lift No"]],
                                    ["Date", formatDate(viewRecord["Time Stamp"])],
                                ].map(([label, value]) => (
                                    <div key={label} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                                        <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
                                        <p className="text-gray-900 font-medium">{value || "—"}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end pt-5 mt-5 border-t border-gray-200">
                                <button
                                    onClick={() => setViewRecord(null)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
