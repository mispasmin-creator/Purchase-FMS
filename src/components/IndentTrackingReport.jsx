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
    Filter,
    Loader2,
    TrendingUp,
    Clock,
    CheckCircle2,
    ChevronRight,
    BarChart3,
    Calendar,
    XCircle,
    FileText,
    Truck,
    Database,
    ArrowRight,
    TestTube,
    Receipt,
    Archive,
    FileEdit,
    RotateCcw,
    Calculator,
    Save,
    Building2
} from "lucide-react";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import { canViewFirm } from "../utils/firmFilter";
import { toast } from "sonner";

const STEPS = [
    { id: 1, label: "Indent Created", column: "Planned1", icon: <FileText className="h-4 w-4" /> },
    { id: 2, label: "HOD Approved", column: "Actual1", icon: <CheckCircle2 className="h-4 w-4" /> },
    { id: 3, label: "Three Party Done", column: "Actual6", icon: <Database className="h-4 w-4" /> },
    { id: 4, label: "Factory Approved", column: "Actual7", icon: <CheckCircle2 className="h-4 w-4" /> },
    { id: 5, label: "Mgmt Approved", column: "Actual8", icon: <CheckCircle2 className="h-4 w-4" /> },
    { id: 6, label: "Make PO", column: "Actual2", icon: <FileText className="h-4 w-4" /> },
    { id: 7, label: "Arrange Logistics", column: "Planned9", icon: <Truck className="h-4 w-4" /> },
    { id: 8, label: "Logistics Approved", column: "Actual9", icon: <CheckCircle2 className="h-4 w-4" /> },
    { id: 9, label: "PO Entry", column: "Actual3", icon: <Calculator className="h-4 w-4" /> },
    { id: 10, label: "Advance Paid", column: "Actual5", icon: <Database className="h-4 w-4" /> },
    { id: 11, label: "Material Lifted", source: "LIFT-ACCOUNTS", key: "Timestamp", icon: <Truck className="h-4 w-4" /> },
    { id: 12, label: "Material Received", source: "LIFT-ACCOUNTS", key: "Date Of Receiving", icon: <CheckCircle2 className="h-4 w-4" /> },
    { id: 13, label: "Unload Approved", source: "LIFT-ACCOUNTS", key: "Actual Unload Approval", icon: <CheckCircle2 className="h-4 w-4" /> },
    { id: 14, label: "Lab Testing", source: "LIFT-ACCOUNTS", key: "Date Of Test", icon: <TestTube className="h-4 w-4" /> },
    { id: 15, label: "Bilty Entry", source: "LIFT-ACCOUNTS", key: "Bilty No.", icon: <Receipt className="h-4 w-4" /> },
    { id: 16, label: "Full Kitting", source: "fullkittin", key: "Timestamp", icon: <Archive className="h-4 w-4" /> },
    { id: 17, label: "Accounts Audit", source: "Mismatch", key: "Actual2", icon: <Search className="h-4 w-4" /> },
    { id: 18, label: "Rectify Mistake", source: "Mismatch", key: "Actual3", icon: <FileEdit className="h-4 w-4" /> },
    { id: 19, label: "Re-Audit Done", source: "Mismatch", key: "Actual5", icon: <RotateCcw className="h-4 w-4" /> },
    { id: 20, label: "Final Tally Entry", source: "Mismatch", key: "Actual4", icon: <Calculator className="h-4 w-4" /> },
    { id: 21, label: "Bill Received", source: "Mismatch", key: "Actual6", icon: <Save className="h-4 w-4" /> },
];

const formatDateTime = (isoString) => {
    if (!isoString) return "-";
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString;
        return new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    } catch (e) {
        return isoString;
    }
};

const getTimeDiff = (start, end) => {
    if (!start || !end) return null;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
    const diffMs = e - s;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) return `${diffDays}d ${diffHrs}h`;
    if (diffHrs > 0) return `${diffHrs}h ${diffMins}m`;
    return `${diffMins}m`;
};

export default function IndentTrackingReport() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFirm, setSelectedFirm] = useState("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const { user } = useAuth();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: indents, error: indentError } = await supabase
                .from("INDENT-PO")
                .select("*");

            if (indentError) throw indentError;

            const [liftsRes, mismatchRes, kittingRes] = await Promise.all([
                supabase.from("LIFT-ACCOUNTS").select("*"),
                supabase.from("Mismatch").select("*"),
                supabase.from("fullkittin").select("*")
            ]);

            const lifts = liftsRes.data || [];
            const mismatches = mismatchRes.data || [];
            const kittings = kittingRes.data || [];

            const processed = indents.map(indent => {
                const indentId = indent["Indent Id."];
                const poNumber = indent["po_number"];

                const associatedLifts = lifts.filter(lift => {
                    const liftIndentNo = String(lift["Indent no."] || lift["Indent ID"] || lift["Indent Number"] || "").trim();
                    const indentKey = String(indentId || "").trim();
                    const poKey = String(poNumber || "").trim();
                    return (indentKey && liftIndentNo === indentKey) || (poKey && liftIndentNo === poKey);
                });

                const liftNumbers = associatedLifts.map(l => String(l["Lift No"] || l["Lift Number"] || "").trim()).filter(Boolean);

                const associatedMismatches = mismatches.filter(m => {
                    const mLiftNo = String(m["Lift Number"] || m["Lift No"] || "").trim();
                    return liftNumbers.includes(mLiftNo);
                });

                const associatedKittings = kittings.filter(k => {
                    const kLiftNo = String(k["Lift No"] || k["Lift Number"] || "").trim();
                    return liftNumbers.includes(kLiftNo);
                });

                const firstLift = associatedLifts[0] || {};
                const truckNo = firstLift["Truck No."] || "";
                const vendorName = indent["Vendor name"] || indent["Vendor"] || firstLift["Vendor Name"] || "N/A";

                const stepTimestamps = STEPS.map(step => {
                    if (step.source === "LIFT-ACCOUNTS") {
                        const validLifts = associatedLifts.filter(l => l[step.key] && l[step.key] !== "N/A" && l[step.key] !== "NaN");
                        if (validLifts.length === 0) return null;
                        const sorted = validLifts.sort((a, b) => new Date(a[step.key]) - new Date(b[step.key]));
                        return sorted[0][step.key];
                    }
                    if (step.source === "Mismatch") {
                        const valid = associatedMismatches.filter(m => m[step.key] && m[step.key] !== "N/A");
                        if (valid.length === 0) return null;
                        const sorted = valid.sort((a, b) => new Date(a[step.key]) - new Date(b[step.key]));
                        return sorted[0][step.key];
                    }
                    if (step.source === "fullkittin") {
                        const valid = associatedKittings.filter(k => k[step.key] && k[step.key] !== "N/A");
                        if (valid.length === 0) return null;
                        const sorted = valid.sort((a, b) => new Date(a[step.key]) - new Date(b[step.key]));
                        return sorted[0][step.key];
                    }
                    return indent[step.column];
                });

                let currentStepIndex = -1;
                for (let i = stepTimestamps.length - 1; i >= 0; i--) {
                    if (stepTimestamps[i]) {
                        currentStepIndex = i;
                        break;
                    }
                }

                const currentStep = currentStepIndex >= 0 ? STEPS[currentStepIndex] : { label: "Unknown", id: 0 };
                const progress = currentStepIndex >= 0 ? Math.round(((currentStepIndex + 1) / STEPS.length) * 100) : 0;

                return {
                    ...indent,
                    id: indent.id,
                    indentId,
                    poNumber,
                    truckNo,
                    vendorName,
                    firmName: indent["Firm Name"],
                    material: indent["Material"],
                    quantity: indent["Approved Qty"] || indent["Quantity"],
                    stepTimestamps,
                    currentStep,
                    progress,
                    lastUpdated: stepTimestamps[currentStepIndex] || indent["Timestamp"],
                    createdAt: indent["Timestamp"]
                };
            });

            let filtered = processed;
            if (user?.firmName && user.firmName !== "all") {
                filtered = processed.filter(item => canViewFirm(user.firmName, item.firmName));
            }

            setData(filtered);
        } catch (error) {
            console.error("Error fetching tracking data:", error);
            toast.error("Failed to load tracking data");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredData = useMemo(() => {
        return data.filter(item => {
            const matchesSearch =
                String(item.indentId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                String(item.poNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                String(item.material || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                String(item.firmName || "").toLowerCase().includes(searchQuery.toLowerCase());

            const matchesFirm = selectedFirm === "all" || item.firmName === selectedFirm;

            const itemDate = new Date(item.createdAt);
            const matchesFrom = !fromDate || itemDate >= new Date(fromDate);
            const matchesTo = !toDate || itemDate <= new Date(toDate + "T23:59:59");

            return matchesSearch && matchesFirm && matchesFrom && matchesTo;
        });
    }, [data, searchQuery, selectedFirm, fromDate, toDate]);

    const stats = useMemo(() => {
        const today = new Date().toISOString().split("T")[0];
        const dailyAchievements = STEPS.map(step => {
            const count = data.filter(item => {
                const ts = item.stepTimestamps[step.id - 1];
                return ts && ts.startsWith(today);
            }).length;
            return { ...step, count };
        });

        return {
            total: data.length,
            inProgress: data.filter(item => item.progress > 0 && item.progress < 100).length,
            completed: data.filter(item => item.progress === 100).length,
            dailyAchievements
        };
    }, [data]);

    const uniqueFirms = useMemo(() => {
        return ["all", ...new Set(data.map(item => item.firmName).filter(Boolean))].sort();
    }, [data]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="h-10 w-10 text-[#7da23a] animate-spin" />
                <p className="text-gray-500 font-medium">Calculating Indent Progress...</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-50 min-h-screen">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white border-none shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <BarChart3 size={60} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-semibold uppercase tracking-wider">Total Indents</CardDescription>
                        <CardTitle className="text-3xl font-bold text-gray-800">{stats.total}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-white border-none shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-3 opacity-10 text-amber-500">
                        <Clock size={60} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-semibold uppercase tracking-wider text-amber-600">In Progress</CardDescription>
                        <CardTitle className="text-3xl font-bold text-gray-800">{stats.inProgress}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-white border-none shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-3 opacity-10 text-green-500">
                        <CheckCircle2 size={60} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-semibold uppercase tracking-wider text-green-600">Completed</CardDescription>
                        <CardTitle className="text-3xl font-bold text-gray-800">{stats.completed}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-white border-none shadow-sm overflow-hidden relative border-l-4 border-l-[#7da23a]">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-semibold uppercase tracking-wider text-[#7da23a]">Today's Progress</CardDescription>
                        <div className="flex items-end gap-2">
                            <CardTitle className="text-3xl font-bold text-gray-800">
                                {stats.dailyAchievements.reduce((acc, curr) => acc + curr.count, 0)}
                            </CardTitle>
                            <span className="text-xs text-gray-400 mb-1">Steps Cross</span>
                        </div>
                    </CardHeader>
                </Card>
            </div>

            <Card className="bg-[#7da23a] text-white overflow-hidden">
                <CardContent className="p-3 flex items-center gap-4 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-2 font-bold whitespace-nowrap border-r border-white/20 pr-4">
                        <TrendingUp size={18} />
                        Daily Achievement:
                    </div>
                    {stats.dailyAchievements.filter(s => s.count > 0).map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2 whitespace-nowrap bg-white/10 px-3 py-1 rounded-full text-sm">
                            {s.icon}
                            <span>{s.label}: <strong>{s.count}</strong></span>
                        </div>
                    ))}
                    {stats.dailyAchievements.filter(s => s.count > 0).length === 0 && (
                        <span className="text-sm opacity-80 italic">No progress recorded today yet.</span>
                    )}
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search Indent ID, PO, Material..."
                                className="pl-10 h-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <div className="w-48">
                                <select
                                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7da23a]"
                                    value={selectedFirm}
                                    onChange={(e) => setSelectedFirm(e.target.value)}
                                >
                                    {uniqueFirms.map(firm => (
                                        <option key={firm} value={firm}>{firm === "all" ? "All Firms" : firm}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2 border rounded-md px-2 bg-slate-50">
                                <Calendar size={16} className="text-gray-400" />
                                <Input
                                    type="date"
                                    className="border-none bg-transparent h-8 w-32 p-0 text-xs focus-visible:ring-0"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                />
                                <ArrowRight size={12} className="text-gray-400" />
                                <Input
                                    type="date"
                                    className="border-none bg-transparent h-8 w-32 p-0 text-xs focus-visible:ring-0"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                />
                                {(fromDate || toDate) && (
                                    <button onClick={() => { setFromDate(""); setToDate(""); }} className="text-gray-400 hover:text-red-500">
                                        <XCircle size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="pb-0 px-6 pt-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl font-bold text-gray-800">Indent Progression Report</CardTitle>
                            <CardDescription>Real-time status tracking of all purchase indents.</CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs bg-slate-50">
                            Showing {filteredData.length} records
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead className="text-xs uppercase font-bold text-gray-500">Indent / PO</TableHead>
                                    <TableHead className="text-xs uppercase font-bold text-gray-500">Material & Vendor</TableHead>
                                    <TableHead className="text-xs uppercase font-bold text-gray-500">Truck No</TableHead>
                                    <TableHead className="text-xs uppercase font-bold text-gray-500">Date</TableHead>
                                    <TableHead className="text-xs uppercase font-bold text-gray-500">Current Status</TableHead>
                                    <TableHead className="text-xs uppercase font-bold text-gray-500 text-center">Progress</TableHead>
                                    <TableHead className="text-xs uppercase font-bold text-gray-500 text-right">Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.map((item) => (
                                    <React.Fragment key={item.id}>
                                        <TableRow className="group hover:bg-slate-50/80 transition-colors">
                                            <TableCell className="font-mono font-bold text-blue-600">
                                                {item.indentId || "N/A"}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-gray-800">{item.material || "-"}</span>
                                                    <span className="text-[10px] text-[#7da23a] font-medium">{item.vendorName}</span>
                                                    <span className="text-[10px] text-gray-400">{item.firmName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium text-gray-600">
                                                {item.truckNo || <span className="text-gray-300 italic">Not Lifted</span>}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm">{formatDateTime(item.createdAt).split(" ")[0]}</span>
                                                    <span className="text-[10px] text-gray-400">{formatDateTime(item.createdAt).split(" ")[1]}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-green-50 rounded-full text-[#7da23a]">
                                                        {item.currentStep.icon}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-700">{item.currentStep.label}</span>
                                                        <span className="text-[10px] text-gray-400">At {formatDateTime(item.lastUpdated)}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1.5 items-center">
                                                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-500 ${item.progress === 100 ? 'bg-green-500' : 'bg-[#7da23a]'}`}
                                                            style={{ width: `${item.progress}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-500">{item.progress}% Complete</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <TrackingDetails indent={item} />
                                            </TableCell>
                                        </TableRow>
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function TrackingDetails({ indent }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                className="text-[#7da23a] hover:text-white hover:bg-[#7da23a] h-8"
                onClick={() => setOpen(true)}
            >
                View Timeline <ChevronRight size={14} className="ml-1" />
            </Button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <Card className="w-full max-w-2xl bg-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-[#7da23a]" />
                        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                            <div>
                                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                                    <BarChart3 className="text-[#7da23a]" />
                                    Lifecycle of {indent.indentId}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    Detailed step-by-step progression timeline
                                </CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="rounded-full">
                                <XCircle className="h-6 w-6 text-gray-400 hover:text-red-500" />
                            </Button>
                        </CardHeader>
                        <CardContent className="pt-6 max-h-[70vh] overflow-y-auto">
                            <div className="relative pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                                {STEPS.map((step, idx) => {
                                    const ts = indent.stepTimestamps[idx];
                                    const prevTs = idx > 0 ? indent.stepTimestamps[idx - 1] : null;
                                    const diff = getTimeDiff(prevTs, ts);
                                    const isDone = !!ts;
                                    const isCurrent = indent.currentStep.id === step.id;

                                    return (
                                        <div key={step.id} className={`relative transition-all ${isDone ? 'opacity-100' : 'opacity-40'}`}>
                                            <div className={`absolute -left-[25px] top-1 h-4 w-4 rounded-full border-2 ${isDone ? 'bg-[#7da23a] border-[#7da23a] scale-110 shadow-sm' : 'bg-white border-slate-200'}`}>
                                                {isDone && <CheckCircle2 size={12} className="text-white absolute inset-0 m-auto" />}
                                            </div>
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col">
                                                    <span className={`font-bold text-sm ${isCurrent ? 'text-[#7da23a]' : 'text-gray-700'}`}>
                                                        {step.label}
                                                        {isCurrent && <Badge className="ml-2 bg-[#7da23a] h-4 px-1.5 text-[8px] uppercase">Current</Badge>}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                        <Clock size={10} /> {formatDateTime(ts)}
                                                    </span>
                                                </div>
                                                {diff && (
                                                    <Badge variant="outline" className="text-[9px] font-bold text-blue-600 bg-blue-50 border-blue-100 h-5">
                                                        +{diff}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                        <div className="p-4 bg-slate-50 border-t flex justify-between items-center text-xs text-gray-500 font-medium">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-700">Material:</span> {indent.material}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-700">Firm:</span> {indent.firmName}
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </>
    );
}
