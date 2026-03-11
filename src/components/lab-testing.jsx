"use client"

import { useState, useEffect, useCallback, useMemo, useContext } from "react"
// Shadcn/ui components
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
// Remove Command import if you don't have it, or install it
// import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"

// Sonner Toast
import { toast } from "sonner"

// Lucide icons - FIXED: Correct icon name
import { Beaker, CheckCircle, XCircle, Loader2, AlertTriangle, Info, History, FileCheckIcon, Filter, ChevronsUpDown } from "lucide-react"
import { MixerHorizontalIcon } from "@radix-ui/react-icons"
import { AuthContext } from "../context/AuthContext"
import { supabase } from "../supabase"

// --- Constants for Google Sheets and Apps Script ---
const SHEET_ID = "13_sHCFkVxAzPbel-k9BuUBFY-E11vdKJAOgvzhBMLMY"
const LIFTS_SHEET_NAME = "LIFT-ACCOUNTS"
const INDENT_SHEET_NAME = "INDENT-PO"
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbylQZLstOi0LyDisD6Z6KKC97pU5YJY2dDYVw2gtnW1fxZq9kz7wHBei4aZ8Ed-XKhKEA/exec"
const DATA_START_ROW_LIFTS = 5 // FIX: Corrected from 7 to 6

// ---- Column Indices for LIFT-ACCOUNTS (0-based) ----
const LIFT_ID_COL = 1 // B: Lift No
const INDENT_NO_COL = 2 // C: Indent No.
const VENDOR_NAME_COL = 3 // D: Vendor Name
const RAW_MATERIAL_NAME_COL = 5 // F: Raw Material Name
const ORIGINAL_QTY_COL = 6 // G: PO Qty
const LIFT_TYPE_COL = 10 // K: Type
const BILL_NO_COL = 7 // H: Bill No.
const RECEIPT_DATE_OF_RECEIVING_COL = 22 // W: Date Of Receiving
const RECEIPT_TOTAL_BILL_QUANTITY_COL = 23 // X: Total Bill Quantity
const RECEIPT_ACTUAL_QTY_COL = 24 // Y: Actual Quantity Received
const FIRM_NAME_COL = 55 // BD: Firm Name

// --- Lab Test Data Columns ---
const AI_CONDITION_NOT_NULL_COL = 34 // AI: Date Of Receiving
const AJ_TIMESTAMP_OR_NULL_COL = 35 // AJ: Lab Test Timestamp
const AL_STATUS_COL = 37 // AL: Status
const AM_DATE_OF_TEST_COL = 38 // AM: Date of Test
const AN_MOISTURE_PERCENT_COL = 39 // AN: Moisture %
const AO_BD_PERCENT_COL = 40 // AO: BD %
const AP_AP_PERCENT_COL = 41 // AP: AP %
const AQ_ALUMINA_PERCENT_COL = 42 // AQ: Alumina %
const AR_IRON_PERCENT_COL = 43 // AR: Iron %
const AS_SIEVE_ANALYSIS_COL = 44 // AS: Sieve Analysis
const AT_LOI_PERCENT_COL = 45 // AT: LOI %
const AU_SIO2_PERCENT_COL = 46 // AU: SiO2 %
const AV_CAO_PERCENT_COL = 47 // AV: CaO %
const AW_MGO_PERCENT_COL = 48 // AW: MgO %
const AX_TIO2_PERCENT_COL = 49 // AX: TiO2 %
const AY_KNA2O_PERCENT_COL = 50 // AY: K2O+Na2O %
const AZ_FREE_IRON_PERCENT_COL = 51 // AZ: Free Iron %

// --- Column Indices for INDENT-PO (0-based) ----
const INDENT_NO_COL_INDENT = 1 // B: Indent No (in INDENT-PO)
const ALUMINA_COL_INDENT = 30 // AE: Alumina % (in INDENT-PO) - Adjust based on your sheet
const TOTAL_QUANTITY_COL_INDENT = 23 // X: Total Quantity (in INDENT-PO) - ADD THIS LINE
const IRON_COL_INDENT = 31 // AF: Iron % (in INDENT-PO) - Adjust based on your sheet

// --- Helper to parse Google Sheet gviz JSON response ---
const parseGvizResponse = (text, sheetNameForError) => {
  if (!text || !text.includes("google.visualization.Query.setResponse")) {
    console.error(
      `Invalid or empty gviz response for ${sheetNameForError}:`,
      text ? text.substring(0, 500) : "Response was null/empty",
    )
    throw new Error(
      `Invalid response format from Google Sheets for ${sheetNameForError}. Please ensure the sheet is publicly accessible and the sheet name is correct.`,
    )
  }

  try {
    const jsonStart = text.indexOf("{")
    const jsonEnd = text.lastIndexOf("}") + 1
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error(`Could not find JSON data in response`)
    }

    const jsonString = text.substring(jsonStart, jsonEnd)
    const data = JSON.parse(jsonString)

    if (data.status === "error") {
      throw new Error(`Google Sheets API Error: ${data.errors?.[0]?.detailed_message || "Unknown error"}`)
    }

    if (!data.table) {
      console.warn(`No data.table in ${sheetNameForError}, treating as empty.`)
      return { cols: [], rows: [] }
    }

    if (!data.table.cols) {
      console.warn(`No data.table.cols in ${sheetNameForError}, treating as empty.`)
      return { cols: [], rows: [] }
    }

    if (!data.table.rows) {
      console.warn(`No data.table.rows in ${sheetNameForError}, treating as empty.`)
      data.table.rows = []
    }

    return data.table
  } catch (parseError) {
    console.error("JSON Parse Error:", parseError)
    throw new Error(`Failed to parse response from Google Sheets: ${parseError.message}`)
  }
}

// Function to format date string
const formatDateString = (dateValue) => {
  if (!dateValue || typeof dateValue !== "string" || !dateValue.trim()) {
    return ""
  }

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

  return dateValue
}

// --- Column Definitions for Tables ---
const ELIGIBLE_TESTS_COLUMNS_META = [
  { header: "Action", dataKey: "actionColumn", toggleable: false, alwaysVisible: true },
  { header: "Lift Number", dataKey: "liftNo", toggleable: true, alwaysVisible: true },
  { header: "Date of Receiving (AI)", dataKey: "aiCondition_val_formatted", toggleable: true },
  { header: "PO Number", dataKey: "indentNo", toggleable: true },
  { header: "Party Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "PO Quantity", dataKey: "poQuantity", toggleable: true },
  { header: "Actual Qty Rcvd", dataKey: "actualQty_fromReceipt", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
]

const RECORDED_TESTS_COLUMNS_META = [
  { header: "Lift Number", dataKey: "liftNo", toggleable: true, alwaysVisible: true },
  { header: "Test Date (AM)", dataKey: "amDateOfTest_formatted_val", toggleable: true },
  { header: "Test Timestamp (AJ)", dataKey: "ajTimestamp_formatted_val", toggleable: true },
  { header: "Status (AL)", dataKey: "alStatus_val", toggleable: true, isBadge: true },
  { header: "Moisture % (AN)", dataKey: "anMoisturePercent_val", toggleable: true },
  { header: "BD % (AO)", dataKey: "aoBdPercent_val", toggleable: true },
  { header: "AP % (AP)", dataKey: "apApPercent_val", toggleable: true },
  { header: "Alumina % (AQ)", dataKey: "aqAluminaPercent_val", toggleable: true },
  { header: "Iron % (AR)", dataKey: "arIronPercent_val", toggleable: true },
  { header: "Sieve Analysis (AS)", dataKey: "asSieveAnalysis_val", toggleable: true },
  { header: "LOI % (AT)", dataKey: "atLoiPercent_val", toggleable: true },
  { header: "SiO2 % (AU)", dataKey: "auSio2Percent_val", toggleable: true },
  { header: "CaO % (AV)", dataKey: "avCaoPercent_val", toggleable: true },
  { header: "MgO % (AW)", dataKey: "awMgoPercent_val", toggleable: true },
  { header: "TiO2 % (AX)", dataKey: "axTio2Percent_val", toggleable: true },
  { header: "K2O+Na2O % (AY)", dataKey: "ayKna2oPercent_val", toggleable: true },
  { header: "Free Iron % (AZ)", dataKey: "azFreeIronPercent_val", toggleable: true },
  { header: "Reason", dataKey: "baReason_val", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
]

// Simple SearchableSelect Component (without Command)
const SearchableSelect = ({
  value,
  onValueChange,
  options,
  placeholder,
  className
}) => {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="relative">
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`w-full justify-between h-9 bg-white text-xs ${className}`}
      >
        {value === "all" || !value ? `All ${placeholder}` : value}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="sticky top-0 bg-white p-2 border-b">
            <Input
              type="text"
              placeholder={`Search ${placeholder.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-7 text-xs"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="py-1">
            <div
              className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 ${value === "all" ? "bg-blue-50" : ""}`}
              onClick={() => {
                onValueChange("all")
                setOpen(false)
                setSearchTerm("")
              }}
            >
              All {placeholder}
            </div>
            {filteredOptions.map((option, index) => (
              <div
                key={`${option}-${index}`}
                className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 ${value === option ? "bg-blue-50" : ""}`}
                onClick={() => {
                  onValueChange(option)
                  setOpen(false)
                  setSearchTerm("")
                }}
              >
                {option}
              </div>
            ))}
          </div>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  )
}

export default function LabTesting() {
  const { user } = useContext(AuthContext)
  const [allLiftsData, setAllLiftsData] = useState([])
  const [indentData, setIndentData] = useState([])
  const [selectedReceiptForModal, setSelectedReceiptForModal] = useState(null)
  const [loadingData, setLoadingData] = useState(true)
  const [errorData, setErrorData] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Tab and Column Visibility States
  const [activeTab, setActiveTab] = useState("eligibleForTest")
  const [visibleEligibleTestColumns, setVisibleEligibleTestColumns] = useState({})
  const [visibleRecordedTestColumns, setVisibleRecordedTestColumns] = useState({})

  // Filter State
  const [filters, setFilters] = useState({
    vendorName: "all",
    materialName: "all",
    liftType: "all",
    totalQuantity: "all",
    orderNumber: "all",
  })

  const initialFormData = {
    liftIdToUpdate: "",
    alStatus: "",
    amDateOfTest: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
    anMoisturePercent: "",
    aoBdPercent: "",
    apApPercent: "",
    aqAluminaPercent: "",
    arIronPercent: "",
    asSieveAnalysis: "",
    atLoiPercent: "",
    auSio2Percent: "",
    avCaoPercent: "",
    awMgoPercent: "",
    axTio2Percent: "",
    ayKna2oPercent: "",
    azFreeIronPercent: "",
    baReason: "",
  }

  const [formData, setFormData] = useState(initialFormData)
  const [formErrors, setFormErrors] = useState({})

  // Filter Handlers
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearAllFilters = () => {
    setFilters({
      vendorName: "all",
      materialName: "all",
      liftType: "all",
      totalQuantity: "all",
      orderNumber: "all",
    })
  }

  // Function to get expected values
  // Function to get expected values
  // Function to get expected values
  const getExpectedValues = (indentNo) => {
    try {
      if (!indentNo || !indentData.length) {
        return { poQuantity: "", expectedAlumina: "", expectedIron: "" };
      }

      // Clean the indent number for comparison
      const cleanIndentNo = String(indentNo).trim().toLowerCase();

      // Find matching indent with multiple matching strategies
      const indent = indentData.find(item => {
        if (!item.indentNo) return false;

        const itemIndent = String(item.indentNo).trim().toLowerCase();

        // Direct match
        if (itemIndent === cleanIndentNo) return true;

        // Try matching with/without prefixes like "RL-", "PO-", etc.
        const cleanIndentNoWithoutPrefix = cleanIndentNo.replace(/^(rl[-_ ]?|po[-_ ]?|indent[-_ ]?)/i, '');
        const itemIndentWithoutPrefix = itemIndent.replace(/^(rl[-_ ]?|po[-_ ]?|indent[-_ ]?)/i, '');

        if (itemIndentWithoutPrefix === cleanIndentNoWithoutPrefix) return true;

        // Try extracting numeric part only
        const cleanIndentNumeric = cleanIndentNo.match(/\d+/)?.[0];
        const itemIndentNumeric = itemIndent.match(/\d+/)?.[0];

        if (cleanIndentNumeric && itemIndentNumeric && cleanIndentNumeric === itemIndentNumeric) return true;

        return false;
      });

      return {
        poQuantity: indent?.poQuantity || "",
        expectedAlumina: indent?.expectedAlumina || "",
        expectedIron: indent?.expectedIron || "",
        expectedAp: indent?.expectedAp || "",
        expectedBd: indent?.expectedBd || "",
      };
    } catch (error) {
      console.error("Error in getExpectedValues:", error);
      return { poQuantity: "", expectedAlumina: "", expectedIron: "" };
    }
  };


  // Fetch INDENT-PO Data from Supabase
  useEffect(() => {
    const fetchIndentData = async () => {
      try {
        const { data, error } = await supabase
          .from("INDENT-PO")
          .select('"Indent Id.", "Total Quantity", Quantity, "Alumina %", "Iron %", "AP Percent Age %", "BD Percent Age %"');

        if (error) throw error;

        const processedData = data.map((row) => ({
          indentNo: row["Indent Id."] ? String(row["Indent Id."]) : "",
          poQuantity: row["Total Quantity"] ? String(row["Total Quantity"]) : String(row["Quantity"] || ""),
          expectedAlumina: row["Alumina %"] ? String(row["Alumina %"]) : "",
          expectedIron: row["Iron %"] ? String(row["Iron %"]) : "",
          expectedAp: row["AP Percent Age %"] ? String(row["AP Percent Age %"]) : "",
          expectedBd: row["BD Percent Age %"] ? String(row["BD Percent Age %"]) : "",
        })).filter(item => item.indentNo && item.indentNo.trim() !== "");

        console.log("Total INDENT-PO records loaded from Supabase:", processedData.length);

        setIndentData(processedData);
      } catch (err) {
        console.error("Failed to load INDENT-PO data from Supabase:", err.message);
        toast.error("Failed to load Indent Data", { description: err.message });
      }
    };

    fetchIndentData();
  }, [refreshTrigger]);


  // Initialize column visibility
  useEffect(() => {
    const initializeVisibility = (columnsMeta) => {
      const visibility = {}
      columnsMeta.forEach((col) => {
        visibility[col.dataKey] = col.alwaysVisible || col.toggleable
      })
      return visibility
    }
    setVisibleEligibleTestColumns(initializeVisibility(ELIGIBLE_TESTS_COLUMNS_META))
    setVisibleRecordedTestColumns(initializeVisibility(RECORDED_TESTS_COLUMNS_META))
  }, [])

  // Fetch LIFT-ACCOUNTS Data
  // Update the fetchLiftAccountData useEffect
  // Update the fetchLiftAccountData useEffect
  useEffect(() => {
    const fetchLiftAccountData = async () => {
      setLoadingData(true);
      setErrorData(null);
      try {
        // Fetch from Supabase LIFT-ACCOUNTS table
        const { data, error: fetchError } = await supabase
          .from("LIFT-ACCOUNTS")
          .select("*")
          .order("Timestamp", { ascending: false });

        if (fetchError) throw fetchError;

        // Helper to format date for display
        const formatTimestamp = (dateValue) => {
          if (!dateValue) return "";
          try {
            const d = new Date(dateValue);
            if (!isNaN(d.getTime())) {
              return d.toLocaleString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              }).replace(/,/g, "");
            }
          } catch (e) {
            return String(dateValue);
          }
          return String(dateValue);
        };

        // Process lifts data
        let processedData = (data || []).map((row) => {
          const liftNo = String(row["Lift No"] || "").trim();
          const indentNo = String(row["Indent no."] || "").trim();

          // Get expected values for this indent
          let expectedValues = { poQuantity: "", expectedAlumina: "", expectedIron: "" };

          if (indentNo && indentData.length > 0) {
            // Find matching indent in INDENT-PO data
            const matchingIndent = indentData.find(indent => {
              const liftIndent = String(indentNo).trim().toLowerCase();
              const sheetIndent = String(indent.indentNo).trim().toLowerCase();

              // Direct match
              if (liftIndent === sheetIndent) return true;

              // Try matching numeric parts
              const liftIndentNumeric = liftIndent.match(/\d+/)?.[0];
              const sheetIndentNumeric = sheetIndent.match(/\d+/)?.[0];

              return liftIndentNumeric && sheetIndentNumeric && liftIndentNumeric === sheetIndentNumeric;
            });

            if (matchingIndent) {
              expectedValues = {
                poQuantity: matchingIndent.poQuantity || "",
                expectedAlumina: matchingIndent.expectedAlumina || "",
                expectedIron: matchingIndent.expectedIron || "",
              };
            }
          }

          const liftData = {
            _id: `LIFT-ACCOUNTS-${row.id}`,
            _dbId: row.id, // Store the Supabase row ID for updates
            liftNo: liftNo,
            indentNo: indentNo,
            vendorName: String(row["Vendor Name"] || "").trim(),
            rawMaterialName: String(row["Raw Material Name"] || "").trim(),
            type: String(row["Type"] || "").trim(),
            qty: String(row["Qty"] || "").trim(),
            totalBillQuantity_fromSheet: String(row["Total Bill Quantity"] || "").trim(),
            actualQty_fromReceipt: String(row["Actual Quantity"] || "").trim(),
            billNo: String(row["Bill No."] || "").trim(),
            dateOfReceiving_formatted: formatTimestamp(row["Date Of Receiving"]),
            firmName: String(row["Firm Name"] || "").trim(),
            physicalCondition: String(row["Physical Condition"] || "").trim(),
            moisture: String(row["Moisture"] || "").trim(),
            // Filter columns - using Planned 2 and Actual 2
            filterColPlanned2: row["Planned 2"],
            filterColActual2: row["Actual 2"],
            aiCondition_val: row["Planned 2"],
            aiCondition_val_formatted: formatTimestamp(row["Planned 2"]),
            ajTimestamp_val: row["Actual 2"],
            ajTimestamp_formatted_val: formatTimestamp(row["Actual 2"]),
            // Lab test data from Supabase - using actual schema column names
            alStatus_val: String(row["Status"] || "").trim(),
            amDateOfTest_val: row["Date Of Test"] || "",
            amDateOfTest_formatted_val: formatTimestamp(row["Date Of Test"]),
            anMoisturePercent_val: String(row["Moisture Percent Age %"] || "").trim(),
            aoBdPercent_val: String(row["BD Percent Age %"] || "").trim(),
            apApPercent_val: String(row["AP Percent Age %"] || "").trim(),
            aqAluminaPercent_val: String(row["Alumina Percent Age %"] || "").trim(),
            arIronPercent_val: String(row["Iron Percent Age %"] || "").trim(),
            asSieveAnalysis_val: String(row["Sieve Analysis"] || "").trim(),
            atLoiPercent_val: String(row["LOI %"] || "").trim(),
            auSio2Percent_val: String(row["SIO2 %"] || "").trim(),
            avCaoPercent_val: String(row["CaO %"] || "").trim(),
            awMgoPercent_val: String(row["MgO %"] || "").trim(),
            axTio2Percent_val: String(row["TiO2 %"] || "").trim(),
            ayKna2oPercent_val: String(row["K2O + Na2O %"] || "").trim(),
            azFreeIronPercent_val: String(row["Free Iron %"] || "").trim(),
            baReason_val: String(row["Reason"] || "").trim(),
            // PO Quantity from matching
            poQuantity: expectedValues.poQuantity,
            expectedAlumina: expectedValues.expectedAlumina,
            expectedIron: expectedValues.expectedIron,
          };
          return liftData;
        });

        // Filter by firm name
        if (user?.firmName && user.firmName.toLowerCase() !== "all") {
          const userFirmNameLower = user.firmName.toLowerCase();
          processedData = processedData.filter(
            (lift) => lift && lift.firmName && String(lift.firmName).toLowerCase() === userFirmNameLower,
          );
        }
        // Show only Independent type lifts
        processedData = processedData.filter((lift) => lift && String(lift.type || "").toLowerCase() === "independent");

        setAllLiftsData(processedData);

      } catch (err) {
        const errorMessage = `Failed to load data from LIFT-ACCOUNTS: ${err.message}`;
        setErrorData(errorMessage);
        toast.error("Data Load Error", {
          description: errorMessage,
          icon: <XCircle className="h-4 w-4" />,
        });
      } finally {
        setLoadingData(false);
      }
    };

    fetchLiftAccountData();
  }, [refreshTrigger, user, indentData]);
  // Add indentData to dependencies
  // NEW: Add this useEffect to combine data AFTER both are loaded
  // NEW: Add this useEffect to combine data AFTER both are loaded
  useEffect(() => {
    // Only run if we have both datasets and lifts don't already have poQuantity
    if (indentData.length > 0 && allLiftsData.length > 0 && !allLiftsData[0]?.poQuantity) {
      console.log("Matching PO quantities...", {
        lifts: allLiftsData.length,
        indents: indentData.length,
        sampleIndents: indentData.slice(0, 3)
      })

      const updatedLifts = allLiftsData.map(lift => {
        if (lift.indentNo) {
          // Find matching indent in INDENT-PO data
          const matchingIndent = indentData.find(indent => {
            // Clean both indent numbers for comparison
            const liftIndent = String(lift.indentNo).trim().toLowerCase()
            const sheetIndent = String(indent.indentNo).trim().toLowerCase()

            // Log for debugging
            if (liftIndent === "rl-007") {
              console.log("Looking for RL-007 match:", {
                liftIndent,
                sheetIndent,
                poQuantity: indent.poQuantity,
                matches: liftIndent === sheetIndent
              })
            }

            return liftIndent === sheetIndent
          })

          if (matchingIndent) {
            console.log(`Found match for ${lift.indentNo}:`, matchingIndent.poQuantity)
            return {
              ...lift,
              poQuantity: matchingIndent.poQuantity || ""
            }
          } else {
            console.log(`No match found for indent: ${lift.indentNo}`)
          }
        }
        return lift
      })

      console.log("Updated lifts with PO quantities:", updatedLifts.filter(l => l.indentNo === "RL-007"))
      setAllLiftsData(updatedLifts)
    }
  }, [indentData])

  const uniqueFilterOptions = useMemo(() => {
    const vendors = new Set()
    const materials = new Set()
    const types = new Set()
    const quantities = new Set()
    const orders = new Set()

    allLiftsData.forEach((lift) => {
      if (lift.vendorName) vendors.add(lift.vendorName)
      if (lift.rawMaterialName) materials.add(lift.rawMaterialName)
      if (lift.type) types.add(lift.type)
      if (lift.qty) quantities.add(lift.qty)
      if (lift.totalBillQuantity_fromSheet) quantities.add(lift.totalBillQuantity_fromSheet)
      if (lift.actualQty_fromReceipt) quantities.add(lift.actualQty_fromReceipt)

      if (lift.indentNo) orders.add(lift.indentNo)
      if (lift.billNo) orders.add(lift.billNo)
    })

    return {
      vendorName: [...vendors].sort(),
      materialName: [...materials].sort(),
      liftType: [...types].sort(),
      totalQuantity: [...quantities].sort((a, b) => parseFloat(a) - parseFloat(b)),
      orderNumber: [...orders].sort(),
    }
  }, [allLiftsData])

  // Memoized lists for tabs
  const receiptsAwaitingLabTest = useMemo(() => {
    let filtered = allLiftsData.filter((lift) => {
      const aiValue = lift.aiCondition_val
      const ajValue = lift.ajTimestamp_val
      return (
        aiValue !== null &&
        aiValue !== undefined &&
        String(aiValue).trim() !== "" &&
        (ajValue === null || ajValue === undefined || String(ajValue).trim() === "")
      )
    })

    if (filters.vendorName !== "all") {
      filtered = filtered.filter(lift => lift.vendorName === filters.vendorName);
    }
    if (filters.materialName !== "all") {
      filtered = filtered.filter(lift => lift.rawMaterialName === filters.materialName);
    }
    if (filters.liftType !== "all") {
      filtered = filtered.filter(lift => lift.type === filters.liftType);
    }
    if (filters.totalQuantity !== "all") {
      filtered = filtered.filter(lift =>
        lift.qty === filters.totalQuantity ||
        lift.totalBillQuantity_fromSheet === filters.totalQuantity ||
        lift.actualQty_fromReceipt === filters.totalQuantity
      );
    }
    if (filters.orderNumber !== "all") {
      filtered = filtered.filter(lift => lift.indentNo === filters.orderNumber || lift.billNo === filters.orderNumber);
    }

    return filtered
  }, [allLiftsData, filters])

  const recordedLabTests = useMemo(() => {
    let filtered = allLiftsData.filter((lift) => lift.ajTimestamp_val && String(lift.ajTimestamp_val).trim() !== "")

    if (filters.vendorName !== "all") {
      filtered = filtered.filter(lift => lift.vendorName === filters.vendorName);
    }
    if (filters.materialName !== "all") {
      filtered = filtered.filter(lift => lift.rawMaterialName === filters.materialName);
    }
    if (filters.liftType !== "all") {
      filtered = filtered.filter(lift => lift.type === filters.liftType);
    }
    if (filters.totalQuantity !== "all") {
      filtered = filtered.filter(lift =>
        lift.qty === filters.totalQuantity ||
        lift.totalBillQuantity_fromSheet === filters.totalQuantity ||
        lift.actualQty_fromReceipt === filters.totalQuantity
      );
    }
    if (filters.orderNumber !== "all") {
      filtered = filtered.filter(lift => lift.indentNo === filters.orderNumber || lift.billNo === filters.orderNumber);
    }

    return filtered.sort((a, b) => {
      const parseDate = (dateStr) => {
        if (!dateStr) return 0
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return new Date(dateStr).getTime()
        const dtParts = dateStr.split(" ")
        if (dtParts.length > 0) {
          const dateParts = dtParts[0].split("/")
          if (dateParts.length === 3) {
            const [d, m, y] = dateParts.map(Number)
            if (d && m && y && y > 1900 && y < 2100) {
              const t = { hr: 0, min: 0, s: 0 }
              if (dtParts.length > 1) {
                const ts = dtParts[1].split(":")
                if (ts.length >= 2) {
                  t.hr = Number.parseInt(ts[0], 10)
                  t.min = Number.parseInt(ts[1], 10)
                  if (ts.length === 3) t.s = Number.parseInt(ts[2], 10)
                }
              }
              return new Date(y, m - 1, d, t.hr, t.min, t.s).getTime()
            }
          }
        }
        return new Date(dateStr).getTime()
      }
      const dateA = parseDate(a.ajTimestamp_formatted_val || a.ajTimestamp_val)
      const dateB = parseDate(b.ajTimestamp_formatted_val || b.ajTimestamp_val)
      return dateB - dateA
    })
  }, [allLiftsData, filters])

  // Form and Submission Logic
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }))
  }

  const handleSelectChange = (name) => (value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }))
  }

  const handleOpenLabTestModal = (receipt) => {
    console.log("Opening modal for receipt:", {
      liftNo: receipt?.liftNo,
      indentNo: receipt?.indentNo,
      vendorName: receipt?.vendorName
    });

    if (!receipt || !receipt.liftNo) {
      toast.error("Invalid Receipt", {
        description: "Cannot open lab test form for this receipt.",
        icon: <XCircle className="h-4 w-4" />,
      });
      return;
    }

    // Reset form first
    setFormErrors({});

    // Set form data
    let initialStatus = "";
    if (receipt.alStatus_val) {
      const valLower = receipt.alStatus_val.toLowerCase();
      if (valLower === "accepted" || valLower === "tested") initialStatus = "Accepted";
      else if (valLower === "rejected" || valLower === "not tested") initialStatus = "Rejected";
    }

    setFormData({
      liftIdToUpdate: receipt.liftNo,
      alStatus: initialStatus,
      amDateOfTest: receipt.amDateOfTest_val || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
      anMoisturePercent: receipt.anMoisturePercent_val || "",
      aoBdPercent: receipt.aoBdPercent_val || "",
      apApPercent: receipt.apApPercent_val || "",
      aqAluminaPercent: receipt.aqAluminaPercent_val || "",
      arIronPercent: receipt.arIronPercent_val || "",
      asSieveAnalysis: receipt.asSieveAnalysis_val || "",
      atLoiPercent: receipt.atLoiPercent_val || "",
      auSio2Percent: receipt.auSio2Percent_val || "",
      avCaoPercent: receipt.avCaoPercent_val || "",
      awMgoPercent: receipt.awMgoPercent_val || "",
      axTio2Percent: receipt.axTio2Percent_val || "",
      ayKna2oPercent: receipt.ayKna2oPercent_val || "",
      azFreeIronPercent: receipt.azFreeIronPercent_val || "",
      baReason: receipt.baReason_val || "",
    });

    // Set the receipt
    setSelectedReceiptForModal(receipt);

    // Open modal
    setIsModalOpen(true);
  };

  const validateForm = useCallback(() => {
    const newErrors = {}
    const reqFields = {
      alStatus: "Status",
      amDateOfTest: "Date Of Test",
      anMoisturePercent: "Moisture %",
      aoBdPercent: "BD %",
      apApPercent: "AP %",
      aqAluminaPercent: "Alumina %",
      arIronPercent: "Iron %",
      asSieveAnalysis: "Sieve Analysis",
      atLoiPercent: "LOI %",
      auSio2Percent: "SiO2 %",
      avCaoPercent: "CaO %",
      awMgoPercent: "MgO %",
      axTio2Percent: "TiO2 %",
      ayKna2oPercent: "K2O+Na2O %",
      azFreeIronPercent: "Free Iron %",
    }
    for (const fKey in reqFields) {
      if (formData[fKey] === null || formData[fKey] === undefined || String(formData[fKey]).trim() === "") {
        newErrors[fKey] = `${reqFields[fKey]} is required`
      }
    }
    setFormErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleSubmitLabTest = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Validation Error", { description: "Please fill all required fields." });
      return;
    }
    if (!selectedReceiptForModal) {
      toast.error("Error", { description: "No receipt selected. Please try again." });
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      // Prepare update data for Supabase LIFT-ACCOUNTS - using actual schema column names
      const updateData = {
        "Actual 2": timestamp,
        "Status": formData.alStatus,
        "Date Of Test": formData.amDateOfTest,
        "Moisture Percent Age %": parseFloat(formData.anMoisturePercent) || null,
        "BD Percent Age %": parseFloat(formData.aoBdPercent) || null,
        "AP Percent Age %": parseFloat(formData.apApPercent) || null,
        "Alumina Percent Age %": parseFloat(formData.aqAluminaPercent) || null,
        "Iron Percent Age %": parseFloat(formData.arIronPercent) || null,
        "Sieve Analysis": parseFloat(formData.asSieveAnalysis) || null,
        "LOI %": parseFloat(formData.atLoiPercent) || null,
        "SIO2 %": parseFloat(formData.auSio2Percent) || null,
        "CaO %": parseFloat(formData.avCaoPercent) || null,
        "MgO %": parseFloat(formData.awMgoPercent) || null,
        "TiO2 %": parseFloat(formData.axTio2Percent) || null,
        "K2O + Na2O %": parseFloat(formData.ayKna2oPercent) || null,
        "Free Iron %": parseFloat(formData.azFreeIronPercent) || null,
        "Reason": formData.baReason || null,
      };

      console.log("Updating LIFT-ACCOUNTS record:", selectedReceiptForModal._dbId, updateData);

      // Update the LIFT-ACCOUNTS record in Supabase
      const { error: updateError } = await supabase
        .from("LIFT-ACCOUNTS")
        .update(updateData)
        .eq("id", selectedReceiptForModal._dbId);

      if (updateError) {
        console.error("LIFT-ACCOUNTS update failed:", updateError);
        throw new Error(`Failed to update LIFT-ACCOUNTS: ${updateError.message}`);
      }

      // Calculate Lab Mismatch (TL table tolerance vs LIFT-ACCOUNTS lab values only)
      // Fetch TL tolerance values by product/raw material name
      const labAlumina = parseFloat(formData.aqAluminaPercent) || null;
      const labIron = parseFloat(formData.arIronPercent) || null;
      const labAp = parseFloat(formData.apApPercent) || null;
      const labBd = parseFloat(formData.aoBdPercent) || null;

      // TL range string values
      let tlAluminaRange = null;
      let tlIronRange = null;
      let tlApRange = null;
      let tlBdRange = null;

      if (selectedReceiptForModal.rawMaterialName) {
        const materialName = String(selectedReceiptForModal.rawMaterialName).trim();
        const { data: tlData, error: tlError } = await supabase
          .from("TL")
          .select('"TL Alumina", "TL Iron", "BD%", "AP%"')
          .ilike("NAME", materialName)
          .maybeSingle();

        if (!tlError && tlData) {
          tlAluminaRange = tlData["TL Alumina"];
          tlIronRange = tlData["TL Iron"];
          tlApRange = tlData["AP%"];
          tlBdRange = tlData["BD%"];
        }
      }

      // New directional comparison logic:
      // Alumina: TL_Alumina is MINIMUM → mismatch if labAlumina < TL_Alumina
      // Iron:    TL_Iron is MAXIMUM    → mismatch if labIron > TL_Iron
      // BD:      BD_Percent is MINIMUM → mismatch if labBd < BD_Percent
      // AP:      AP_Percent is MAXIMUM → mismatch if labAp > AP_Percent

      const tlAluminaMin = tlAluminaRange !== null ? parseFloat(tlAluminaRange) : null;
      const tlIronMax = tlIronRange !== null ? parseFloat(tlIronRange) : null;
      const tlBdMin = tlBdRange !== null ? parseFloat(tlBdRange) : null;
      const tlApMax = tlApRange !== null ? parseFloat(tlApRange) : null;

      // diffAlumina: negative means lab is below minimum (mismatch)
      const diffAlumina = (labAlumina !== null && tlAluminaMin !== null && !isNaN(tlAluminaMin))
        ? (labAlumina < tlAluminaMin ? Math.round((labAlumina - tlAluminaMin) * 1000) / 1000 : 0)
        : null;

      // diffIron: positive means lab exceeds maximum (mismatch)
      const diffIron = (labIron !== null && tlIronMax !== null && !isNaN(tlIronMax))
        ? (labIron > tlIronMax ? Math.round((labIron - tlIronMax) * 1000) / 1000 : 0)
        : null;

      // diffBd: negative means lab is below minimum (mismatch)
      const diffBd = (labBd !== null && tlBdMin !== null && !isNaN(tlBdMin))
        ? (labBd < tlBdMin ? Math.round((labBd - tlBdMin) * 1000) / 1000 : 0)
        : null;

      // diffAp: positive means lab exceeds maximum (mismatch)
      const diffAp = (labAp !== null && tlApMax !== null && !isNaN(tlApMax))
        ? (labAp > tlApMax ? Math.round((labAp - tlApMax) * 1000) / 1000 : 0)
        : null;

      const hasAluminaMismatch = diffAlumina !== null && diffAlumina !== 0;
      const hasIronMismatch = diffIron !== null && diffIron !== 0;
      const hasApMismatch = diffAp !== null && diffAp !== 0;
      const hasBdMismatch = diffBd !== null && diffBd !== 0;

      const isQualityMismatch = selectedReceiptForModal.physicalCondition === "Bad" && selectedReceiptForModal.moisture === "Yes";
      const isMismatch = hasAluminaMismatch || hasIronMismatch || hasApMismatch || hasBdMismatch || isQualityMismatch;

      // Only store a difference value if it EXCEEDS the TL table range for that material.
      // If within range → store null (so it won't appear in Material Mismatch tab).
      const mismatchUpdatePayload = {
        "Alumina Difference": hasAluminaMismatch ? Math.round(diffAlumina * 1000) / 1000 : null,
        "Iron Difference": hasIronMismatch ? Math.round(diffIron * 1000) / 1000 : null,
        "AP Difference": hasApMismatch ? Math.round(diffAp * 1000) / 1000 : null,
        "BD Difference": hasBdMismatch ? Math.round(diffBd * 1000) / 1000 : null,
        "Status": "Pending",
      };

      const { error: mismatchError } = await supabase
        .from("Mismatch")
        .update(mismatchUpdatePayload)
        .eq('Lift Number', selectedReceiptForModal.liftNo);

      if (mismatchError) {
        console.error("Failed to update Mismatch table:", mismatchError);
      }

      toast.success("Success!", {
        description: `Lab test for Lift ID ${selectedReceiptForModal.liftNo} recorded.`,
        icon: <CheckCircle className="h-4 w-4" />,
      });

      setRefreshTrigger(prev => prev + 1);
      handleModalClose();
    } catch (error) {
      toast.error("Operation Failed", {
        description: error.message,
        icon: <XCircle className="h-4 w-4" />,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setFormErrors({});
    setFormData(initialFormData);
    setSelectedReceiptForModal(null);
  };

  // Column Toggle Handlers
  const handleToggleColumn = (tab, dataKey, checked) => {
    if (tab === "eligible") {
      setVisibleEligibleTestColumns((prev) => ({ ...prev, [dataKey]: checked }))
    } else {
      setVisibleRecordedTestColumns((prev) => ({ ...prev, [dataKey]: checked }))
    }
  }

  const handleSelectAllColumns = (tab, columnsMeta, checked) => {
    const newVisibility = {}
    columnsMeta.forEach((col) => {
      if (col.toggleable && !col.alwaysVisible) newVisibility[col.dataKey] = checked
    })
    if (tab === "eligible") {
      setVisibleEligibleTestColumns((prev) => ({ ...prev, ...newVisibility }))
    } else {
      setVisibleRecordedTestColumns((prev) => ({ ...prev, ...newVisibility }))
    }
  }

  const getStatusBadgeVariant = (status) => {
    switch (status?.toLowerCase()) {
      case "tested":
      case "accepted":
        return "success"
      case "not tested":
        return "warning"
      case "rejected":
        return "destructive"
      case "passed":
        return "success"
      case "failed":
        return "destructive"
      case "conditional":
        return "warning"
      default:
        return "outline"
    }
  }

  const renderCell = (item, column) => {
    const value = item[column.dataKey];

    if (column.isBadge && column.dataKey === "alStatus_val") {
      return (
        <Badge variant={getStatusBadgeVariant(value)} className="capitalize px-2 py-0.5 text-xs whitespace-nowrap">
          {value || "N/A"}
        </Badge>
      );
    }

    // Special handling for PO Quantity
    if (column.dataKey === "poQuantity") {
      // Check if we have an indent number
      if (item.indentNo && item.indentNo.trim() !== "") {
        if (value && value.trim() !== "") {
          return <span className="font-medium text-blue-600">{value}</span>;
        } else {
          // Show loading state or "Not found" with tooltip
          return (
            <div className="relative group">
              <span className="text-xs text-gray-400 italic">Loading...</span>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                Indent: {item.indentNo}
              </div>
            </div>
          );
        }
      } else {
        return <span className="text-xs text-gray-400">N/A</span>;
      }
    }

    return value || (value === 0 ? "0" : <span className="text-xs text-gray-400">N/A</span>);
  };

  // Reusable Table Rendering Function
  const renderTableSection = (tabKey, title, description, data, columnsMeta, visibilityState) => {
    const visibleCols = columnsMeta.filter((col) => visibilityState[col.dataKey])
    const isLoading = loadingData && data.length === 0
    const hasError = errorData && data.length === 0 && activeTab === tabKey

    return (
      <Card className="shadow-sm border border-border flex-1 flex flex-col">
        <CardHeader className="py-3 px-4 bg-muted/30">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center text-md font-semibold text-foreground">
                {tabKey === "eligibleForTest" ? (
                  <FileCheckIcon className="h-5 w-5 text-primary mr-2" />
                ) : (
                  <History className="h-5 w-5 text-primary mr-2" />
                )}
                {title} ({data.length})
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-0.5">{description}</CardDescription>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <MixerHorizontalIcon className="mr-1.5 h-3.5 w-3.5" /> View Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-3">
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Toggle Columns</p>
                  <div className="flex items-center justify-between mt-1 mb-2">
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-xs"
                      onClick={() =>
                        handleSelectAllColumns(
                          tabKey === "eligibleForTest" ? "eligible" : "recorded",
                          columnsMeta,
                          true,
                        )
                      }
                    >
                      Select All
                    </Button>
                    <span className="text-gray-300 mx-1">|</span>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-xs"
                      onClick={() =>
                        handleSelectAllColumns(
                          tabKey === "eligibleForTest" ? "eligible" : "recorded",
                          columnsMeta,
                          false,
                        )
                      }
                    >
                      Deselect All
                    </Button>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {columnsMeta
                      .filter((col) => col.toggleable)
                      .map((col) => (
                        <div key={`toggle-${tabKey}-${col.dataKey}`} className="flex items-center space-x-2">
                          <Checkbox
                            id={`toggle-${tabKey}-${col.dataKey}`}
                            checked={!!visibilityState[col.dataKey]}
                            onCheckedChange={(checked) =>
                              handleToggleColumn(
                                tabKey === "eligibleForTest" ? "eligible" : "recorded",
                                col.dataKey,
                                Boolean(checked),
                              )
                            }
                            disabled={col.alwaysVisible}
                          />
                          <Label
                            htmlFor={`toggle-${tabKey}-${col.dataKey}`}
                            className="text-xs font-normal cursor-pointer"
                          >
                            {col.header}{" "}
                            {col.alwaysVisible && <span className="text-gray-400 ml-0.5 text-xs">(Fixed)</span>}
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
          {isLoading ? (
            <div className="flex flex-col justify-center items-center py-10 flex-1">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : hasError ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-destructive-foreground bg-destructive/10 rounded-lg mx-4 my-4 text-center flex-1">
              <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
              <p className="font-medium text-destructive">Error Loading Data</p>
              <p className="text-sm text-muted-foreground max-w-md">{errorData}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-blue-200/50 bg-blue-50/50 rounded-lg mx-4 my-4 text-center flex-1">
              <Info className="h-12 w-12 text-blue-500 mb-3" />
              <p className="font-medium text-foreground">No Data Found</p>
              <p className="text-sm text-muted-foreground text-center">
                {tabKey === "eligibleForTest"
                  ? "No materials are currently eligible for lab testing."
                  : "No lab tests have been recorded yet."}
                {user?.firmName && user.firmName.toLowerCase() !== "all" && (
                  <span className="block mt-1">(Filtered by firm: {user.firmName})</span>
                )}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-b-lg flex-1">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    {visibleCols.map((col) => (
                      <TableHead key={col.dataKey} className="whitespace-nowrap text-xs">
                        {col.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item._id} className="hover:bg-purple-50/50">
                      {visibleCols.map((column) => (
                        <TableCell
                          key={column.dataKey}
                          className={`whitespace-nowrap text-xs ${column.dataKey === "liftNo" ? "font-medium text-primary" : "text-gray-700"}`}
                        >
                          {column.dataKey === "actionColumn" && tabKey === "eligibleForTest" ? (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => handleOpenLabTestModal(item)}
                              className="h-7 px-2.5 py-1 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200"
                            >
                              Record Lab Test
                            </Button>
                          ) : (
                            renderCell(item, column)
                          )}
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
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
      <Card className="shadow-md border-none">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-gray-700">
            <Beaker className="h-6 w-6 text-purple-600" />
            Step 7: Lab Testing - Is The Quality Good?
          </CardTitle>
          <CardDescription className="text-gray-600">
            Record lab test results for received materials by updating LIFT-ACCOUNTS.
            {user?.firmName && user.firmName.toLowerCase() !== "all" && (
              <span className="ml-2 text-blue-600 font-medium">• Filtered by: {user.firmName}</span>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 lg:p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full sm:w-[480px] grid-cols-2 mb-6">
              <TabsTrigger value="eligibleForTest" className="flex items-center gap-2">
                <FileCheckIcon className="h-4 w-4" /> Eligible for Test
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  {receiptsAwaitingLabTest.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="recordedTests" className="flex items-center gap-2">
                <History className="h-4 w-4" /> Recorded Tests
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  {recordedLabTests.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Filter Section - START */}
            <div className="mb-6 p-4 bg-purple-50/50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-4 w-4 text-gray-500" />
                <Label className="text-sm font-medium text-gray-700">Filters</Label>
                <Button variant="outline" size="sm" onClick={clearAllFilters} className="ml-auto bg-white hover:bg-gray-50">
                  Clear All
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Vendor Name Filter */}
                <div>
                  <Label className="text-xs mb-1 block">Vendor Name</Label>
                  <SearchableSelect
                    value={filters.vendorName}
                    onValueChange={(value) => handleFilterChange("vendorName", value)}
                    options={uniqueFilterOptions.vendorName}
                    placeholder="Vendors"
                  />
                </div>

                {/* Material Name Filter */}
                <div>
                  <Label className="text-xs mb-1 block">Material Name</Label>
                  <SearchableSelect
                    value={filters.materialName}
                    onValueChange={(value) => handleFilterChange("materialName", value)}
                    options={uniqueFilterOptions.materialName}
                    placeholder="Materials"
                  />
                </div>

                {/* Lift Type Filter */}
                <div>
                  <Label className="text-xs mb-1 block">Lift Type</Label>
                  <SearchableSelect
                    value={filters.liftType}
                    onValueChange={(value) => handleFilterChange("liftType", value)}
                    options={uniqueFilterOptions.liftType}
                    placeholder="Types"
                  />
                </div>

                {/* Total Quantity Filter */}
                <div>
                  <Label className="text-xs mb-1 block">Total Quantity</Label>
                  <SearchableSelect
                    value={filters.totalQuantity}
                    onValueChange={(value) => handleFilterChange("totalQuantity", value)}
                    options={uniqueFilterOptions.totalQuantity}
                    placeholder="Quantities"
                  />
                </div>

                {/* Order Number Filter */}
                <div>
                  <Label className="text-xs mb-1 block">Order Number</Label>
                  <SearchableSelect
                    value={filters.orderNumber}
                    onValueChange={(value) => handleFilterChange("orderNumber", value)}
                    options={uniqueFilterOptions.orderNumber}
                    placeholder="Orders"
                  />
                </div>
              </div>
            </div>
            {/* Filter Section - END */}

            <TabsContent value="eligibleForTest" className="flex-1 flex flex-col mt-0">
              {renderTableSection(
                "eligibleForTest",
                "Material Receipts Eligible for Lab Testing",
                "Filtered by: Column AI (Date of Receiving) is NOT empty AND Column AJ (Lab Test Timestamp) IS empty.",
                receiptsAwaitingLabTest,
                ELIGIBLE_TESTS_COLUMNS_META,
                visibleEligibleTestColumns,
              )}
            </TabsContent>
            <TabsContent value="recordedTests" className="flex-1 flex flex-col mt-0">
              {renderTableSection(
                "recordedTests",
                "All Recorded Lab Tests",
                "Lifts with a Lab Test Timestamp in Column AJ, sorted by latest test.",
                recordedLabTests,
                RECORDED_TESTS_COLUMNS_META,
                visibleRecordedTestColumns,
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="text-lg md:text-xl text-foreground flex items-center gap-2">
              <Beaker className="h-6 w-6 text-purple-600" />
              Record Lab Test for Lift ID:{" "}
              <span className="font-bold text-primary ml-1">{selectedReceiptForModal?.liftNo}</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1 text-xs">
              PO: {selectedReceiptForModal?.indentNo || "N/A"} | Party: {selectedReceiptForModal?.vendorName || "N/A"} |
              Material: {selectedReceiptForModal?.rawMaterialName || "N/A"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitLabTest} className="space-y-6 py-2 px-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-4">
              <div>
                <Label className="text-foreground text-xs" htmlFor="alStatus">
                  AL: Status <span className="text-destructive">*</span>
                </Label>
                <Select name="alStatus" value={formData.alStatus || undefined} onValueChange={handleSelectChange("alStatus")}>
                  <SelectTrigger
                    className={`w-full h-9 mt-1 rounded-md text-xs ${!formData.alStatus ? "text-muted-foreground" : ""} ${formErrors.alStatus ? "border-destructive" : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"}`}
                  >
                    <SelectValue placeholder="Select Accepted / Rejected" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Accepted">Accepted</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.alStatus && <p className="mt-1 text-xs text-destructive">{formErrors.alStatus}</p>}
              </div>
              <div>
                <Label className="text-foreground text-xs" htmlFor="amDateOfTest">
                  Date Of Test <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  id="amDateOfTest"
                  name="amDateOfTest"
                  value={formData.amDateOfTest}
                  onChange={handleInputChange}
                  className={`h-9 mt-1 rounded-md text-xs ${formErrors.amDateOfTest ? "border-destructive" : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"}`}
                />
                {formErrors.amDateOfTest && <p className="mt-1 text-xs text-destructive">{formErrors.amDateOfTest}</p>}
              </div>

              {/* Moisture % Field */}
              <div>
                <Label className="text-foreground text-xs" htmlFor="anMoisturePercent">
                  Moisture % <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  id="anMoisturePercent"
                  name="anMoisturePercent"
                  value={formData.anMoisturePercent}
                  onChange={handleInputChange}
                  placeholder=""
                  className={`h-9 mt-1 rounded-md text-xs ${formErrors.anMoisturePercent ? "border-destructive" : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"}`}
                />
                {formErrors.anMoisturePercent && <p className="mt-1 text-xs text-destructive">{formErrors.anMoisturePercent}</p>}
              </div>

              {/* BD % Field */}
              <div>
                <Label className="text-foreground text-xs" htmlFor="aoBdPercent">
                  BD % <span className="text-destructive">*</span>
                  {selectedReceiptForModal?.indentNo && (
                    <span className="ml-1 text-xs text-green-600">
                      (Expected: {getExpectedValues(selectedReceiptForModal?.indentNo).expectedBd || "N/A"})
                    </span>
                  )}
                </Label>
                <Input
                  type="text"
                  id="aoBdPercent"
                  name="aoBdPercent"
                  value={formData.aoBdPercent}
                  onChange={handleInputChange}
                  placeholder=""
                  className={`h-9 mt-1 rounded-md text-xs ${formErrors.aoBdPercent ? "border-destructive" : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"}`}
                />
                {formErrors.aoBdPercent && <p className="mt-1 text-xs text-destructive">{formErrors.aoBdPercent}</p>}
              </div>

              {/* AP % Field */}
              <div>
                <Label className="text-foreground text-xs" htmlFor="apApPercent">
                  AP % <span className="text-destructive">*</span>
                  {selectedReceiptForModal?.indentNo && (
                    <span className="ml-1 text-xs text-green-600">
                      (Expected: {getExpectedValues(selectedReceiptForModal?.indentNo).expectedAp || "N/A"})
                    </span>
                  )}
                </Label>
                <Input
                  type="text"
                  id="apApPercent"
                  name="apApPercent"
                  value={formData.apApPercent}
                  onChange={handleInputChange}
                  placeholder=""
                  className={`h-9 mt-1 rounded-md text-xs ${formErrors.apApPercent ? "border-destructive" : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"}`}
                />
                {formErrors.apApPercent && <p className="mt-1 text-xs text-destructive">{formErrors.apApPercent}</p>}
              </div>

              {/* Alumina % Field with Expected Value */}
              <div>
                <Label className="text-foreground text-xs" htmlFor="aqAluminaPercent">
                  Alumina % <span className="text-destructive">*</span>
                  {selectedReceiptForModal?.indentNo && (
                    <span className="ml-1 text-xs text-green-600">
                      (Expected: {getExpectedValues(selectedReceiptForModal?.indentNo).expectedAlumina || "N/A"})
                    </span>
                  )}
                </Label>
                <Input
                  type="text"
                  id="aqAluminaPercent"
                  name="aqAluminaPercent"
                  value={formData.aqAluminaPercent}
                  onChange={handleInputChange}
                  placeholder=""
                  className={`h-9 mt-1 rounded-md text-xs ${formErrors.aqAluminaPercent ? "border-destructive" : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"}`}
                />
                {formErrors.aqAluminaPercent && <p className="mt-1 text-xs text-destructive">{formErrors.aqAluminaPercent}</p>}
              </div>

              {/* Iron % Field with Expected Value */}
              <div>
                <Label className="text-foreground text-xs" htmlFor="arIronPercent">
                  Iron % <span className="text-destructive">*</span>
                  {selectedReceiptForModal?.indentNo && (
                    <span className="ml-1 text-xs text-green-600">
                      (Expected: {getExpectedValues(selectedReceiptForModal?.indentNo).expectedIron || "N/A"})
                    </span>
                  )}
                </Label>
                <Input
                  type="text"
                  id="arIronPercent"
                  name="arIronPercent"
                  value={formData.arIronPercent}
                  onChange={handleInputChange}
                  placeholder=""
                  className={`h-9 mt-1 rounded-md text-xs ${formErrors.arIronPercent ? "border-destructive" : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"}`}
                />
                {formErrors.arIronPercent && <p className="mt-1 text-xs text-destructive">{formErrors.arIronPercent}</p>}
              </div>

              {/* Sieve Analysis Field */}
              <div>
                <Label className="text-foreground text-xs" htmlFor="asSieveAnalysis">
                  Sieve Analysis <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  id="asSieveAnalysis"
                  name="asSieveAnalysis"
                  value={formData.asSieveAnalysis}
                  onChange={handleInputChange}
                  placeholder=""
                  className={`h-9 mt-1 rounded-md text-xs ${formErrors.asSieveAnalysis ? "border-destructive" : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"}`}
                />
                {formErrors.asSieveAnalysis && <p className="mt-1 text-xs text-destructive">{formErrors.asSieveAnalysis}</p>}
              </div>

              {/* LOI % Field */}
              <div>
                <Label className="text-foreground text-xs" htmlFor="atLoiPercent">
                  LOI % <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  id="atLoiPercent"
                  name="atLoiPercent"
                  value={formData.atLoiPercent}
                  onChange={handleInputChange}
                  placeholder=""
                  className={`h-9 mt-1 rounded-md text-xs ${formErrors.atLoiPercent ? "border-destructive" : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"}`}
                />
                {formErrors.atLoiPercent && <p className="mt-1 text-xs text-destructive">{formErrors.atLoiPercent}</p>}
              </div>

              {/* SiO2 % Field */}
              <div>
                <Label className="text-foreground text-xs" htmlFor="auSio2Percent">
                  SiO2 % <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  id="auSio2Percent"
                  name="auSio2Percent"
                  value={formData.auSio2Percent}
                  onChange={handleInputChange}
                  placeholder=""
                  className={`h-9 mt-1 rounded-md text-xs ${formErrors.auSio2Percent ? "border-destructive" : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"}`}
                />
                {formErrors.auSio2Percent && <p className="mt-1 text-xs text-destructive">{formErrors.auSio2Percent}</p>}
              </div>

              {/* CaO % Field */}
              <div>
                <Label className="text-foreground text-xs" htmlFor="avCaoPercent">
                  CaO % <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  id="avCaoPercent"
                  name="avCaoPercent"
                  value={formData.avCaoPercent}
                  onChange={handleInputChange}
                  placeholder=""
                  className={`h-9 mt-1 rounded-md text-xs ${formErrors.avCaoPercent ? "border-destructive" : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"}`}
                />
                {formErrors.avCaoPercent && <p className="mt-1 text-xs text-destructive">{formErrors.avCaoPercent}</p>}
              </div>

              {/* MgO % Field */}
              <div>
                <Label className="text-foreground text-xs" htmlFor="awMgoPercent">
                  MgO % <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  id="awMgoPercent"
                  name="awMgoPercent"
                  value={formData.awMgoPercent}
                  onChange={handleInputChange}
                  placeholder=""
                  className={`h-9 mt-1 rounded-md text-xs ${formErrors.awMgoPercent ? "border-destructive" : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"}`}
                />
                {formErrors.awMgoPercent && <p className="mt-1 text-xs text-destructive">{formErrors.awMgoPercent}</p>}
              </div>

              {/* TiO2 % Field */}
              <div>
                <Label className="text-foreground text-xs" htmlFor="axTio2Percent">
                  TiO2 % <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  id="axTio2Percent"
                  name="axTio2Percent"
                  value={formData.axTio2Percent}
                  onChange={handleInputChange}
                  placeholder=""
                  className={`h-9 mt-1 rounded-md text-xs ${formErrors.axTio2Percent ? "border-destructive" : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"}`}
                />
                {formErrors.axTio2Percent && <p className="mt-1 text-xs text-destructive">{formErrors.axTio2Percent}</p>}
              </div>

              {/* K2O+Na2O % Field */}
              <div>
                <Label className="text-foreground text-xs" htmlFor="ayKna2oPercent">
                  K2O+Na2O % <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  id="ayKna2oPercent"
                  name="ayKna2oPercent"
                  value={formData.ayKna2oPercent}
                  onChange={handleInputChange}
                  placeholder=""
                  className={`h-9 mt-1 rounded-md text-xs ${formErrors.ayKna2oPercent ? "border-destructive" : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"}`}
                />
                {formErrors.ayKna2oPercent && <p className="mt-1 text-xs text-destructive">{formErrors.ayKna2oPercent}</p>}
              </div>

              {/* Free Iron % Field */}
              <div>
                <Label className="text-foreground text-xs" htmlFor="azFreeIronPercent">
                  Free Iron % <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  id="azFreeIronPercent"
                  name="azFreeIronPercent"
                  value={formData.azFreeIronPercent}
                  onChange={handleInputChange}
                  placeholder=""
                  className={`h-9 mt-1 rounded-md text-xs ${formErrors.azFreeIronPercent ? "border-destructive" : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"}`}
                />
                {formErrors.azFreeIronPercent && <p className="mt-1 text-xs text-destructive">{formErrors.azFreeIronPercent}</p>}
              </div>

              {/* Reason Field */}
              <div className="sm:col-span-2 md:col-span-3 lg:col-span-4">
                <Label className="text-foreground text-xs" htmlFor="baReason">
                  Reason
                </Label>
                <Input
                  type="text"
                  id="baReason"
                  name="baReason"
                  value={formData.baReason}
                  onChange={handleInputChange}
                  placeholder="Enter reason if any..."
                  className={`h-9 mt-1 rounded-md text-xs ${formErrors.baReason ? "border-destructive" : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"}`}
                />
                {formErrors.baReason && <p className="mt-1 text-xs text-destructive">{formErrors.baReason}</p>}
              </div>
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleModalClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !selectedReceiptForModal}
                className={`bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-md hover:opacity-90 transition-opacity flex items-center justify-center min-w-[100px] ${isSubmitting || !selectedReceiptForModal ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  "Record Lab Test"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}