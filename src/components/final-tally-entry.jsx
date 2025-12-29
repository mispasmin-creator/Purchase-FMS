"use client"

import { useState, useEffect, useCallback, useMemo, useContext } from "react" // Import useContext
import { CheckCircle, FileText, Loader2, Info, X, AlertTriangle, ClipboardList, History, Filter } from "lucide-react"

// Shadcn/ui components
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { AuthContext } from "../context/AuthContext" // Import AuthContext

// --- Google Sheet Configuration ---
const SHEET_ID = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ"
const SHEET_NAME = "LIFT-ACCOUNTS"
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzj9zlZTEhdlmaMt78Qy3kpkz7aOfVKVBRuJkd3wv_UERNrIRCaepSULpNa7W1g-pw/exec"

// IMPORTANT: Set this to the actual row number in your sheet where the data begins (1-indexed)
const DATA_START_ROW = 6; // FIX: Changed from 6 to 7 to match the sheet structure

// --- Column Mapping (0-indexed) ---
const PRIMARY_ID_COL_INDEX = 1 // Column B (assuming LIFT-ID is here)
const VENDOR_COL_INDEX = 3 // Column D
const MATERIAL_NAME_COL_INDEX = 5 // Column F
const QUANTITY_COL_INDEX = 24 // Column Y
const TOTAL_AMOUNT_COL_INDEX = 4 // Column E
const BA_COL_INDEX = 52 // Column BA (0-indexed, 52 means 53rd column)
const BB_TIMESTAMP_COL_INDEX = 53 // Column BB (0-indexed, 53 means 54th column)
const FIRM_NAME_COL = 55 // Column BD for Firm Name

// --- Toast Notification Component (Light theme only) ---
const Toast = ({ message, description, type, onClose }) => {
  const typeClasses = {
    success: { bg: "bg-green-500", icon: <CheckCircle className="h-5 w-5 text-white" /> },
    error: { bg: "bg-red-500", icon: <AlertTriangle className="h-5 w-5 text-white" /> },
    info: { bg: "bg-blue-500", icon: <Info className="h-5 w-5 text-white" /> },
  }
  const currentType = typeClasses[type] || typeClasses.info

  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      className={`fixed top-5 right-5 p-4 rounded-md shadow-lg text-white ${currentType.bg} z-[100] flex items-start space-x-2 max-w-sm`}
    >
      {currentType.icon}
      <div>
        <p className="font-semibold">{message}</p>
        {description && <p className="text-sm">{description}</p>}
      </div>
      <button
        onClick={onClose}
        className="ml-auto -mx-1.5 -my-1.5 bg-transparent text-white hover:bg-white/20 rounded-lg focus:ring-2 focus:ring-white/50 p-1.5 inline-flex h-8 w-8"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}

// Function to format date string
const formatDateString = (dateValue) => {
  if (!dateValue || typeof dateValue !== "string" || !dateValue.trim()) {
    return ""
  }

  // Check if the dateValue is in the format "Date(YYYY, MM, DD, ...)"
  const gvizMatch = dateValue.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?/)
  if (gvizMatch) {
    const [, year, month, day, hours, minutes, seconds] = gvizMatch.map(Number)
    const parsedDate = new Date(year, month, day, hours || 0, minutes || 0, seconds || 0)
    if (!isNaN(parsedDate.getTime())) {
      return new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(parsedDate)
    }
  }

  // If the dateValue is not in the "Date(...)" format, try parsing it as a standard date string
  const dateObj = new Date(dateValue)
  if (!isNaN(dateObj.getTime())) {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(dateObj)
  }

  // Return the original value if parsing fails
  return dateValue
}

export default function FinalTallyEntry() {
  const { user } = useContext(AuthContext) // Get user from AuthContext
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingUpdate, setProcessingUpdate] = useState({})
  const [toast, setToast] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("approve")

  // Filter states
  const [filters, setFilters] = useState({
    vendor: "all",
    material: "all",
    quantity: "all",
    totalAmount: "all",
  })

  const fetchSheetData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const cacheBuster = new Date().getTime()
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}&t=${cacheBuster}`

      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch sheet data: ${response.status} ${response.statusText}`)

      let text = await response.text()
      const jsonpStart = "google.visualization.Query.setResponse("
      if (text.startsWith(jsonpStart)) {
        text = text.substring(jsonpStart.length, text.length - 2)
      } else {
        const jsonStartIndex = text.indexOf("{")
        const jsonEndIndex = text.lastIndexOf("}")
        if (jsonStartIndex === -1 || jsonEndIndex === -1 || jsonEndIndex <= jsonStartIndex) {
          throw new Error("Invalid response format from Google Sheets.")
        }
        text = text.substring(jsonStartIndex, jsonEndIndex + 1)
      }
      const data = JSON.parse(text)

      if (data.status === "error")
        throw new Error(
          `Google Sheets API error: ${data.errors.map((e) => e.detailed_message || e.message).join(", ")}`,
        )
      if (!data.table || !data.table.rows) {
        setEntries([])
        setLoading(false)
        return
      }

      let parsedEntries = data.table.rows
        .map((row, gvizRowIndex) => {
          if (!row.c || row.c.length === 0) return null

          const getCellValue = (colIndex, defaultValue = null) => {
            if (row.c[colIndex]) {
              return row.c[colIndex].f !== undefined && row.c[colIndex].f !== null
                ? String(row.c[colIndex].f)
                : row.c[colIndex].v !== undefined && row.c[colIndex].v !== null
                  ? String(row.c[colIndex].v)
                  : defaultValue
            }
            return defaultValue
          }

          const primaryId = getCellValue(PRIMARY_ID_COL_INDEX)
          if (primaryId === null || String(primaryId).trim() === "") return null

          const entryData = {
            id: String(primaryId),
            _rowIndexInSheet: DATA_START_ROW + gvizRowIndex,
            vendor: getCellValue(VENDOR_COL_INDEX, "N/A"),
            material: getCellValue(MATERIAL_NAME_COL_INDEX, "N/A"),
            quantity: getCellValue(QUANTITY_COL_INDEX, "N/A"),
            totalAmount: getCellValue(TOTAL_AMOUNT_COL_INDEX, "-"),
            BA_value: getCellValue(BA_COL_INDEX),
            BB_timestamp_value: getCellValue(BB_TIMESTAMP_COL_INDEX),
            BB_timestamp_formatted_value: formatDateString(getCellValue(BB_TIMESTAMP_COL_INDEX)),
            rawCells: row.c ? row.c.map((cell) => (cell ? (cell.f ?? cell.v) : null)) : [],
            firmName: getCellValue(FIRM_NAME_COL), // Added Firm Name
          }

          entryData.isCompleted =
            entryData.BB_timestamp_value !== null && String(entryData.BB_timestamp_value).trim() !== ""

          return entryData
        })
        .filter((entry) => entry !== null)

      // Apply firm-based filtering
      if (user?.firmName && user.firmName.toLowerCase() !== "all") {
        const userFirmNameLower = user.firmName.toLowerCase()
        parsedEntries = parsedEntries.filter(
          (entry) => entry && entry.firmName && String(entry.firmName).toLowerCase() === userFirmNameLower,
        )
      }

      setEntries(parsedEntries)
    } catch (err) {
      setError(`Failed to load data: ${err.message}`)
      setToast({ message: "Data Load Error", description: err.message, type: "error" })
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [user]) // Added user to dependencies

  useEffect(() => {
    fetchSheetData()
  }, [fetchSheetData])

const handleFinalTallyMarkDone = async (entryId, checked) => {
  const entryToUpdate = entries.find((e) => e.id === entryId);
  if (!entryToUpdate) {
    setToast({
      message: "Error",
      description: `Entry ${entryId} not found. Try refreshing.`,
      type: "error",
    });
    return;
  }

  if (!entryToUpdate.BA_value || String(entryToUpdate.BA_value).trim() === "") {
    setToast({
      message: "Prerequisite Missing",
      description: `LIFT-ID ${entryToUpdate.id}: Column BA (Invoice No.) must be filled.`,
      type: "error",
    });
    return;
  }

  setProcessingUpdate((prev) => ({ ...prev, [entryId]: true }));

  let newTimestampForBB = null;
  if (checked) {
    newTimestampForBB = new Date()
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      .replace(/,/g, "");
  }

  try {
    const cellUpdates = {
      [`col${BB_TIMESTAMP_COL_INDEX + 1}`]: newTimestampForBB,
    };

    const params = new URLSearchParams({
      action: "updateCells",
      sheetName: SHEET_NAME,
      rowIndex: entryToUpdate._rowIndexInSheet,
      cellUpdates: JSON.stringify(cellUpdates),
    });

    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const responseText = await response.text();
    if (!response.ok && !responseText.toLowerCase().includes("success")) {
      throw new Error(`Server error: ${response.status}. ${responseText}`);
    }

    setTimeout(() => {
      fetchSheetData();
    }, 1000);

    setToast({
      message: checked ? "Tally Entry Completed" : "Tally Entry Reverted",
      description: `LIFT-ID ${entryToUpdate.id} status updated.`,
      type: "success",
    });
  } catch (err) {
    setToast({
      message: "Update Failed",
      description: `LIFT-ID ${entryToUpdate.id}: ${err.message}`,
      type: "error",
    });
    fetchSheetData();
  } finally {
    setProcessingUpdate((prev) => {
      const newState = { ...prev };
      delete newState[entryId];
      return newState;
    });
  }
};



  const closeToast = () => setToast(null)

  // Memoized filtered data
  const eligibleEntries = useMemo(() => {
    return entries.filter((entry) => entry.BA_value !== null && String(entry.BA_value).trim() !== "")
  }, [entries])

  const pendingEntries = useMemo(() => {
    let filtered = eligibleEntries.filter((entry) => !entry.isCompleted)

    // Apply filters
    if (filters.vendor !== "all") {
      filtered = filtered.filter((entry) => entry.vendor === filters.vendor)
    }
    if (filters.material !== "all") {
      filtered = filtered.filter((entry) => entry.material === filters.material)
    }
    if (filters.quantity !== "all") {
      filtered = filtered.filter((entry) => entry.quantity === filters.quantity)
    }
    if (filters.totalAmount !== "all") {
      filtered = filtered.filter((entry) => entry.totalAmount === filters.totalAmount)
    }

    return filtered
  }, [eligibleEntries, filters])

  const completedEntries = useMemo(() => {
    let filtered = eligibleEntries.filter((entry) => entry.isCompleted)

    // Apply filters
    if (filters.vendor !== "all") {
      filtered = filtered.filter((entry) => entry.vendor === filters.vendor)
    }
    if (filters.material !== "all") {
      filtered = filtered.filter((entry) => entry.material === filters.material)
    }
    if (filters.quantity !== "all") {
      filtered = filtered.filter((entry) => entry.quantity === filters.quantity)
    }
    if (filters.totalAmount !== "all") {
      filtered = filtered.filter((entry) => entry.totalAmount === filters.totalAmount)
    }

    return filtered.sort((a, b) => {
      const parseDate = (dateString) => {
        if (!dateString) return 0
        const parts = String(dateString).split(/[\s/:]+/)
        if (parts.length === 6) {
          const year = parts[2].length === 4 ? parts[2] : `20${parts[2]}`
          return new Date(year, parts[1] - 1, parts[0], parts[3], parts[4], parts[5]).getTime()
        }
        const d = new Date(String(dateString))
        return isNaN(d.getTime()) ? 0 : d.getTime()
      }
      return parseDate(b.BB_timestamp_value) - parseDate(a.BB_timestamp_value)
    })
  }, [eligibleEntries, filters])

  // Get unique values for filters
  const getUniqueValues = (field) => {
    const values = eligibleEntries.map((entry) => entry[field]).filter((value) => value && value !== "N/A")
    return [...new Set(values)].sort()
  }

  const formatDisplayValue = (val, fieldType = null) => {
    if (val === null || val === undefined || String(val).trim() === "") {
      if (fieldType === "totalAmount") return <span className="italic text-slate-400">-</span>
      return <span className="italic text-slate-400">N/A</span>
    }
    return String(val)
  }

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const clearAllFilters = () => {
    setFilters({
      vendor: "all",
      material: "all",
      quantity: "all",
      totalAmount: "all",
    })
  }

  const renderTable = (data, showCheckbox = false) => (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            {showCheckbox && <TableHead className="w-20 text-center">Action</TableHead>}
            <TableHead className="font-semibold">LIFT-ID</TableHead>
            <TableHead className="font-semibold">Vendor</TableHead>
            <TableHead className="font-semibold">Material</TableHead>
            <TableHead className="font-semibold">Quantity</TableHead>
            <TableHead className="font-semibold">Total Amount</TableHead>
            {!showCheckbox && <TableHead className="font-semibold">Completed On</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((entry) => (
            <TableRow key={entry.id} className="hover:bg-muted/30">
              {showCheckbox && (
                <TableCell className="text-center">
                  {processingUpdate[entry.id] ? (
                    <Loader2 className="h-4 w-4 text-purple-500 animate-spin mx-auto" />
                  ) : (
                    <Checkbox
                      id={`final-tally-${entry.id}`}
                      checked={!!entry.isCompleted}
                      onCheckedChange={(checked) => handleFinalTallyMarkDone(entry.id, checked)}
                      className="mx-auto"
                    />
                  )}
                </TableCell>
              )}
              <TableCell className="font-medium text-primary">{formatDisplayValue(entry.id)}</TableCell>
              <TableCell>{formatDisplayValue(entry.vendor)}</TableCell>
              <TableCell>{formatDisplayValue(entry.material)}</TableCell>
              <TableCell>{formatDisplayValue(entry.quantity)}</TableCell>
              <TableCell>{formatDisplayValue(entry.totalAmount, "totalAmount")}</TableCell>
              {!showCheckbox && <TableCell>{formatDisplayValue(entry.BB_timestamp_formatted_value)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {toast && (
        <Toast message={toast.message} description={toast.description} type={toast.type} onClose={closeToast} />
      )}

      <Card className="shadow-md border-none">
        <CardHeader className="p-4 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2 text-gray-700 text-lg">
            <FileText className="h-5 w-5 text-purple-600" />
            Step 8: Final Tally Entry
          </CardTitle>
          <CardDescription className="text-gray-500 text-sm">
            Mark purchase orders as entered in Tally accounting system after final checks.
            {user?.firmName && user.firmName.toLowerCase() !== "all" && (
              <span className="ml-2 text-purple-600 font-medium">• Filtered by: {user.firmName}</span>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-60">
              <Loader2 className="h-10 w-10 text-purple-500 animate-spin mb-3" />
              <p className="text-muted-foreground">Loading Data from Sheet "{SHEET_NAME}"...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-60 text-center p-4 border-2 border-dashed border-destructive bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
              <h3 className="text-lg font-medium text-destructive">Error Loading Data</h3>
              <p className="text-sm text-muted-foreground max-w-md">{error}</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-center">
              <Info className="h-10 w-10 text-purple-500 mb-3" />
              <h3 className="text-lg font-medium text-foreground">No Data Entries Found</h3>
              <p className="text-sm text-muted-foreground">
                Sheet "{SHEET_NAME}" might be empty after row {DATA_START_ROW - 1}, or no entries have a LIFT-ID.
              </p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 max-w-xs">
                <TabsTrigger value="approve" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Approve
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                    {pendingEntries.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  History
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                    {completedEntries.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* Filters Section */}
              <div className="mb-4 p-4 bg-purple-50/50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Filters</Label>
                  <Button variant="outline" size="sm" onClick={clearAllFilters} className="ml-auto bg-white">
                    Clear All
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Select size="sm" value={filters.vendor} onValueChange={(value) => handleFilterChange("vendor", value)}>
                    <SelectTrigger className="h-8 bg-white">
                      <SelectValue placeholder="All Vendors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vendors</SelectItem>
                      {getUniqueValues("vendor").map((vendor) => (
                        <SelectItem key={vendor} value={vendor}>
                          {vendor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select size="sm" value={filters.material} onValueChange={(value) => handleFilterChange("material", value)}>
                    <SelectTrigger className="h-8 bg-white">
                      <SelectValue placeholder="All Materials" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Materials</SelectItem>
                      {getUniqueValues("material").map((material) => (
                        <SelectItem key={material} value={material}>
                          {material}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select size="sm" value={filters.quantity} onValueChange={(value) => handleFilterChange("quantity", value)}>
                    <SelectTrigger className="h-8 bg-white">
                      <SelectValue placeholder="All Quantities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Quantities</SelectItem>
                      {getUniqueValues("quantity").map((quantity) => (
                        <SelectItem key={quantity} value={quantity}>
                          {quantity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    size="sm"
                    value={filters.totalAmount}
                    onValueChange={(value) => handleFilterChange("totalAmount", value)}
                  >
                    <SelectTrigger className="h-8 bg-white">
                      <SelectValue placeholder="All Amounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Amounts</SelectItem>
                      {getUniqueValues("totalAmount").map((amount) => (
                        <SelectItem key={amount} value={amount}>
                          {amount}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TabsContent value="approve" className="mt-0">
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-purple-600" />
                      Pending Tally Entries ({pendingEntries.length})
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Items with Invoice No. (Column BA) filled but not yet marked as entered in Tally
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {pendingEntries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
                        <h3 className="text-lg font-medium text-foreground">All Entries Processed!</h3>
                        <p className="text-sm text-muted-foreground">No items currently pending Tally entry.</p>
                      </div>
                    ) : (
                      <div className="p-4">{renderTable(pendingEntries, true)}</div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="h-5 w-5 text-purple-600" />
                      Completed Tally Entries ({completedEntries.length})
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Items that have been marked as entered in Tally, sorted by completion date (latest first)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {completedEntries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Info className="h-12 w-12 text-purple-500 mb-3" />
                        <h3 className="text-lg font-medium text-foreground">No Completed Entries</h3>
                        <p className="text-sm text-muted-foreground">No entries have been completed yet.</p>
                      </div>
                    ) : (
                      <div className="p-4">{renderTable(completedEntries, false)}</div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}