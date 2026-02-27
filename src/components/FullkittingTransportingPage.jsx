import { useState, useEffect, useCallback, useMemo, useContext } from "react";
import { PackageSearch, PlusCircle, Loader2, AlertTriangle, Info, History, FileCheck, ExternalLink, Filter, X } from "lucide-react";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { supabase } from "../supabase";
import { toast } from "sonner";

// Shadcn UI components
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// --- Constants ---
const KITTING_COLUMNS_META = [
    { header: "Action", dataKey: "actionColumn", toggleable: false, alwaysVisible: true },
    { header: "Lift Number", dataKey: "liftNumber", toggleable: true, alwaysVisible: true },
    { header: "Firm Name", dataKey: "firmName", toggleable: true },
    { header: "Party Name", dataKey: "partyName", toggleable: true },
    { header: "Product Name", dataKey: "productName", toggleable: true },
    { header: "Transporter", dataKey: "transporterName", toggleable: true },
    { header: "Planned Date", dataKey: "plannedDate", toggleable: true },
    { header: "Kitting Link", dataKey: "kittingLink", toggleable: true, isLink: true, linkText: "View Kitting" },
];


export default function FullkittingTransportingPage() {
    const { user } = useAuth();
    const { refreshCounts } = useNotification();
    const [kittingData, setKittingData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("pending");

    const [visiblePendingColumns, setVisiblePendingColumns] = useState({});
    const [visibleHistoryColumns, setVisibleHistoryColumns] = useState({});

    // State for filters
    const [filters, setFilters] = useState({
        partyName: "all",
        productName: "all",
        transporterName: "all",
        liftNumber: "all",
    });

    // Modal state for Create Kitting
    const [isKittingModalOpen, setIsKittingModalOpen] = useState(false);
    const [selectedKittingItem, setSelectedKittingItem] = useState(null);
    const [kittingFormData, setKittingFormData] = useState({
        indentNo: "",
        fmsName: "Purchase",
        status: "No",
        transporterName: "",
        vehicleNumber: "",
        fromLocation: "",
        toLocation: "",
        materialLoadDetails: "",
        biltyNumber: "",
        rateType: "",
        amount: "",
        biltyImage: null
    });
    const [fmsNames, setFmsNames] = useState([]);
    const [rateTypes, setRateTypes] = useState([]);
    const [isSubmittingKitting, setIsSubmittingKitting] = useState(false);

    const hasAllFirmAccess = user?.firmName?.toLowerCase() === 'all';

    // Fetch Firm Names and Rate Types from Master table
    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const { data, error } = await supabase
                    .from("Master")
                    .select('"Fms Name", "Rate Type"');

                if (error) throw error;

                // Get unique Fms names
                const uniqueFmsNames = [...new Set(data.map(item => item["Fms Name"]?.trim()).filter(Boolean))].sort();
                setFmsNames(uniqueFmsNames);

                // Get unique Rate Types
                const uniqueRateTypes = [...new Set(data.map(item => item["Rate Type"]?.trim()).filter(Boolean))].sort();
                setRateTypes(uniqueRateTypes);
            } catch (err) {
                console.error("Error fetching Master data:", err);
            }
        };
        fetchMasterData();
    }, []);

    useEffect(() => {
        const initializeVisibility = (columnsMeta) => {
            const visibility = {};
            columnsMeta.forEach((col) => {
                visibility[col.dataKey] = col.alwaysVisible || col.toggleable;
            });
            return visibility;
        };
        setVisiblePendingColumns(initializeVisibility(KITTING_COLUMNS_META.filter(col => col.dataKey !== 'kittingLink')));
        setVisibleHistoryColumns(initializeVisibility(KITTING_COLUMNS_META));
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch Mismatch table (Planned7 filled) AND LIFT-ACCOUNTS in parallel
            const [{ data, error: fetchError }, { data: liftData, error: liftError }] = await Promise.all([
                supabase.from("Mismatch").select("*").not("Planned7", "is", null).order("Timestamp", { ascending: false }),
                supabase.from("LIFT-ACCOUNTS").select("\"Lift No\", \"Bilty No.\", \"Bilty Image\""),
            ]);

            if (fetchError) throw fetchError;
            if (liftError) throw liftError;

            // Build a lookup map from LIFT-ACCOUNTS: LiftNo → { biltyNo, biltyImage }
            const liftLookup = {};
            (liftData || []).forEach(lift => {
                const key = String(lift["Lift No"] || "").trim();
                if (key) liftLookup[key] = {
                    biltyNo: String(lift["Bilty No."] || "").trim(),
                    biltyImage: String(lift["Bilty Image"] || "").trim(),
                };
            });

            let parsedData = (data || []).map((row) => {
                const planned7 = row["Planned7"];
                const actual7 = row["Actual7"];
                const liftNum = String(row["Lift Number"] || row["Lift ID"] || "").trim();
                const liftInfo = liftLookup[liftNum] || {};

                return {
                    id: `kitting-${row.id}`,
                    originalId: row.id,
                    firmName: String(row["Firm Name"] || "").trim(),
                    liftNumber: liftNum,
                    partyName: String(row["Party Name"] || "").trim(),
                    productName: String(row["Product Name"] || "").trim(),
                    transporterName: String(row["Transporter Name"] || "").trim(),
                    kittingLink: null,
                    isPending: !actual7,
                    isHistory: !!actual7,
                    plannedDate: planned7 ? String(planned7).trim().replace('T', ' ') : "",
                    indentNo: String(row["Indent Number"] || "").trim(),
                    // Bilty No. and Bilty Image from LIFT-ACCOUNTS via join
                    biltyNo: liftInfo.biltyNo || String(row["Bilty No."] || "").trim(),
                    biltyImage: liftInfo.biltyImage || String(row["Bilty Image"] || "").trim(),
                    typeOfRate: String(row["Type Of Rate"] || "").trim(),
                    rate: Number(row["Rate"]) || 0,
                    truckNo: String(row["Truck No."] || "").trim(),
                };
            });

            // Filter by firm name
            if (user?.firmName && user.firmName.toLowerCase() !== "all") {
                const userFirmNameLower = user.firmName.toLowerCase();
                parsedData = parsedData.filter(
                    (item) => item.firmName && String(item.firmName).toLowerCase() === userFirmNameLower,
                );
            }

            setKittingData(parsedData);
        } catch (err) {
            console.error("Error fetching kitting data:", err);
            setError(`Failed to load data: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [user]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const uniqueFilterOptions = useMemo(() => {
        const parties = new Set();
        const products = new Set();
        const transporters = new Set();
        const lifts = new Set();

        kittingData.forEach(item => {
            if (item.partyName) parties.add(item.partyName);
            if (item.productName) products.add(item.productName);
            if (item.transporterName) transporters.add(item.transporterName);
            if (item.liftNumber) lifts.add(item.liftNumber);
        });

        return {
            partyName: [...parties].sort(),
            productName: [...products].sort(),
            transporterName: [...transporters].sort(),
            liftNumber: [...lifts].sort(),
        };
    }, [kittingData]);

    const { pendingKitting, historyKitting } = useMemo(() => {
        let baseData = kittingData;

        // Apply firm-based filter first
        if (!hasAllFirmAccess && user?.firmName) {
            const userFirmNameLower = user.firmName.toLowerCase();
            baseData = baseData.filter(
                item => item.firmName && String(item.firmName).toLowerCase() === userFirmNameLower
            );
        }

        // Apply general filters
        if (filters.partyName !== "all") {
            baseData = baseData.filter(item => item.partyName === filters.partyName);
        }
        if (filters.productName !== "all") {
            baseData = baseData.filter(item => item.productName === filters.productName);
        }
        if (filters.transporterName !== "all") {
            baseData = baseData.filter(item => item.transporterName === filters.transporterName);
        }
        if (filters.liftNumber !== "all") {
            baseData = baseData.filter(item => item.liftNumber === filters.liftNumber);
        }

        return {
            pendingKitting: baseData.filter(d => d.isPending),
            historyKitting: baseData.filter(d => d.isHistory)
        };
    }, [kittingData, filters, user, hasAllFirmAccess]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearAllFilters = () => {
        setFilters({
            partyName: "all",
            productName: "all",
            transporterName: "all",
            liftNumber: "all",
        });
    };

    const handleToggleColumn = (tab, dataKey, checked) => {
        if (tab === "pending") {
            setVisiblePendingColumns(prev => ({ ...prev, [dataKey]: checked }));
        } else {
            setVisibleHistoryColumns(prev => ({ ...prev, [dataKey]: checked }));
        }
    };

    const handleSelectAllColumns = (tab, columnsMeta, checked) => {
        const newVisibility = {};
        columnsMeta.forEach(col => {
            if (col.toggleable && !col.alwaysVisible) newVisibility[col.dataKey] = checked;
        });
        if (tab === "pending") {
            setVisiblePendingColumns(prev => ({ ...prev, ...newVisibility }));
        } else {
            setVisibleHistoryColumns(prev => ({ ...prev, ...newVisibility }));
        }
    };



    const openKittingModal = (item) => {
        setSelectedKittingItem(item);
        setKittingFormData({
            indentNo: item?.indentNo || "",
            fmsName: "Purchase",
            status: "No",
            transporterName: item?.transporterName || "",
            vehicleNumber: item?.truckNo || "",
            fromLocation: item?.partyName || "",
            toLocation: "Factory",
            materialLoadDetails: item?.productName || "",
            biltyNumber: item?.biltyNo || "",
            rateType: item?.typeOfRate || "",
            amount: item?.rate ? String(item.rate) : "",
            biltyImage: item?.biltyImage || null
        });
        setIsKittingModalOpen(true);
    };

    const submitKittingForm = async () => {
        if (!selectedKittingItem) return;

        setIsSubmittingKitting(true);
        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

            // We log the form data for reference
            console.log("Kitting Form Submitted:", kittingFormData);

            // 1. Update Mismatch table Actual7 (marks Full Kitting as done)
            const { error: mismatchUpdateError } = await supabase
                .from("Mismatch")
                .update({ "Actual7": timestamp })
                .eq("id", selectedKittingItem.originalId);

            if (mismatchUpdateError) throw mismatchUpdateError;

            // 2. Insert into fullkittin table
            let biltyImageVal = null;
            if (kittingFormData.biltyImage && typeof kittingFormData.biltyImage === 'object') {
                biltyImageVal = kittingFormData.biltyImage.name; // For now just storing the name
            } else if (kittingFormData.biltyImage && typeof kittingFormData.biltyImage === 'string') {
                biltyImageVal = kittingFormData.biltyImage;
            }

            const { error: fullkittinError } = await supabase
                .from("fullkittin")
                .insert([{
                    "Indent No": kittingFormData.indentNo,
                    "Fms Name": kittingFormData.fmsName,
                    "Status": kittingFormData.status,
                    "Transporter Name": kittingFormData.transporterName,
                    "Vehicle Number": kittingFormData.vehicleNumber,
                    "From": kittingFormData.fromLocation,
                    "To": kittingFormData.toLocation,
                    "Material Load Details": kittingFormData.materialLoadDetails,
                    "Bilty Number": kittingFormData.biltyNumber,
                    "Rate Type": kittingFormData.rateType,
                    "Amount": kittingFormData.amount ? Number(kittingFormData.amount) : null,
                    "Bilty Image": biltyImageVal
                }]);

            if (fullkittinError) throw fullkittinError;

            // 2. Fetch PO Data to compare
            let poData = null;
            if (selectedKittingItem.indentNo) {
                const { data: poRows, error: poError } = await supabase
                    .from("INDENT-PO")
                    .select("*")
                    .eq('"Indent Id."', selectedKittingItem.indentNo)
                    .single();

                if (!poError && poRows) {
                    poData = poRows;
                }
            }



            toast.success("Kitting created successfully.");
            setIsKittingModalOpen(false);

            fetchData();
            refreshCounts(); // Refresh sidebar notification counts
        } catch (err) {
            console.error("Error creating kitting:", err);
            toast.error(`Failed to create kitting: ${err.message}`);
        } finally {
            setIsSubmittingKitting(false);
        }
    };

    const renderCellContent = (item, column, tabKey) => {
        const value = item[column.dataKey];
        if (column.dataKey === 'actionColumn') {
            return (
                <Button
                    size="xs"
                    className="h-7 px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                    onClick={() => openKittingModal(item)}
                >
                    <ExternalLink className="mr-1 h-3 w-3" />
                    Create Kitting
                </Button>
            );
        }
        if (column.isLink) {
            return value ? (
                <a href={String(value).startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 hover:underline inline-flex items-center text-xs">
                    <ExternalLink className="h-3 w-3 mr-1" /> {column.linkText || "View"}
                </a>
            ) : <span className="text-gray-400 text-xs">N/A</span>;
        }
        if (column.dataKey === 'liftNumber') {
            return <span className="font-medium text-primary">{value || "N/A"}</span>;
        }
        return value || (value === 0 ? "0" : <span className="text-gray-400 text-xs">N/A</span>);
    };


    const renderTableSection = (tabKey, title, description, data, columnsMeta, visibilityState, isLoading, hasError, emptyMessage) => {
        const visibleCols = columnsMeta.filter((col) => visibilityState[col.dataKey]);
        const isLocalLoading = isLoading;
        const hasLocalError = hasError;

        return (
            <Card className="shadow-sm border border-border flex-1 flex flex-col">
                <CardHeader className="py-3 px-4 bg-muted/30">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center text-md font-semibold text-foreground">
                                {tabKey === 'pending' ? <FileCheck className="h-5 w-5 text-purple-600 mr-2" /> : <History className="h-5 w-5 text-purple-600 mr-2" />}
                                {title} ({data.length})
                            </CardTitle>
                            <CardDescription className="text-sm text-muted-foreground mt-0.5">{description}</CardDescription>
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 text-xs bg-white">
                                    <MixerHorizontalIcon className="mr-1.5 h-3.5 w-3.5" /> View Columns
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[240px] p-3">
                                <div className="grid gap-2">
                                    <p className="text-sm font-medium">Toggle Columns</p>
                                    <div className="flex items-center justify-between mt-1 mb-2">
                                        <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => handleSelectAllColumns(tabKey, columnsMeta, true)}>Select All</Button>
                                        <span className="text-gray-300 mx-1">|</span>
                                        <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => handleSelectAllColumns(tabKey, columnsMeta, false)}>Deselect All</Button>
                                    </div>
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                        {columnsMeta.filter(col => col.toggleable).map(col => (
                                            <div key={`toggle-${tabKey}-${col.dataKey}`} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`toggle-${tabKey}-${col.dataKey}`}
                                                    checked={!!visibilityState[col.dataKey]}
                                                    onCheckedChange={(checked) => handleToggleColumn(tabKey, col.dataKey, Boolean(checked))}
                                                    disabled={col.alwaysVisible}
                                                />
                                                <Label htmlFor={`toggle-${tabKey}-${col.dataKey}`} className="text-xs font-normal cursor-pointer">
                                                    {col.header} {col.alwaysVisible && <span className="text-gray-400 ml-0.5 text-xs">(Fixed)</span>}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col">
                    {isLocalLoading ? (
                        <div className="flex flex-col justify-center items-center py-10 flex-1"><Loader2 className="h-8 w-8 text-purple-600 animate-spin mb-3" /><p className="text-muted-foreground ml-2">Loading...</p></div>
                    ) : hasLocalError ? (
                        <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-destructive-foreground bg-destructive/10 rounded-lg mx-4 my-4 text-center flex-1">
                            <AlertTriangle className="h-10 w-10 text-destructive mb-3" /><p className="font-medium text-destructive">Error Loading Data</p><p className="text-sm text-muted-foreground max-w-md">{error}</p>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-purple-200/50 bg-purple-50/50 rounded-lg mx-4 my-4 text-center flex-1">
                            <Info className="h-12 w-12 text-purple-500 mb-3" />
                            <p className="font-medium text-foreground">No Data Found</p>
                            <p className="text-sm text-muted-foreground text-center">
                                {emptyMessage}
                                {!hasAllFirmAccess && user?.firmName && (
                                    <span className="block mt-1">(Filtered by firm: {user.firmName})</span>
                                )}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-b-lg flex-1">
                            <Table>
                                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                    <TableRow>
                                        {visibleCols.map(col => (
                                            <TableHead key={col.dataKey} className="whitespace-nowrap text-xs px-3 py-2">{col.header}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map(item => (
                                        <TableRow key={item.id} className="hover:bg-purple-50/50">
                                            {visibleCols.map(column => (
                                                <TableCell key={column.dataKey} className={`whitespace-nowrap text-xs px-3 py-2 ${column.dataKey === 'liftNumber' ? 'font-medium text-primary' : 'text-gray-700'}`}>
                                                    {renderCellContent(item, column, tabKey)}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    const pendingKittingColumns = useMemo(() => KITTING_COLUMNS_META.filter(col => col.dataKey !== 'kittingLink'), []);
    const historyKittingColumns = useMemo(() => KITTING_COLUMNS_META.filter(col => col.dataKey !== 'actionColumn'), []);


    return (
        <div className="space-y-4 p-4 md:p-6 bg-slate-50 min-h-screen">
            <Card className="shadow-md border-none">
                <CardHeader className="p-4 border-b border-gray-200">
                    <CardTitle className="flex items-center gap-2 text-gray-700 text-lg">
                        <PackageSearch className="h-5 w-5 text-purple-600" />
                        Full Kitting & Transporting
                    </CardTitle>
                    <CardDescription className="text-gray-500 text-sm">
                        View the status of transport kitting entries.
                        {!hasAllFirmAccess && user?.firmName && (
                            <span className="ml-2 text-purple-600 font-medium">• Filtered by: {user.firmName}</span>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                    {/* Render Kitting Modal */}
                    {isKittingModalOpen && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
                            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                                <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900">Create Kitting</h3>
                                    <button onClick={() => setIsKittingModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="p-4 space-y-4 overflow-y-auto max-h-[65vh]">
                                    <div className="space-y-2">
                                        <Label htmlFor="indentNo" className="text-sm font-medium text-gray-700">Indent No.</Label>
                                        <Input
                                            id="indentNo"
                                            value={kittingFormData.indentNo}
                                            onChange={(e) => setKittingFormData({ ...kittingFormData, indentNo: e.target.value })}
                                            placeholder="Enter indent number"
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="fmsName" className="text-sm font-medium text-gray-700">Fms Name</Label>
                                        <Input
                                            id="fmsName"
                                            value={kittingFormData.fmsName}
                                            disabled
                                            className="w-full bg-gray-50 text-gray-500 cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="status" className="text-sm font-medium text-gray-700">Status</Label>
                                        <Select
                                            value={kittingFormData.status}
                                            onValueChange={(val) => setKittingFormData({ ...kittingFormData, status: val })}
                                        >
                                            <SelectTrigger id="status" className="w-full bg-white">
                                                <SelectValue placeholder="Select Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="No">No</SelectItem>
                                                <SelectItem value="Yes">Yes</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {kittingFormData.status === "Yes" && (
                                        <div className="space-y-4 pt-4 border-t border-gray-100">
                                            <div className="space-y-2">
                                                <Label htmlFor="transporterName" className="text-sm font-medium text-gray-700">Transporter Name</Label>
                                                <Input id="transporterName" value={kittingFormData.transporterName} onChange={(e) => setKittingFormData({ ...kittingFormData, transporterName: e.target.value })} placeholder="Your answer" className="w-full" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="vehicleNumber" className="text-sm font-medium text-gray-700">Vehicle Number</Label>
                                                <Input id="vehicleNumber" value={kittingFormData.vehicleNumber} onChange={(e) => setKittingFormData({ ...kittingFormData, vehicleNumber: e.target.value })} placeholder="Your answer" className="w-full" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="fromLocation" className="text-sm font-medium text-gray-700">From</Label>
                                                <Input id="fromLocation" value={kittingFormData.fromLocation} onChange={(e) => setKittingFormData({ ...kittingFormData, fromLocation: e.target.value })} placeholder="Your answer" className="w-full" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="toLocation" className="text-sm font-medium text-gray-700">To</Label>
                                                <Input id="toLocation" value={kittingFormData.toLocation} onChange={(e) => setKittingFormData({ ...kittingFormData, toLocation: e.target.value })} placeholder="Your answer" className="w-full" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="materialLoadDetails" className="text-sm font-medium text-gray-700">Material Load Details</Label>
                                                <Input id="materialLoadDetails" value={kittingFormData.materialLoadDetails} onChange={(e) => setKittingFormData({ ...kittingFormData, materialLoadDetails: e.target.value })} placeholder="Your answer" className="w-full" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="biltyNumber" className="text-sm font-medium text-gray-700">Bilty Number</Label>
                                                <Input id="biltyNumber" value={kittingFormData.biltyNumber} onChange={(e) => setKittingFormData({ ...kittingFormData, biltyNumber: e.target.value })} placeholder="Your answer" className="w-full" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="rateType" className="text-sm font-medium text-gray-700">Rate Type</Label>
                                                <Input
                                                    id="rateType"
                                                    value={kittingFormData.rateType}
                                                    readOnly
                                                    className="w-full bg-gray-50 text-gray-600 cursor-not-allowed"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="amount" className="text-sm font-medium text-gray-700">Amount</Label>
                                                <Input id="amount" type="number" value={kittingFormData.amount} onChange={(e) => setKittingFormData({ ...kittingFormData, amount: e.target.value })} placeholder="Your answer" className="w-full" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium text-gray-700">Bilty Image</Label>
                                                {kittingFormData.biltyImage && String(kittingFormData.biltyImage).startsWith("http") ? (
                                                    <a
                                                        href={kittingFormData.biltyImage}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" /> View Bilty Image
                                                    </a>
                                                ) : (
                                                    <p className="text-sm text-gray-400">No bilty image available</p>
                                                )}
                                            </div>

                                        </div>
                                    )}
                                </div>
                                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setIsKittingModalOpen(false)} disabled={isSubmittingKitting}>
                                        Cancel
                                    </Button>
                                    <Button className="bg-teal-500 hover:bg-teal-600 text-white" onClick={submitKittingForm} disabled={isSubmittingKitting}>
                                        {isSubmittingKitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                                            </>
                                        ) : "Submit"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                        <TabsList className="grid w-full sm:w-[450px] grid-cols-2 mb-4">
                            <TabsTrigger value="pending" className="flex items-center gap-2">
                                <FileCheck className="h-4 w-4" /> Pending Kitting <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">{pendingKitting.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="history" className="flex items-center gap-2">
                                <History className="h-4 w-4" /> Kitting History <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">{historyKitting.length}</Badge>
                            </TabsTrigger>
                        </TabsList>

                        {/* Filter Section */}
                        <div className="mb-4 p-4 bg-purple-50/50 rounded-lg border border-purple-200">
                            <div className="flex items-center gap-2 mb-3">
                                <Filter className="h-4 w-4 text-gray-500" />
                                <Label className="text-sm font-medium text-gray-700">Filters</Label>
                                <Button variant="outline" size="sm" onClick={clearAllFilters} className="ml-auto bg-white hover:bg-gray-50">
                                    Clear All
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Select value={filters.partyName} onValueChange={(value) => handleFilterChange("partyName", value)}>
                                    <SelectTrigger className="h-9 bg-white text-xs">
                                        <SelectValue placeholder="All Parties" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Parties</SelectItem>
                                        {uniqueFilterOptions.partyName.map((party) => (
                                            <SelectItem key={party} value={party}>{party}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={filters.productName} onValueChange={(value) => handleFilterChange("productName", value)}>
                                    <SelectTrigger className="h-9 bg-white text-xs">
                                        <SelectValue placeholder="All Products" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Products</SelectItem>
                                        {uniqueFilterOptions.productName.map((product) => (
                                            <SelectItem key={product} value={product}>{product}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={filters.transporterName} onValueChange={(value) => handleFilterChange("transporterName", value)}>
                                    <SelectTrigger className="h-9 bg-white text-xs">
                                        <SelectValue placeholder="All Transporters" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Transporters</SelectItem>
                                        {uniqueFilterOptions.transporterName.map((transporter) => (
                                            <SelectItem key={transporter} value={transporter}>{transporter}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={filters.liftNumber} onValueChange={(value) => handleFilterChange("liftNumber", value)}>
                                    <SelectTrigger className="h-9 bg-white text-xs">
                                        <SelectValue placeholder="All Lifts" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Lifts</SelectItem>
                                        {uniqueFilterOptions.liftNumber.map((lift) => (
                                            <SelectItem key={lift} value={lift}>{lift}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <TabsContent value="pending" className="flex-1 flex flex-col mt-0">
                            {renderTableSection("pending", "Pending Kitting", "Entries where Planned (W) is filled but Actual (X) is empty.", pendingKitting, pendingKittingColumns, visiblePendingColumns, loading, !!error, "No entries are currently pending kitting.")}
                        </TabsContent>
                        <TabsContent value="history" className="flex-1 flex flex-col mt-0">
                            {renderTableSection("history", "Kitting History", "Entries where both Planned (W) and Actual (X) are filled.", historyKitting, historyKittingColumns, visibleHistoryColumns, loading, !!error, "There is no kitting history to show.")}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}