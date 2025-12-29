// src/components/FullkittingTransportingPage.jsx
"use client";

import { useState, useEffect, useCallback, useMemo, useContext } from "react";
import { PackageSearch, PlusCircle, Loader2, AlertTriangle, Info, History, FileCheck, ExternalLink, Filter } from "lucide-react";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import { useAuth } from "../context/AuthContext";

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


// --- Constants ---
const SHEET_ID = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
const SHEET_NAME = "Freight full kittingg";

// --- Column Indices (0-based) from 'Freight full kittingg' sheet ---
const COL_FIRM_NAME = 1;         // B
const COL_LIFT_NUMBER = 2;       // C
const COL_PARTY_NAME = 4;        // E
const COL_PRODUCT_NAME = 5;      // F
const COL_TRANSPORTER_NAME = 9;  // J
const COL_PLANNED = 22;          // W (Condition column 1)
const COL_ACTUAL = 23;           // X (Condition column 2)
const COL_KITTING_LINK = 25;     // Z (Link for the action button)

const KITTING_COLUMNS_META = [
    { header: "Action", dataKey: "actionColumn", toggleable: false, alwaysVisible: true },
    { header: "Lift Number", dataKey: "liftNumber", toggleable: true, alwaysVisible: true },
    { header: "Firm Name", dataKey: "firmName", toggleable: true },
    { header: "Party Name", dataKey: "partyName", toggleable: true },
    { header: "Product Name", dataKey: "productName", toggleable: true },
    { header: "Transporter", dataKey: "transporterName", toggleable: true },
    { header: "Kitting Link", dataKey: "kittingLink", toggleable: true, isLink: true, linkText: "View Kitting" },
];


export default function FullkittingTransportingPage() {
    const { user } = useAuth();
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

    const hasAllFirmAccess = user?.firmName?.toLowerCase() === 'all';

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
            const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}&cb=${new Date().getTime()}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch sheet data: ${response.status}`);
            
            let text = await response.text();
            const jsonStart = text.indexOf("{");
            const jsonEnd = text.lastIndexOf("}");
            if (jsonStart === -1 || jsonEnd === -1) throw new Error("Invalid response format from Google Sheets.");
            
            const data = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
            if (!data.table || !data.table.rows) {
                setKittingData([]);
                return;
            }

            let parsedData = data.table.rows.map((row, index) => {
                if (!row || !row.c) return null;
                const get = (colIndex) => {
                    const cell = row.c?.[colIndex];
                    return cell?.v !== undefined && cell?.v !== null ? String(cell.v).trim() : null;
                };
                const getLinkValue = (colIndex) => {
                    const cell = row.c?.[colIndex];
                    return cell && (typeof cell.v !== 'undefined' ? String(cell.v).trim() : (cell.f ? String(cell.f).trim() : null));
                };

                const planned = get(COL_PLANNED);
                const actual = get(COL_ACTUAL);

                if (planned === null) { 
                    return null;
                }
                
                return {
                    id: `kitting-${index}`,
                    firmName: get(COL_FIRM_NAME),
                    liftNumber: get(COL_LIFT_NUMBER),
                    partyName: get(COL_PARTY_NAME),
                    productName: get(COL_PRODUCT_NAME),
                    transporterName: get(COL_TRANSPORTER_NAME),
                    kittingLink: getLinkValue(COL_KITTING_LINK),
                    isPending: actual === null,
                    isHistory: actual !== null,
                };
            }).filter(Boolean);
            
            setKittingData(parsedData); // Set the full dataset
        } catch (err) {
            console.error("Error fetching kitting data:", err);
            setError(`Failed to load data: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, []); // Removed dependencies to only fetch once

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

        // **FIX:** Apply firm-based filter first
        if (!hasAllFirmAccess && user?.firmName) {
            const userFirmNameLower = user.firmName.toLowerCase();
            baseData = baseData.filter(
                item => item.firmName && String(item.firmName).toLowerCase() === userFirmNameLower
            );
        }
        
        // Apply general filters to the already firm-filtered data
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

    const renderCellContent = (item, column, tabKey) => {
        const value = item[column.dataKey];
        if (column.dataKey === 'actionColumn') {
            const link = item.kittingLink;
            return (
                <a href={link || '#'} target="_blank" rel="noopener noreferrer" className={!link ? 'pointer-events-none' : ''}>
                    <Button size="xs" disabled={!link} className="h-7 px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                        <ExternalLink className="mr-1 h-3 w-3" />
                        Create Kitting
                    </Button>
                </a>
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