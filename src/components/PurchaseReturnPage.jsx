import React, { useState, useEffect, useCallback, useContext } from "react";
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

const normalizeFirmName = (val) => {
    if (!val) return null;
    if (Array.isArray(val)) {
        return val[0] || null;
    }
    const str = String(val).trim();
    if (str.startsWith("[") && str.endsWith("]")) {
        try {
            const parsed = JSON.parse(str);
            if (Array.isArray(parsed)) {
                return parsed[0] || null;
            }
        } catch (e) {
            // Ignore parse error
        }
    }
    return str;
};

const EMPTY_FORM = {
    purchaseReturnNo: "",
    poNo: "",
    actionType: "",
    partyName: "",
    productName: "",
    qty: "",
    totalReturnQty: "",
    returnThisTime: "",
    returnedQtyBefore: 0,
    maxReturnQty: 0,
    hasFixedTotalReturnQty: false,
    returnReason: "",
    transport: "",
    typeOfTransport: "",
    vehicleNo: "",
    builtyNo: "",
    rateType: "",
    amount: "",
    productRate: "",
    orgBillNo: "",
    billNo: "",
    billCopy: "",
    creditNoteUrl: "",
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
    const [availableLifts, setAvailableLifts] = useState([]);
    const [creditNoteImageFile, setCreditNoteImageFile] = useState(null);

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

            // 2. Fetch Pending Mismatches and LIFT-ACCOUNTS
            const [
                { data: mismatchData, error: mismatchError },
                { data: coordinatedReturnData, error: coordinatedReturnError },
                { data: liftAccountsData, error: liftAccountsError },
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
                supabase
                    .from("LIFT-ACCOUNTS")
                    .select("*")
                    .order("Timestamp", { ascending: false }),
            ]);

            if (mismatchError) throw mismatchError;
            if (coordinatedReturnError) throw coordinatedReturnError;
            if (liftAccountsError) throw liftAccountsError;

            let fetchedReturns = returnData || [];
            let fetchedMismatches = mismatchData || [];
            let fetchedLifts = liftAccountsData || [];

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

            // Deduplicate by mismatch id (safety guard for double-fetch edge cases)
            const seenMismatchIds = new Set();
            fetchedMismatches = fetchedMismatches.filter(m => {
                const mId = String(m.id || "").trim();
                if (!mId || seenMismatchIds.has(mId)) return false;
                seenMismatchIds.add(mId);
                return true;
            });

            // Build returned qty maps — keyed by BOTH mismatch_id AND Lift No
            const returnedQtyMap = {};         // by mismatch_id
            const totalReturnQtyMap = {};      // by mismatch_id
            const returnedQtyByLiftMap = {};   // by Lift No (covers records with no mismatch_id)
            const totalReturnQtyByLiftMap = {};// by Lift No

            fetchedReturns.forEach(r => {
                const mId = String(r.mismatch_id || "").trim();
                const liftNo = String(r["Lift No"] || "").trim();
                const returnedThisTime = parseFloat(r["Return This Time"]) || parseFloat(r["Qty"]) || 0;
                const configuredTotal = parseFloat(r["Total Return Qty"]) || 0;

                // Group by mismatch_id
                if (mId) {
                    returnedQtyMap[mId] = (returnedQtyMap[mId] || 0) + returnedThisTime;
                    if (configuredTotal > 0) {
                        totalReturnQtyMap[mId] = Math.max(totalReturnQtyMap[mId] || 0, configuredTotal);
                    }
                }
                // Group by Lift No (handles records where mismatch_id is null)
                if (liftNo) {
                    returnedQtyByLiftMap[liftNo] = (returnedQtyByLiftMap[liftNo] || 0) + returnedThisTime;
                    if (configuredTotal > 0) {
                        totalReturnQtyByLiftMap[liftNo] = Math.max(totalReturnQtyByLiftMap[liftNo] || 0, configuredTotal);
                    }
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

                // Merge both lookup sources — take max returned qty (most accurate)
                const returnedByMismatchId = returnedQtyMap[mId] || 0;
                const returnedByLiftNo = returnedQtyByLiftMap[liftNo] || 0;
                const returnedQty = Math.max(returnedByMismatchId, returnedByLiftNo);

                // configuredTotalReturnQty — prefer mismatch_id lookup, fallback to Lift No lookup
                const configuredTotalReturnQty =
                    totalReturnQtyMap[mId] || totalReturnQtyByLiftMap[liftNo] || 0;

                // returnTargetQty: prefer user-configured total, then liftAccount qty, then mismatch qty
                const returnTargetQty = configuredTotalReturnQty > 0
                    ? configuredTotalReturnQty
                    : totalQty;
                // How much is still pending — use floating point tolerance of 0.001
                const pendingQty = Math.max(0, returnTargetQty - returnedQty);
                // A mismatch is still "pending" if:
                // 1. pendingQty > 0.001 (more to return), OR
                // 2. No returns have been made at all and target qty is known
                const isStillPending = pendingQty > 0.001 || (returnedQty === 0 && returnTargetQty > 0);
                return {
                    ...m,
                    pendingQty: pendingQty,
                    totalQty: totalQty,
                    returnedQty: returnedQty,
                    totalReturnQty: configuredTotalReturnQty,
                    returnTargetQty: returnTargetQty,
                    isStillPending,
                };
            }).filter(m => m.isStillPending);

            // Deduplicate by Lift Number — if two Mismatch rows exist for the same lift,
            // keep the one with the higher pendingQty (most work remaining)
            const seenLiftNos = new Map();
            fetchedMismatches.forEach(m => {
                const liftNo = String(m["Lift Number"] || m["Lift ID"] || "").trim();
                if (!liftNo) return;
                const existing = seenLiftNos.get(liftNo);
                if (!existing || m.pendingQty > existing.pendingQty) {
                    seenLiftNos.set(liftNo, m);
                }
            });
            // Also keep mismatches without a lift number (manual entries), dedup by mismatch id
            const noLiftEntries = fetchedMismatches.filter(m => {
                const liftNo = String(m["Lift Number"] || m["Lift ID"] || "").trim();
                return !liftNo;
            });
            fetchedMismatches = [...seenLiftNos.values(), ...noLiftEntries];

            // Role-based filtering
            if (user?.firmName) {
                fetchedReturns = fetchedReturns.filter((rec) =>
                    canViewFirm(user.firmName, rec["Firm Name"])
                );
                fetchedMismatches = fetchedMismatches.filter((rec) =>
                    canViewFirm(user.firmName, rec["Firm Name"])
                );
                fetchedLifts = fetchedLifts.filter((lift) =>
                    canViewFirm(user.firmName, lift["Firm Name"])
                );
            }

            const mappedReturns = fetchedReturns.map(r => ({
                ...r,
                id: r.ID !== undefined ? r.ID : r.id
            }));

            setRecords(mappedReturns);
            setPendingMismatches(fetchedMismatches);
            setAvailableLifts(fetchedLifts);
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
    useRealtime(["Purchase Returns", "Mismatch", "LIFT-ACCOUNTS"], () => {
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
            qty: "",
            totalReturnQty: mismatch.totalReturnQty
                ? String(mismatch.totalReturnQty)
                : "",
            returnThisTime: "",
            returnedQtyBefore: mismatch.returnedQty || 0,
            maxReturnQty: mismatch.totalQty || 0,
            hasFixedTotalReturnQty: Boolean(mismatch.totalReturnQty),
            returnReason: mismatch["Remarks"] || "",
            liftNo: mismatch["Lift Number"] || "",
            firmName: mismatch["Firm Name"] || "",
            mismatch_id: mismatch.id,
            id: null,
        });
        setShowForm(true);
    };

    // ── Open form for editing existing finalized record ────────────────────
    const handleEditRecord = async (rec) => {
        const liftNo = String(rec["Lift No"] || "").trim();
        const mismatchId = String(rec.mismatch_id || "").trim();
        const otherLiftReturns = records
            .filter((item) => {
                if (String(item.id) === String(rec.id)) return false;
                const itemMismatchId = String(item.mismatch_id || "").trim();
                const itemLiftNo = String(item["Lift No"] || "").trim();
                // Match by EITHER same mismatch_id OR same Lift No (covers all partial returns for this lift)
                if (mismatchId && itemMismatchId === mismatchId) return true;
                if (liftNo && itemLiftNo === liftNo) return true;
                return false;
            })
            .reduce(
                (sum, item) =>
                    sum +
                    (parseFloat(item["Return This Time"]) ||
                        parseFloat(item["Qty"]) ||
                        0),
                0
            );
        // Always use the sum of OTHER records for same lift/mismatch as "already returned before this edit"
        const returnedQtyBefore = otherLiftReturns;

        let maxReturnQty = 0;
        if (liftNo) {
            const { data: liftData } = await supabase
                .from("LIFT-ACCOUNTS")
                .select('"Actual Quantity"')
                .eq("Lift No", liftNo)
                .maybeSingle();

            // Always use full received qty from LIFT-ACCOUNTS as the total baseline
            maxReturnQty = parseFloat(liftData?.["Actual Quantity"]) || 0;
        }

        setForm({
            purchaseReturnNo: rec["Purchase Return No."],
            poNo: rec["Po No."],
            actionType: rec["Action Type"],
            partyName: rec["Party Name"],
            productName: rec["Product Name"],
            qty: rec["Return This Time"] ?? rec["Qty"],
            totalReturnQty: rec["Total Return Qty"] ?? rec["Qty"] ?? "",
            returnThisTime: rec["Return This Time"] ?? rec["Qty"] ?? "",
            returnedQtyBefore,
            maxReturnQty: rec["Total Qty"] !== undefined && rec["Total Qty"] !== null ? parseFloat(rec["Total Qty"]) : maxReturnQty,
            hasFixedTotalReturnQty: Boolean(rec["Total Return Qty"]),
            returnReason: rec["Return Reason"],
            transport: rec["Transport"],
            typeOfTransport: rec["Type of Transport"],
            vehicleNo: rec["Vehicle No"],
            builtyNo: rec["Builty No"],
            rateType: rec["Rate Type"],
            amount: rec["Amount"],
            productRate: rec["Product Rate"] || "",
            orgBillNo: rec["Org. Bill No"],
            billNo: rec["Bill No"] || rec["Bill No."],
            billCopy: rec["Bill Copy"] || rec["Bill Image"],
            creditNoteUrl: rec["Credit Note URL"] || "",
            liftNo: rec["Lift No"],
            firmName: rec["Firm Name"],
            mismatch_id: rec.mismatch_id,
            id: rec.id,
        });
        setShowForm(true);
    };

    const handleChange = (field, value) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
            ...(field === "returnThisTime" ? { qty: value } : {}),
        }));
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

    const handleLiftNoBlur = async (value) => {
        const liftNo = String(value || "").trim();
        if (!liftNo) return;

        try {
            const [
                { data: liftData, error: liftError },
                { data: previousReturns, error: returnsError },
            ] = await Promise.all([
                supabase
                    .from("LIFT-ACCOUNTS")
                    .select("*")
                    .eq("Lift No", liftNo)
                    .maybeSingle(),
                supabase
                    .from("Purchase Returns")
                    .select('ID, mismatch_id, "Qty", "Return This Time"')
                    .eq("Lift No", liftNo)
                    .not("ID", "is", null),
            ]);

            if (liftError) throw liftError;
            if (returnsError) throw returnsError;
            if (!liftData) {
                toast.warning(`Lift No. ${liftNo} was not found.`);
                return;
            }

            const previouslyReturnedQty = (previousReturns || [])
                .filter((item) => String(item.ID) !== String(form.id || ""))
                .reduce(
                    (sum, item) =>
                        sum +
                        (parseFloat(item["Return This Time"]) ||
                            parseFloat(item["Qty"]) ||
                            0),
                    0
                );

            setForm((prev) => ({
                ...prev,
                liftNo,
                poNo:
                    liftData["Indent no."] ||
                    liftData["Indent Number"] ||
                    prev.poNo,
                partyName:
                    liftData["Vendor Name"] ||
                    liftData["Party Name"] ||
                    prev.partyName,
                productName:
                    liftData["Raw Material Name"] ||
                    liftData["Product Name"] ||
                    prev.productName,
                billNo: liftData["Bill No."] || prev.billNo,
                billCopy:
                    liftData["Bill Image"] ||
                    liftData["Bill Copy"] ||
                    prev.billCopy,
                productRate: liftData["Rate"] || liftData["Product Rate"] || liftData["Rate (INR)"] || prev.productRate,
                firmName: normalizeFirmName(liftData["Firm Name"]) || prev.firmName,
                maxReturnQty: Math.max(
                    0,
                    (parseFloat(liftData["Actual Quantity"]) || 0) -
                    previouslyReturnedQty
                ),
                returnedQtyBefore: 0,
            }));
        } catch (err) {
            console.error("Lift auto-fetch error:", err);
            toast.error("Failed to load the selected Lift quantity.");
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
                .select('"Qty", "Total Return Qty", "Return This Time"')
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

            const totalReturned = (allReturns || []).reduce(
                (sum, r) =>
                    sum +
                    (parseFloat(r["Return This Time"]) || parseFloat(r.Qty) || 0),
                0
            );
            const configuredTotalReturnQty = (allReturns || []).reduce(
                (maxQty, r) =>
                    Math.max(maxQty, parseFloat(r["Total Return Qty"]) || 0),
                0
            );
            const returnTargetQty = configuredTotalReturnQty || totalQty;

            if (totalReturned >= returnTargetQty) {
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

    const handleSubmit = async () => {
        const totalReturnQty = parseFloat(form.totalReturnQty);
        const returnThisTime = parseFloat(form.returnThisTime);
        const returnedQtyBefore = parseFloat(form.returnedQtyBefore) || 0;
        const remainingReturnQty = totalReturnQty - returnedQtyBefore;

        if (!form.purchaseReturnNo || !form.liftNo || !form.poNo || !totalReturnQty || !returnThisTime) {
            toast.warning("Please provide PR No., Lift No., PO / Indent No, Total Return Qty and Return This Time.");
            return;
        }
        if (totalReturnQty <= 0 || returnThisTime <= 0) {
            toast.warning("Return quantities must be greater than zero.");
            return;
        }
        if (form.maxReturnQty > 0 && totalReturnQty > form.maxReturnQty) {
            toast.warning(`Total Return Qty cannot exceed received quantity (${form.maxReturnQty}).`);
            return;
        }
        if (remainingReturnQty <= 0 || returnThisTime > remainingReturnQty + 0.000001) {
            toast.warning(`Return This Time cannot exceed pending return quantity (${Math.max(0, remainingReturnQty)}).`);
            return;
        }

        setSubmitting(true);
        try {
            const istOffset = 5.5 * 60 * 60 * 1000;
            const istDate = new Date(Date.now() + istOffset);
            const istTimestamp = istDate.toISOString().replace("Z", "+05:30");

            // Upload Credit Note image if provided
            let creditNoteUrl = form.creditNoteUrl || null;
            if (creditNoteImageFile) {
                const fileExt = creditNoteImageFile.name.split('.').pop();
                const fileName = `credit-note/${form.liftNo || 'unknown'}_cn_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('image')
                    .upload(fileName, creditNoteImageFile);
                if (uploadError) throw uploadError;
                const { data: publicUrlData } = supabase.storage
                    .from('image')
                    .getPublicUrl(fileName);
                creditNoteUrl = publicUrlData.publicUrl;
            }

            let mismatchId = form.mismatch_id;

            if (!form.id && !mismatchId) {
                // Create a Mismatch record for manual purchase return
                const mismatchPayload = {
                    Timestamp: istTimestamp,
                    "Lift ID": form.liftNo || null,
                    "Lift Number": form.liftNo || null,
                    "Indent Number": form.poNo || null,
                    "Firm Name": normalizeFirmName(form.firmName) || normalizeFirmName(user?.firmName) || null,
                    "Party Name": form.partyName || null,
                    "Product Name": form.productName || null,
                    Qty: form.maxReturnQty ? parseFloat(form.maxReturnQty) : null,
                    Status: "Purchase Return", // Starts as pending return
                    coordination_status: "COORDINATED",
                    "Action Type": "Return Material and Make Debit Note",
                    Remarks: form.returnReason || "Manual Purchase Return",
                };

                const { data: mismatchData, error: mismatchError } = await supabase
                    .from("Mismatch")
                    .insert([mismatchPayload])
                    .select("id")
                    .single();

                if (mismatchError) {
                    console.error("Error creating mismatch for manual return:", mismatchError);
                    throw new Error(`Failed to create mismatch record: ${mismatchError.message}`);
                }
                mismatchId = mismatchData.id;
            }

            const actionTypeToUse = form.actionType || "Return Material and Make Debit Note";

            const payload = {
                "Time Stamp": istTimestamp,
                "Purchase Return No.": form.purchaseReturnNo,
                "Po No.": form.poNo || "",
                "Action Type": actionTypeToUse,
                "Party Name": form.partyName || null,
                "Product Name": form.productName || null,
                "Qty": Math.round(returnThisTime),
                "Total Return Qty": totalReturnQty,
                "Return This Time": returnThisTime,
                "Return Reason": form.returnReason || null,
                "Transport": form.transport || null,
                "Type of Transport": form.typeOfTransport || null,
                "Vehicle No": form.vehicleNo || null,
                "Builty No": form.builtyNo || null,
                "Rate Type": form.rateType || null,
                "Amount": form.amount || null,
                "Product Rate": form.productRate ? parseFloat(form.productRate) : null,
                "Bill No": form.billNo || null,
                "Org. Bill No": form.orgBillNo || null,
                "Lift No": form.liftNo || null,
                "Firm Name": normalizeFirmName(form.firmName) || normalizeFirmName(user?.firmName) || null,
                mismatch_id: mismatchId || null,
                "Total Qty": form.maxReturnQty ? parseFloat(form.maxReturnQty) : null,
                "Credit Note URL": creditNoteUrl || null,
            };

            if (form.id) {
                // UPDATE
                const { error } = await supabase
                    .from("Purchase Returns")
                    .update(payload)
                    .eq("ID", form.id);
                if (error) throw error;

                if (mismatchId) {
                    await updateMismatchStatus(mismatchId, actionTypeToUse);
                }
            } else {
                // INSERT
                const { error } = await supabase
                    .from("Purchase Returns")
                    .insert([payload]);
                if (error) throw error;

                // Also update the Mismatch record status to indicate it's been processed
                if (mismatchId) {
                    await updateMismatchStatus(mismatchId, actionTypeToUse);
                }
            }

            toast.success("✅ Purchase Return saved successfully!");
            setShowForm(false);
            setForm(EMPTY_FORM);
            setCreditNoteImageFile(null);
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
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Lift No</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">PO No.</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Party Name</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Product Name</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Qty</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Total Return Qty</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Return This Time</th>
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
                                                    <td className="px-4 py-3 whitespace-nowrap font-bold text-orange-700 text-xs">{rec["Lift No"] || "—"}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-primary">{rec["Po No."] || "—"}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 italic font-medium">{rec["Party Name"]}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{rec["Product Name"]}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap font-bold text-gray-900">{rec["Total Qty"] ?? rec["Qty"]}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-gray-700">{rec["Total Return Qty"] ?? "—"}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-[#6b8e2f]">{rec["Return This Time"] ?? "—"}</td>
                                                </tr>
                                            ))}
                                            {records.length === 0 && (
                                                <tr>
                                                    <td colSpan={10} className="px-6 py-12 text-center text-gray-400 bg-gray-50/30">
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
                                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Total Return Qty</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Returned</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Pending Qty</th>
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
                                                <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-gray-800">{m.returnTargetQty > 0 ? m.returnTargetQty : "—"}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-green-700">{m.returnedQty > 0 ? m.returnedQty.toFixed(2) : "0"}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                                        m.pendingQty > 0.001 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        {m.pendingQty > 0.001 ? m.pendingQty.toFixed(2) : "—"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {pendingMismatches.length === 0 && (
                                            <tr>
                                                <td colSpan={9} className="px-6 py-12 text-center text-gray-400 bg-gray-50/30">
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

                            {/* Return Progress Summary — shown when context is available */}
                            {(form.mismatch_id || form.maxReturnQty > 0 || form.id !== null || parseFloat(form.totalReturnQty) > 0) && (() => {
                                const isEditMode = form.id !== null;
                                const totalTarget = parseFloat(form.totalReturnQty) || parseFloat(form.maxReturnQty) || 0;
                                // For edit: "already returned" includes this record; for new: only previous records
                                const thisRecordQty = isEditMode ? (parseFloat(form.returnThisTime) || 0) : 0;
                                const alreadyReturned = (parseFloat(form.returnedQtyBefore) || 0) + thisRecordQty;
                                const stillPending = Math.max(0, totalTarget - alreadyReturned);
                                return (
                                    <div className="mb-6 grid grid-cols-3 gap-3">
                                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                                            <p className="text-[10px] uppercase font-bold text-blue-400 tracking-widest mb-1">Total Received Qty</p>
                                            <p className="text-xl font-extrabold text-blue-700">{form.maxReturnQty > 0 ? form.maxReturnQty : (totalTarget > 0 ? totalTarget : "—")}</p>
                                        </div>
                                        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                                            <p className="text-[10px] uppercase font-bold text-green-400 tracking-widest mb-1">Already Returned</p>
                                            <p className="text-xl font-extrabold text-green-700">{alreadyReturned.toFixed(2)}</p>
                                            {isEditMode && <p className="text-[9px] text-green-400 mt-0.5">Incl. this record</p>}
                                        </div>
                                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                                            <p className="text-[10px] uppercase font-bold text-orange-400 tracking-widest mb-1">Still Pending</p>
                                            <p className="text-xl font-extrabold text-orange-600">{stillPending > 0.001 ? stillPending.toFixed(2) : "0"}</p>
                                        </div>
                                    </div>
                                );
                            })()}
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">PR Number</label>
                                        <input type="text" value={form.purchaseReturnNo} readOnly className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Lift No *</label>
                                        {Boolean(form.mismatch_id) || form.id !== null ? (
                                            <input
                                                type="text"
                                                value={form.liftNo}
                                                readOnly
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 outline-none cursor-not-allowed"
                                            />
                                        ) : (
                                            <select
                                                value={form.liftNo}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    handleChange("liftNo", val);
                                                    handleLiftNoBlur(val);
                                                }}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white"
                                            >
                                                <option value="">Select Lift No.</option>
                                                {Array.from(new Set(availableLifts.map(l => String(l["Lift No"] || "").trim()).filter(Boolean))).map(liftNum => {
                                                    const lift = availableLifts.find(l => String(l["Lift No"] || "").trim() === liftNum);
                                                    return (
                                                        <option key={liftNum} value={liftNum}>
                                                            {liftNum} {lift ? `(${lift["Vendor Name"] || lift["Party Name"] || "No Vendor"})` : ""}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">PO / Indent No *</label>
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
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Product Rate</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={form.productRate}
                                            onChange={(e) => handleChange("productRate", e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                                            placeholder="₹ Rate per unit"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Total Qty</label>
                                        <input
                                            type="number"
                                            value={form.maxReturnQty || ""}
                                            readOnly={Boolean(form.mismatch_id)}
                                            onChange={(e) => handleChange("maxReturnQty", e.target.value)}
                                            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${
                                                Boolean(form.mismatch_id)
                                                    ? "bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed"
                                                    : "border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                            }`}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Total Return Qty</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max={form.maxReturnQty > 0 ? form.maxReturnQty : undefined}
                                            step="any"
                                            value={form.totalReturnQty}
                                            readOnly={form.hasFixedTotalReturnQty}
                                            onChange={(e) => handleChange("totalReturnQty", e.target.value)}
                                            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${
                                                form.hasFixedTotalReturnQty
                                                    ? "bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed"
                                                    : "border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                            }`}
                                            placeholder="e.g. 5"
                                        />
                                        {form.maxReturnQty > 0 && !form.hasFixedTotalReturnQty && (
                                            <p className="mt-1 text-[11px] text-gray-500">
                                                Maximum received quantity: {form.maxReturnQty}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Return This Time</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max={Math.max(
                                                0,
                                                (parseFloat(form.totalReturnQty) || 0) -
                                                (parseFloat(form.returnedQtyBefore) || 0)
                                            )}
                                            step="any"
                                            value={form.returnThisTime}
                                            onChange={(e) => handleChange("returnThisTime", e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                            placeholder="e.g. 2.5"
                                        />
                                        {form.totalReturnQty && (
                                            <p className="mt-1 text-[11px] text-orange-600">
                                                Pending before this return: {Math.max(
                                                    0,
                                                    (parseFloat(form.totalReturnQty) || 0) -
                                                    (parseFloat(form.returnedQtyBefore) || 0)
                                                )}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Return Reason</label>
                                        <input type="text" value={form.returnReason} onChange={(e) => handleChange("returnReason", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all" placeholder="Reason for return" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Bill Number</label>
                                        <input
                                            type="text"
                                            value={form.billNo}
                                            onChange={(e) => handleChange("billNo", e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                                            placeholder="Bill No."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Transporter Name</label>
                                        <input type="text" value={form.transport} onChange={(e) => handleChange("transport", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all" placeholder="Enter transporter" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Vehicle Number</label>
                                        <input type="text" value={form.vehicleNo} onChange={(e) => handleChange("vehicleNo", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all" placeholder="e.g. WB 12 XX XXXX" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Credit Note Image</label>
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf,.pdf"
                                            onChange={(e) => setCreditNoteImageFile(e.target.files[0] || null)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none cursor-pointer file:cursor-pointer file:bg-green-50 file:text-[#6b8e2f] file:border-0 file:rounded-lg file:px-3 file:py-1.5 file:mr-3 file:text-xs hover:file:bg-green-100 transition-all"
                                        />
                                        {form.creditNoteUrl && !creditNoteImageFile && (
                                            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#7da23a]">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                <a href={form.creditNoteUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-green-700">Previously uploaded — click to view</a>
                                            </div>
                                        )}
                                        {creditNoteImageFile && (
                                            <p className="mt-1 text-[11px] text-gray-500">Selected: {creditNoteImageFile.name}</p>
                                        )}
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
                                    ["Total Qty", viewRecord["Total Qty"]],
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
