"use client"

import { useState, useEffect, useCallback, useContext, useMemo } from "react"
import { Truck, FileText, Loader2, Upload, X, History, FileCheck, AlertTriangle, Filter } from "lucide-react"
import { MixerHorizontalIcon } from "@radix-ui/react-icons"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { AuthContext } from "../context/AuthContext"
import { toast } from "sonner";

function formatTimestamp(timestampStr) {
  if (!timestampStr || typeof timestampStr !== "string") {
    return "N/A"
  }
  const numbers = timestampStr.match(/\d+/g)
  if (!numbers || numbers.length < 6) {
    const d = new Date(timestampStr)
    if (!isNaN(d.getTime())) {
      return d
        .toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
        .replace(",", "")
    }
    return "Invalid Date"
  }
  const date = new Date(
    parseInt(numbers[0]), // Year
    parseInt(numbers[1]) - 1, // Month (0-based)
    parseInt(numbers[2]), // Day
    parseInt(numbers[3]), // Hours
    parseInt(numbers[4]), // Minutes
    parseInt(numbers[5]), // Seconds
  )
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

const SHEET_ID = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ"
const DRIVE_FOLDER_ID = "1gvF8u9ZI1Cd0Ajsm4dXHVFOcp2v1GLCQ"; // Your actual folder ID
const INDENT_PO_SHEET = "INDENT-PO"
const LIFT_ACCOUNTS_SHEET = "LIFT-ACCOUNTS"
const MASTER_SHEET_NAME = "Master"
const API_URL =
  "https://script.google.com/macros/s/AKfycbzj9zlZTEhdlmaMt78Qy3kpkz7aOfVKVBRuJkd3wv_UERNrIRCaepSULpNa7W1g-pw/exec"

const DATA_START_ROW = 7; // Corrected the start row

const PO_COLUMNS_META = [
  { header: "Actions", dataKey: "actionColumn", toggleable: false, alwaysVisible: true },
  { header: "Indent Number", dataKey: "indentNo", toggleable: true, alwaysVisible: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Party Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "Quantity", dataKey: "quantity", toggleable: true },
  { header: "Rate", dataKey: "rate", toggleable: true },
  { header: "Alumina %", dataKey: "alumina", toggleable: true },
  { header: "Iron %", dataKey: "iron", toggleable: true },
  { header: "Received Qty", dataKey: "receivedQty", toggleable: true },
  { header: "Pending PO Qty", dataKey: "pendingPOQty", toggleable: true },
  { header: "Planned", dataKey: "planned", toggleable: true },
  { header: "Notes", dataKey: "whatIsToBeDone", toggleable: true },
]
const LIFTS_COLUMNS_META = [
  { header: "Lift ID", dataKey: "id", toggleable: true, alwaysVisible: true },
  { header: "Indent Number", dataKey: "indentNo", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Party Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "material", toggleable: true },
  { header: "PO Qty", dataKey: "quantity", toggleable: true },
  { header: "Lifted Qty", dataKey: "liftingQty", toggleable: true },
  { header: "Rate", dataKey: "rate", toggleable: true },
  { header: "Type", dataKey: "liftType", toggleable: true },
  { header: "Bill No.", dataKey: "billNo", toggleable: true },
  { header: "Truck No.", dataKey: "truckNo", toggleable: true },
  { header: "Transporter Name", dataKey: "transporterName", toggleable: true },
  { header: "Bill Image", dataKey: "billImageUrl", toggleable: true, isLink: true, linkText: "View Bill" },
  { header: "Lifted On", dataKey: "createdAt", toggleable: true },
  { header: "Qty", dataKey: "additionalTruckQty", toggleable: true },
]

export default function LiftMaterial() {
  const { user } = useContext(AuthContext)
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [materialLifts, setMaterialLifts] = useState([])
  const [selectedPO, setSelectedPO] = useState(null)
  const [loadingPOs, setLoadingPOs] = useState(true)
  const [loadingLifts, setLoadingLifts] = useState(true)
  const [masterDataLoading, setMasterDataLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [error, setError] = useState(null)
  const [areaOptions, setAreaOptions] = useState([])
  const [transporterOptions, setTransporterOptions] = useState([])
  const [typeOptions, setTypeOptions] = useState([])
  const [rateTypeOptions, setRateTypeOptions] = useState([])
  const [formData, setFormData] = useState({
  billNo: "",
  Arealifting: "",
  liftingLeadTime: "",
  truckNo: "",
  driverNo: "",
  TransporterName: "",
  rateType: "",
  rate: "",
  truckQty: "",
  Type: "",
  biltyNo: "",
  indentNo: "",
  vendorName: "",
  material: "",
  totalQuantity: "",
  billImage: null,
  additionalTruckQty: "",
  transportRate: "",
  // ADD NEW FIELDS:
  hasBilty: "no", // 'yes' or 'no'
  biltyImage: null,
})

  const [formErrors, setFormErrors] = useState({})
  const [activeTab, setActiveTab] = useState("availablePOs")
  const [visiblePoColumns, setVisiblePoColumns] = useState({})
  const [visibleLiftsColumns, setVisibleLiftsColumns] = useState({})
  const [cancelPendingPO, setCancelPendingPO] = useState({
  show: false,
  poId: null,
  indentNo: "",
  cancelQuantity: "",
  loading: false,
})
  const [filters, setFilters] = useState({
    vendorName: "all",
    materialName: "all",
    liftType: "all",
    totalQuantity: "all",
    orderNumber: "all",
  })

  useEffect(() => {
    const initializeVisibility = (columnsMeta) => {
      const visibility = {}
      columnsMeta.forEach((col) => {
        visibility[col.dataKey] = col.alwaysVisible || col.toggleable
      })
      return visibility
    }
    setVisiblePoColumns(initializeVisibility(PO_COLUMNS_META))
    setVisibleLiftsColumns(initializeVisibility(LIFTS_COLUMNS_META))
  }, [])

  const fetchMasterData = useCallback(async () => {
    setMasterDataLoading(true)
    setError(null)
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        MASTER_SHEET_NAME,
      )}&cb=${new Date().getTime()}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch Master data: ${response.status} ${response.statusText}`)
      }
      let text = await response.text()
      if (text.startsWith("google.visualization.Query.setResponse(")) {
        text = text.substring(text.indexOf("(") + 1, text.lastIndexOf(")"))
      } else {
        const jsonStart = text.indexOf("{")
        const jsonEnd = text.lastIndexOf("}")
        if (jsonStart === -1 || jsonEnd === -1) {
          throw new Error("Invalid JSON response format from Google Sheets for Master data.")
        }
        text = text.substring(jsonStart, jsonEnd + 1)
      }

      const data = JSON.parse(text)

      if (data.status === "error") {
        throw new Error(data.errors?.[0]?.detailed_message || "Master Sheet API returned error status.")
      }

      if (!data.table || !data.table.rows || data.table.rows.length === 0) {
        throw new Error("Master Sheet data is empty or has no rows.")
      }

      const tempAreaOptions = new Set()
      const tempTransporterOptions = new Set()
      const tempTypeOptions = new Set()
      const tempRateTypeOptions = new Set()

      data.table.rows.forEach((row, rowIndex) => {
        if (!row || !row.c || rowIndex === 0) {
          return
        }

        const rateTypeCell = row.c[4]
        const areaLiftingCell = row.c[5]
        const typeCell = row.c[6]
        const transporterCell = row.c[7]

        const rateType = rateTypeCell?.v ? String(rateTypeCell.v).trim() : null
        const areaLifting = areaLiftingCell?.v ? String(areaLiftingCell.v).trim() : null
        const type = typeCell?.v ? String(typeCell?.v).trim() : null
        const transporterName = transporterCell?.v ? String(transporterCell.v).trim() : null

        if (rateType) tempRateTypeOptions.add(rateType)
        if (areaLifting) tempAreaOptions.add(areaLifting)
        if (type) tempTypeOptions.add(type)
        if (transporterName) tempTransporterOptions.add(transporterName)
      })

      setAreaOptions(Array.from(tempAreaOptions).sort().map((opt) => ({ value: opt, label: opt })))
      setTransporterOptions(Array.from(tempTransporterOptions).sort().map((opt) => ({ value: opt, label: opt })))
      setTypeOptions(Array.from(tempTypeOptions).sort().map((opt) => ({ value: opt, label: opt })))
      setRateTypeOptions(Array.from(tempRateTypeOptions).sort().map((opt) => ({ value: opt, label: opt })))

    } catch (error) {
      setError(`Failed to load Master data: ${error.message}`)
      setAreaOptions([])
      setTypeOptions([])
      setTransporterOptions([])
      setRateTypeOptions([])
    } finally {
      setMasterDataLoading(false)
    }
  }, [SHEET_ID, MASTER_SHEET_NAME])

  const fetchPurchaseOrders = useCallback(async () => {
    setLoadingPOs(true)
    setError(null)
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        INDENT_PO_SHEET,
      )}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch PO data: ${response.status}`)
      }
      const text = await response.text()
      const jsonStart = text.indexOf("{")
      const jsonEnd = text.lastIndexOf("}")
      const jsonString = text.substring(jsonStart, jsonEnd + 1)
      const data = JSON.parse(jsonString)

      let processedRows = []
      if (data.table && data.table.cols && data.table.rows) {
        processedRows = (data.table.rows || [])
          .slice(1)
          .filter(
            (row) =>
              row.c &&
              row.c.some((cell) => cell && cell.v !== null && cell.v !== undefined && String(cell.v).trim() !== ""),
          )
          .map((row, gvizRowIndex) => {
            const rowData = {}
            rowData._id = Math.random().toString(36).substring(2, 15) + gvizRowIndex
            rowData._rowIndex = gvizRowIndex + 8
            if (row.c) {
              row.c.forEach((cell, cellIndex) => {
                const colId = `col${cellIndex}`
                const value = cell && cell.v !== undefined && cell.v !== null ? cell.v : ""
                rowData[colId] = value
                if (cell && cell.f) rowData[`${colId}_formatted`] = cell.f
              })
            }
            return rowData
          })
      } else if (data.status === "error") {
        throw new Error(data.errors?.[0]?.detailed_message || "PO Sheet data is malformed or empty.")
      }

      const filteredRows = processedRows.filter(
        (row) =>
          row.col39 !== null && // Column AN (Planned) is filled
          String(row.col39).trim() !== "" &&
          (row.col40 === null || String(row.col40).trim() === ""), // Column AO (Lifted On Timestamp) is empty
      )

      // In fetchPurchaseOrders function, update the formattedData mapping:
let formattedData = filteredRows.map((row) => ({
  id: `PO-${row._rowIndex}`,
  indentNo: String(row.col1 || "").trim(),
  firmName: String(row.col2 || "").trim(),
  vendorName: String(row.col4 || "").trim(),
  rawMaterialName: String(row.col5 || "").trim(),
  quantity: String(row.col23 || "").trim(),
  _rowIndex: row._rowIndex,
  rate: String(row.col24 || "").trim(),
  alumina: String(row.col30 || "").trim(),
  iron: String(row.col31 || "").trim(),
  pendingQty: String(row.col33 || "").trim(),
  planned: String(row.col39_formatted || "").trim(),
  whatIsToBeDone: String(row.col10 || "").trim(),
  // ADD THESE NEW FIELDS:
  pendingLiftQty: String(row.col33 || "").trim(), // Column AH
  receivedQty: String(row.col32 || "").trim(),    // Column AJ
  pendingPOQty: String(row.col33 || "").trim(),   // Column AK
  // orderCancelQty: String(row.col35 || "").trim(), // Column AI (Order Cancel Qty)
}))


      if (user?.firmName && user.firmName.toLowerCase() !== "all") {
        const userFirmNameLower = user.firmName.toLowerCase()
        formattedData = formattedData.filter(
          (po) => po.firmName && String(po.firmName).toLowerCase() === userFirmNameLower,
        )
      }

      setPurchaseOrders(formattedData)
    } catch (error) {
      setError(`Failed to load PO data: ${error.message}`)
      setPurchaseOrders([])
    } finally {
      setLoadingPOs(false)
    }
  }, [SHEET_ID, INDENT_PO_SHEET, user])

  const fetchMaterialLifts = useCallback(async () => {
    setLoadingLifts(true)
    setError(null)
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        LIFT_ACCOUNTS_SHEET,
      )}&cb=${new Date().getTime()}`
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch lifts data: ${response.status}`)
      let text = await response.text()

      if (text.startsWith("google.visualization.Query.setResponse(")) {
        text = text.substring(text.indexOf("(") + 1, text.lastIndexOf(")"))
      } else {
        const jsonStart = text.indexOf("{")
        const jsonEnd = text.lastIndexOf("}")
        if (jsonStart === -1 || jsonEnd === -1) throw new Error("Invalid response format for lifts from Google Sheets.")
        text = text.substring(jsonStart, jsonEnd + 1)
      }

      const data = JSON.parse(text)

      if (!data.table || !data.table.cols) {
        setMaterialLifts([])
        setLoadingLifts(false)
        return
      }

      if (!data.table.rows) data.table.rows = []

      const processedRows = data.table.rows
        .map((row, indexWithinSlicedData) => {
          if (!row || !row.c) return null
          const rowData = { _gvizRowIndex: indexWithinSlicedData }
          row.c.forEach((cell, cellIndex) => {
            const colId = `col${cellIndex}`
            const value = cell && cell.v !== undefined && cell.v !== null ? cell.v : ""
            rowData[colId] = value
            if (cell && cell.f) rowData[`${colId}_formatted`] = cell.f
          })
          if (rowData.col0 && typeof rowData.col0 === "string" && rowData.col0.startsWith("Date(")) {
            rowData.col0_formatted = formatTimestamp(rowData.col0)
          } else if (rowData.col0) {
            try {
              const d = new Date(rowData.col0)
              if (!isNaN(d.getTime())) {
                rowData.col0_formatted = d
                  .toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  })
                  .replace(",", "")
              }
            } catch (e) {
              /* ignore */
            }
          }
          return rowData
        })
        .filter((row) => row !== null)

      const dataRows = processedRows.filter((row) => {
        if (!row.col1 || typeof row.col1 === "undefined" || String(row.col1).trim() === "") return false
        const liftIdValue = String(row.col1).trim().toLowerCase()
        if (liftIdValue.includes("lift id") || liftIdValue.includes("lift no") || !liftIdValue.startsWith("lf-")) {
          return false
        }
        if (!row.col0 || String(row.col0).trim() === "") return false
        const firstCellDisplayValue =
          typeof row.col0_formatted === "string" && row.col0_formatted.trim() !== ""
            ? row.col0_formatted
            : String(row.col0)
        const cellValueForHeuristic = firstCellDisplayValue.toLowerCase()
        if (
          cellValueForHeuristic.includes("timestamp") ||
          cellValueForHeuristic.includes("date") ||
          cellValueForHeuristic.includes("time")
        )
          return false
        return true
      })

      let formattedData = dataRows.map((row) => ({
        id: String(row.col1 || "").trim(),
        indentNo: String(row.col2 || "").trim(),
        vendorName: String(row.col3 || "").trim(),
        quantity: String(row.col4 || "").trim(),
        material: String(row.col5 || "").trim(),
        billNo: String(row.col6 || "").trim(),
        areaName: String(row.col7 || "").trim(),
        liftingLeadTime: String(row.col8 || "").trim(),
        liftingQty: String(row.col9 || "").trim(),
        liftType: String(row.col10 || "").trim(),
        transporterName: String(row.col11 || "").trim(),
        truckNo: String(row.col12 || "").trim(),
        driverNo: String(row.col13 || "").trim(),
        biltyNo: String(row.col14 || "").trim(),
        rateType: String(row.col15 || "").trim(),
        rate: String(row.col16 || "").trim(),
        billImageUrl: String(row.col17 || "").trim(),
        additionalTruckQty: String(row.col18 || "").trim(),
        createdAt:
          typeof row.col0_formatted === "string" && row.col0_formatted.trim() !== ""
            ? row.col0_formatted.trim()
            : String(row.col0 || "").trim(),
        firmName: String(row.col55 || "").trim(),
        transportRate: String(row.col58 || "").trim(), // Transport Rate from column BG
      }))

      if (user?.firmName && user.firmName.toLowerCase() !== "all") {
        const userFirmNameLower = user.firmName.toLowerCase()
        formattedData = formattedData.filter(
          (lift) => lift.firmName && String(lift.firmName).toLowerCase() === userFirmNameLower,
        )
      }
      
      const parseCustomDateStringForSort = (dateString) => {
        if (!dateString || typeof dateString !== "string") return null
        const parts = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2}):(\d{2})$/)
        if (!parts) return null
        return new Date(
          parseInt(parts[3], 10),
          parseInt(parts[2], 10) - 1,
          parseInt(parts[1], 10),
          parseInt(parts[4], 10),
          parseInt(parts[5], 10),
          parseInt(parts[6], 10),
        ).getTime()
      }

      formattedData.sort((a, b) => {
        const dateA = parseCustomDateStringForSort(a.createdAt)
        const dateB = parseCustomDateStringForSort(b.createdAt)
        if (dateA === null && dateB === null) return 0
        if (dateA === null) return 1
        if (dateB === null) return -1
        return dateB - dateA
      })

      setMaterialLifts(formattedData)
    } catch (err) {
      setError((prev) =>
        prev ? `${prev}\nFailed to load lifts data: ${err.message}` : `Failed to load lifts data: ${err.message}`,
      )
      setMaterialLifts([])
    } finally {
      setLoadingLifts(false)
    }
  }, [SHEET_ID, LIFT_ACCOUNTS_SHEET, user])

  useEffect(() => {
    fetchPurchaseOrders()
    fetchMaterialLifts()
    fetchMasterData()
  }, [fetchPurchaseOrders, fetchMaterialLifts, fetchMasterData])

  const handleCancelPendingPO = (po) => {
  setCancelPendingPO({
    show: true,
    poId: po.id,
    indentNo: po.indentNo,
    cancelQuantity: "",
    loading: false,
  })
}

const handleCloseCancelPopup = () => {
  setCancelPendingPO({
    show: false,
    poId: null,
    indentNo: "",
    cancelQuantity: "",
    loading: false,
  })
}

const handleCancelQuantityChange = (e) => {
  const value = e.target.value
  setCancelPendingPO(prev => ({
    ...prev,
    cancelQuantity: value
  }))
}

const submitCancelPendingPO = async () => {
  if (!cancelPendingPO.cancelQuantity || isNaN(parseFloat(cancelPendingPO.cancelQuantity))) {
    toast.error("Please enter a valid quantity");
    return;
  }

  setCancelPendingPO(prev => ({ ...prev, loading: true }));

  try {
    const poToUpdate = purchaseOrders.find(po => po.id === cancelPendingPO.poId);
    
    if (!poToUpdate) {
      throw new Error("PO not found");
    }

    const currentCancelQty = parseFloat(poToUpdate.orderCancelQty) || 0;
    const newCancelQty = currentCancelQty + parseFloat(cancelPendingPO.cancelQuantity);
    
    // Subtract 1 to fix row offset
    const correctedRow = poToUpdate._rowIndex - 1;
    
    console.log("Submitting cancel quantity:", {
      indentNo: cancelPendingPO.indentNo,
      currentQty: currentCancelQty,
      cancelQty: cancelPendingPO.cancelQuantity,
      newQty: newCancelQty,
      originalRow: poToUpdate._rowIndex,
      correctedRow: correctedRow,
      column: 35
    });

    // Use this format - it should work with the updated doPost function
    const updateParams = new URLSearchParams({
      action: "update",
      sheetName: "INDENT-PO", 
      rowIndex: correctedRow.toString(), // Use rowIndex parameter
      column: "35", // Column AI
      value: newCancelQty.toString()
    });

    console.log("Sending params:", updateParams.toString());

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: updateParams.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("Server response:", result);
    
    if (!result.success) {
      throw new Error(result.message || "Failed to update cancel quantity");
    }

    toast.success(`✅ Cancel quantity ${cancelPendingPO.cancelQuantity} submitted successfully to ${cancelPendingPO.indentNo}!`);
    
    // Refresh data
    await fetchPurchaseOrders();
    handleCloseCancelPopup();

  } catch (error) {
    console.error("Error submitting cancel quantity:", error);
    toast.error(`❌ Failed to submit cancel quantity: ${error.message}`);
  } finally {
    setCancelPendingPO(prev => ({ ...prev, loading: false }));
  }
};



  const uniqueFilterOptions = useMemo(() => {
    const vendors = new Set()
    const materials = new Set()
    const types = new Set()
    const quantities = new Set()
    const orders = new Set()

    purchaseOrders.forEach((po) => {
      if (po.vendorName) vendors.add(po.vendorName)
      if (po.rawMaterialName) materials.add(po.rawMaterialName)
      if (po.quantity) quantities.add(po.quantity)
      if (po.indentNo) orders.add(po.indentNo)
    })

    materialLifts.forEach((lift) => {
      if (lift.vendorName) vendors.add(lift.vendorName)
      if (lift.material) materials.add(lift.material)
      if (lift.liftType) types.add(lift.liftType)
      if (lift.liftingQty) quantities.add(lift.liftingQty)
      if (lift.additionalTruckQty) quantities.add(lift.additionalTruckQty)
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
  }, [purchaseOrders, materialLifts])

  const filteredPurchaseOrders = useMemo(() => {
    let filtered = purchaseOrders
    if (filters.vendorName !== "all") {
      filtered = filtered.filter((po) => po.vendorName === filters.vendorName)
    }
    if (filters.materialName !== "all") {
      filtered = filtered.filter((po) => po.rawMaterialName === filters.materialName)
    }
    if (filters.totalQuantity !== "all") {
      filtered = filtered.filter((po) => po.quantity === filters.totalQuantity)
    }
    if (filters.orderNumber !== "all") {
      filtered = filtered.filter((po) => po.indentNo === filters.orderNumber)
    }
    return filtered
  }, [purchaseOrders, filters])

  const filteredMaterialLifts = useMemo(() => {
    let filtered = materialLifts
    if (filters.vendorName !== "all") {
      filtered = filtered.filter((lift) => lift.vendorName === filters.vendorName)
    }
    if (filters.materialName !== "all") {
      filtered = filtered.filter((lift) => lift.material === filters.materialName)
    }
    if (filters.liftType !== "all") {
      filtered = filtered.filter((lift) => lift.liftType === filters.liftType)
    }
    if (filters.totalQuantity !== "all") {
      filtered = filtered.filter(
        (lift) => lift.liftingQty === filters.totalQuantity || lift.additionalTruckQty === filters.totalQuantity,
      )
    }
    if (filters.orderNumber !== "all") {
      filtered = filtered.filter((lift) => lift.indentNo === filters.orderNumber || lift.billNo === filters.orderNumber)
    }
    return filtered
  }, [materialLifts, filters])

 const handlePOSelect = (po) => {
  setSelectedPO(po)
  setFormData({
    billNo: "",
    Arealifting: "",
    liftingLeadTime: "",
    truckNo: "",
    driverNo: "",
    TransporterName: "",
    rateType: "",
    rate: "",
    truckQty: "",
    Type: "",
    biltyNo: "",
    indentNo: po.indentNo,
    vendorName: po.vendorName,
    material: po.rawMaterialName,
    totalQuantity: po.quantity,
    billImage: null,
    additionalTruckQty: "",
    transportRate: "",
    hasBilty: "no",
    biltyImage: null,
  })
  setFormErrors({})
  setShowPopup(true)
}


  const handleClosePopup = () => {
  setShowPopup(false)
  setSelectedPO(null)
  setFormData({
    billNo: "",
    Arealifting: "",
    liftingLeadTime: "",
    truckNo: "",
    driverNo: "",
    TransporterName: "",
    rateType: "",
    rate: "",
    truckQty: "",
    Type: "",
    biltyNo: "",
    indentNo: "",
    vendorName: "",
    material: "",
    totalQuantity: "",
    billImage: null,
    additionalTruckQty: "",
    transportRate: "",
    hasBilty: "no", // Reset this
    biltyImage: null, // Reset this
  })
  setFormErrors({})
}


  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null })
  }

  const handleFormSelectChange = (name, value) => {
    setFormData({ ...formData, [name]: value })
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null })
  }

  const handleFileUpload = (e) => {
    const { name, files } = e.target
    setFormData({ ...formData, [name]: files && files[0] ? files[0] : null })
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null })
  }

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = [
      "billNo",
      "Arealifting",
      "Type",
      "liftingLeadTime",
      "truckNo",
      "driverNo",
      "TransporterName",
      "rateType",
      "rate",
      "truckQty",
      // "transportRate", // Removed as not required for validation
    ];

    requiredFields.forEach((field) => {
      let readableField = field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
      if (field === "Arealifting") readableField = "Area Lifting";
      if (field === "TransporterName") readableField = "Transporter Name";
      
      if (!formData[field] || String(formData[field]).trim() === "") {
        newErrors[field] = `${readableField} is required.`;
      }
    });

    if (formData.rate && isNaN(parseFloat(formData.rate))) newErrors.rate = "Rate must be a valid number.";
    if (formData.transportRate && isNaN(parseFloat(formData.transportRate))) newErrors.transportRate = "Transport Rate must be a valid number.";
    if (formData.truckQty && isNaN(parseFloat(formData.truckQty)))
      newErrors.truckQty = "Truck Qty must be a valid number.";
    if (
      formData.liftingLeadTime &&
      (isNaN(parseInt(formData.liftingLeadTime)) || parseInt(formData.liftingLeadTime) < 0)
    )
      newErrors.liftingLeadTime = "Lead Time must be a non-negative number.";
    if (formData.additionalTruckQty && isNaN(parseFloat(formData.additionalTruckQty))) {
      newErrors.additionalTruckQty = "Truck Quantity must be a valid number.";
    }

    // NO RATE VALIDATION DURING FORM SUBMISSION
    // Material Rate validation will be done after submission for display purposes only

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadFileToDrive = async (file, folderId) => {
    if (!folderId) {
      throw new Error("Configuration error: Drive Folder ID not specified.");
    }
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = (error) => reject(error);
      });

      const payload = new URLSearchParams();
      payload.append("action", "uploadFile");
      payload.append("fileName", file.name);
      payload.append("mimeType", file.type);
      payload.append("base64Data", base64Data);
      payload.append("folderId", folderId);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Drive upload failed: ${response.status}. ${errorText}`);
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to upload file via Apps Script");
      }
      return result.fileUrl;
    } catch (error) {
      console.error("Error uploading file to Google Drive:", error);
      throw error;
    }
  };

  const generateLiftId = async () => {
    try {
      const params = new URLSearchParams({ action: "getNextLiftId" })
      const response = await fetch(`${API_URL}?${params.toString()}`)

      if (!response.ok) {
        throw new Error(`Failed to get next Lift ID from server: ${response.status}`)
      }

      const result = await response.json()
      if (result.success && result.nextId) {
        return result.nextId
      } else {
        throw new Error(result.message || "Server did not return a valid next ID.")
      }
    } catch (error) {
      console.error("[generateLiftId] Error during server-side ID generation:", error)
      console.warn("[generateLiftId] Falling back to local materialLifts state for Lift ID generation.")

      let maxIdNum = 0
      if (Array.isArray(materialLifts)) {
        materialLifts.forEach((lift) => {
          if (lift && typeof lift.id === "string" && lift.id.startsWith("LF-")) {
            const numPart = parseInt(lift.id.substring(3), 10)
            if (!isNaN(numPart) && numPart > maxIdNum) maxIdNum = numPart
          }
        })
      }
      const fallbackLiftId = `LF-${String(maxIdNum + 1).padStart(3, "0")}`
      return fallbackLiftId
    }
  }

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    toast.error("Validation failed. Please check the required fields.");
    return;
  }

  // Validate bilty fields if hasBilty is yes
  if (formData.hasBilty === "yes" && !formData.biltyNo.trim()) {
    setFormErrors(prev => ({ ...prev, biltyNo: "Bilty number is required when has bilty is yes" }));
    toast.error("Please enter bilty number");
    return;
  }

  setIsSubmitting(true);

  try {
    const liftId = await generateLiftId();
    const now = new Date();
    const timestamp = now.toLocaleString("en-GB", { hour12: false }).replace(",", "");

    // Upload bill image (if provided)
    const billImageUrl = formData.billImage 
      ? await uploadFileToDrive(formData.billImage, DRIVE_FOLDER_ID) 
      : "";

    // Upload bilty image (if provided and hasBilty is yes)
    let biltyImageUrl = "";
    if (formData.hasBilty === "yes" && formData.biltyImage) {
      biltyImageUrl = await uploadFileToDrive(formData.biltyImage, DRIVE_FOLDER_ID);
    }

    // Prepare the data for the new row in LIFT-ACCOUNTS
    const liftLabRowData = Array(59).fill("");
    liftLabRowData[0] = timestamp;
    liftLabRowData[1] = liftId;
    liftLabRowData[2] = formData.indentNo;
    liftLabRowData[3] = formData.vendorName;
    liftLabRowData[4] = formData.totalQuantity;
    liftLabRowData[5] = formData.material;
    liftLabRowData[6] = formData.billNo;
    liftLabRowData[7] = formData.Arealifting;
    liftLabRowData[8] = formData.liftingLeadTime;
    liftLabRowData[9] = formData.truckQty;
    liftLabRowData[10] = formData.Type;
    liftLabRowData[11] = formData.TransporterName;
    liftLabRowData[12] = formData.truckNo;
    liftLabRowData[13] = formData.driverNo;
    // Set bilty number only if hasBilty is yes
    liftLabRowData[14] = formData.hasBilty === "yes" ? (formData.biltyNo || "") : "";
    liftLabRowData[15] = formData.rateType;
    liftLabRowData[16] = formData.rate;
    liftLabRowData[17] = billImageUrl;
    liftLabRowData[18] = formData.additionalTruckQty || "";
    liftLabRowData[55] = selectedPO?.firmName || "";
    liftLabRowData[58] = formData.transportRate || "";
    // Store bilty image URL in a custom column
    liftLabRowData[56] = biltyImageUrl; // Column BG for bilty image

    // First, insert the lift record
   const liftLabParams = new URLSearchParams({
  action: "insert",
  sheetName: "LIFT-ACCOUNTS",
  rowData: JSON.stringify(liftLabRowData),
});

console.log("Submitting lift data:", liftLabRowData); // Add this for debugging

const liftLabResponse = await fetch(API_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: liftLabParams.toString(),
});

if (!liftLabResponse.ok) {
  const errorText = await liftLabResponse.text();
  console.error("Lift insertion failed:", errorText);
  throw new Error(`Failed to insert into LIFT-ACCOUNTS: ${errorText}`);
}

const liftResult = await liftLabResponse.json();
console.log("Lift insertion result:", liftResult);

if (!liftResult.success) {
  throw new Error(liftResult.message || "Failed to insert lift record");
}
    // Update the original PO row to mark it as lifted (column AO - index 40)
    const updatePOParams = new URLSearchParams({
      action: "updateCell",
      sheetName: "INDENT-PO", 
      row: selectedPO._rowIndex.toString(),
      column: "40", // Column AO
      value: timestamp
    });

    const updatePOResponse = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: updatePOParams.toString(),
    });

    if (!updatePOResponse.ok) {
      const errorText = await updatePOResponse.text();
      throw new Error(`Failed to update PO status: ${errorText}`);
    }

    toast.success(`Lift ${liftId} recorded successfully!`);
    
    // Refresh both tables to reflect the changes
    await Promise.all([fetchPurchaseOrders(), fetchMaterialLifts()]);
    handleClosePopup();

  } catch (error) {
    console.error("Error submitting lift form:", error);
    toast.error(`Submission failed: ${error.message}`);
  } finally {
    setIsSubmitting(false);
  }
};



  const liftExistsForPO = (indentNo) => {
    if (!indentNo) return false
    return materialLifts.some((lift) => lift.indentNo === indentNo)
  }

  const handleToggleColumn = (tab, dataKey, checked) => {
    if (tab === "pos") {
      setVisiblePoColumns((prev) => ({ ...prev, [dataKey]: checked }))
    } else {
      setVisibleLiftsColumns((prev) => ({ ...prev, [dataKey]: checked }))
    }
  }

  const handleSelectAllColumns = (tab, columnsMeta, selectAll) => {
    if (tab === "pos") {
      const newVisibility = {}
      columnsMeta.forEach((col) => {
        newVisibility[col.dataKey] = col.alwaysVisible || selectAll
      })
      setVisiblePoColumns(newVisibility)
    } else {
      const newVisibility = {}
      columnsMeta.forEach((col) => {
        newVisibility[col.dataKey] = col.alwaysVisible || selectAll
      })
      setVisibleLiftsColumns(newVisibility)
    }
  }

  const renderCell = (item, column) => {
    const value = item[column.dataKey]
    if (column.isLink) {
      return value ? (
        <a
          href={String(value).startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 hover:text-purple-800 hover:underline font-medium text-xs"
        >
          {column.linkText || "View"}
        </a>
      ) : (
        <span className="text-gray-400 text-xs">N/A</span>
      )
    }
    return value || (value === 0 ? "0" : <span className="text-xs text-gray-400">N/A</span>)
  }

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

  return (
    <div className="space-y-4 p-4 md:p-6 bg-slate-50 min-h-screen">
      <Card className="shadow-md border-none">
        <CardHeader className="p-4 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2 text-gray-700 text-lg">
            <Truck className="h-5 w-5 text-purple-600" /> Step 5: Lift The Material 
          </CardTitle>
          <CardDescription className="text-gray-500 text-sm">
            Record material lifting details for purchase orders.
            {user?.firmName && user.firmName.toLowerCase() !== "all" && (
              <span className="ml-2 text-purple-600 font-medium">• Filtered by: {user.firmName}</span>
            )}
          </CardDescription>
          {masterDataLoading && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading dropdown options from Master sheet...
            </div>
          )}
          {!masterDataLoading && (areaOptions.length > 0 || typeOptions.length > 0) && (
            <div className="text-sm text-green-600">
              ✅ Dropdown options loaded: {areaOptions.length} areas, {typeOptions.length} types,{" "}
              {transporterOptions.length} transporters, {rateTypeOptions.length} rate types
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full sm:w-[450px] grid-cols-2 mb-4">
              <TabsTrigger value="availablePOs" className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" /> Available POs
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  {filteredPurchaseOrders.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="liftsHistory" className="flex items-center gap-2">
                <History className="h-4 w-4" /> Lifts History
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  {filteredMaterialLifts.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <div className="mb-4 p-4 bg-purple-50/50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-gray-500" />
                <Label className="text-sm font-medium">Filters</Label>
                <Button variant="outline" size="sm" onClick={clearAllFilters} className="ml-auto bg-white">
                  Clear All
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Select value={filters.vendorName} onValueChange={(value) => handleFilterChange("vendorName", value)}>
                  <SelectTrigger className="h-8 bg-white">
                    <SelectValue placeholder="All Vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {uniqueFilterOptions.vendorName.map((vendor) => (
                      <SelectItem key={vendor} value={vendor}>
                        {vendor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.materialName}
                  onValueChange={(value) => handleFilterChange("materialName", value)}
                >
                  <SelectTrigger className="h-8 bg-white">
                    <SelectValue placeholder="All Materials" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Materials</SelectItem>
                    {uniqueFilterOptions.materialName.map((material) => (
                      <SelectItem key={material} value={material}>
                        {material}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.liftType} onValueChange={(value) => handleFilterChange("liftType", value)}>
                  <SelectTrigger className="h-8 bg-white">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {typeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.totalQuantity}
                  onValueChange={(value) => handleFilterChange("totalQuantity", value)}
                >
                  <SelectTrigger className="h-8 bg-white">
                    <SelectValue placeholder="All Quantities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Quantities</SelectItem>
                    {uniqueFilterOptions.totalQuantity.map((qty) => (
                      <SelectItem key={qty} value={qty}>
                        {qty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.orderNumber} onValueChange={(value) => handleFilterChange("orderNumber", value)}>
                  <SelectTrigger className="h-8 bg-white">
                    <SelectValue placeholder="All Orders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    {uniqueFilterOptions.orderNumber.map((order) => (
                      <SelectItem key={order} value={order}>
                        {order}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="availablePOs" className="flex-1 flex flex-col mt-0">
              <Card className="shadow-sm border border-border flex-1 flex-col">
                <CardHeader className="py-3 px-4 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center text-sm font-semibold text-foreground">
                        <FileCheck className="h-4 w-4 text-purple-600 mr-2" /> Available Purchase Orders (
                        {filteredPurchaseOrders.length})
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">
                        Filtered: Column AN (Planned) is filled & Column AO (Lifted On Timestamp) is empty.
                      </CardDescription>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs bg-transparent">
                          <MixerHorizontalIcon className="mr-1.5 h-3.5 w-3.5" /> View Columns
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[220px] p-3">
                        <div className="grid gap-2">
                          <p className="text-sm font-medium">Toggle PO Columns</p>
                          <div className="flex items-center justify-between mt-1 mb-2">
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto text-xs"
                              onClick={() => handleSelectAllColumns("pos", PO_COLUMNS_META, true)}
                            >
                              Select All
                            </Button>
                            <span className="text-gray-300 mx-1">|</span>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto text-xs"
                              onClick={() => handleSelectAllColumns("pos", PO_COLUMNS_META, false)}
                            >
                              Deselect All
                            </Button>
                          </div>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {PO_COLUMNS_META.filter((col) => col.toggleable).map((col) => (
                              <div key={`toggle-po-${col.dataKey}`} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`toggle-po-${col.dataKey}`}
                                  checked={!!visiblePoColumns[col.dataKey]}
                                  onCheckedChange={(checked) =>
                                    handleToggleColumn("pos", col.dataKey, Boolean(checked))
                                  }
                                  disabled={col.alwaysVisible}
                                />
                                <Label
                                  htmlFor={`toggle-po-${col.dataKey}`}
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
                <CardContent className="p-0 flex-1 flex-col">
                  {loadingPOs ? (
                    <div className="flex flex-col justify-center items-center py-8 flex-1">
                      <Loader2 className="h-8 w-8 text-purple-600 animate-spin mb-3" />
                      <p className="text-muted-foreground ml-2">Loading Purchase Orders...</p>
                    </div>
                  ) : error && filteredPurchaseOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-destructive-foreground bg-destructive/10 rounded-lg mx-4 my-4 text-center flex-1">
                      <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
                      <p className="font-medium text-destructive">Error Loading POs</p>
                      <p className="text-sm text-muted-foreground max-w-md">{error}</p>
                    </div>
                  ) : filteredPurchaseOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-purple-200/50 bg-purple-50/50 rounded-lg mx-4 my-4 text-center flex-1">
                      <FileText className="h-12 w-12 text-purple-500 mb-3" />
                      <p className="font-medium text-foreground">No Eligible POs Found</p>
                      <p className="text-sm text-muted-foreground text-center">
                        Ensure POs meet criteria: Column AN filled & AO empty.
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
                            {PO_COLUMNS_META.filter((col) => visiblePoColumns[col.dataKey]).map((col) => (
                              <TableHead key={col.dataKey} className="whitespace-nowrap text-xs px-3 py-2">
                                {col.header}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPurchaseOrders.map((po) => (
                            <TableRow
                              key={po.id}
                              className={`hover:bg-purple-50/50 ${liftExistsForPO(po.indentNo) ? "opacity-60 bg-gray-100 cursor-not-allowed" : ""} ${selectedPO?.id === po.id ? "bg-purple-100 ring-1 ring-purple-300" : ""}`}
                            >
                              {PO_COLUMNS_META.filter((col) => visiblePoColumns[col.dataKey]).map((column) => (
                                <TableCell
                                  key={column.dataKey}
                                  className={`whitespace-nowrap text-xs px-3 py-2 ${
                                    column.dataKey === "indentNo" ? "font-medium text-primary" : "text-gray-700"
                                  } ${
                                    column.dataKey === "vendorName" ||
                                    column.dataKey === "rawMaterialName" ||
                                    column.dataKey === "whatIsToBeDone"
                                      ? "truncate max-w-[150px]"
                                      : ""
                                  }`}
                                >
                            {column.dataKey === "actionColumn" ? (
                              <div className="flex flex-col gap-1">
                                {liftExistsForPO(po.indentNo) ? (
                                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-xs">
                                    Lift Recorded
                                  </Badge>
                                ) : (
                                  <Button
                                    onClick={() => handlePOSelect(po)}
                                    size="xs"
                                    variant="outline"
                                    disabled={isSubmitting || !!selectedPO}
                                    className="text-xs h-7 px-2 py-1 mb-1"
                                  >
                                    Create Lift
                                  </Button>
                                )}
                                <Button
                                  onClick={() => handleCancelPendingPO(po)}
                                  size="xs"
                                  variant="destructive"
                                  className="text-xs h-7 px-2 py-1"
                                >
                                  Cancel Pending PO
                                </Button>
                              </div>
                            ) : (
                              <span title={column.dataKey === "whatIsToBeDone" ? po[column.dataKey] : undefined}>
                                {renderCell(po, column)}
                              </span>
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
            </TabsContent>

            <TabsContent value="liftsHistory" className="flex-1 flex flex-col mt-0">
              <Card className="shadow-sm border border-border flex-1 flex-col">
                <CardHeader className="py-3 px-4 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center text-sm font-semibold text-foreground">
                        <History className="h-4 w-4 text-purple-600 mr-2" /> All Material Lifts (
                        {filteredMaterialLifts.length})
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">
                        Sorted from latest to oldest recorded lift. Red rows indicate Material Rate mismatch with PO Rate.
                      </CardDescription>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs bg-transparent">
                          <MixerHorizontalIcon className="mr-1.5 h-3.5 w-3.5" /> View Columns
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[220px] p-3">
                        <div className="grid gap-2">
                          <p className="text-sm font-medium">Toggle Lift Columns</p>
                          <div className="flex items-center justify-between mt-1 mb-2">
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto text-xs"
                              onClick={() => handleSelectAllColumns("lifts", LIFTS_COLUMNS_META, true)}
                            >
                              Select All
                            </Button>
                            <span className="text-gray-300 mx-1">|</span>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto text-xs"
                              onClick={() => handleSelectAllColumns("lifts", LIFTS_COLUMNS_META, false)}
                            >
                              Deselect All
                            </Button>
                          </div>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {LIFTS_COLUMNS_META.filter((col) => col.toggleable).map((col) => (
                              <div key={`toggle-lift-${col.dataKey}`} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`toggle-lift-${col.dataKey}`}
                                  checked={!!visibleLiftsColumns[col.dataKey]}
                                  onCheckedChange={(checked) =>
                                    handleToggleColumn("lifts", col.dataKey, Boolean(checked))
                                  }
                                  disabled={col.alwaysVisible}
                                />
                                <Label
                                  htmlFor={`toggle-lift-${col.dataKey}`}
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
                <CardContent className="p-0 flex-1 flex-col">
                  {loadingLifts ? (
                    <div className="flex flex-col justify-center items-center py-8 flex-1">
                      <Loader2 className="h-8 w-8 text-purple-600 animate-spin mb-3" />
                      <p className="text-muted-foreground ml-2">Loading Material Lifts...</p>
                    </div>
                  ) : error && filteredMaterialLifts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-destructive-foreground bg-destructive/10 rounded-lg mx-4 my-4 text-center flex-1">
                      <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
                      <p className="font-medium text-destructive">Error Loading Lifts</p>
                      <p className="text-sm text-muted-foreground max-w-md">
                        {error.split("\n").find((line) => line.includes("lifts data")) || error}
                      </p>
                    </div>
                  ) : filteredMaterialLifts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-purple-200/50 bg-purple-50/50 rounded-lg mx-4 my-4 text-center flex-1">
                      <Truck className="h-12 w-12 text-purple-500 mb-3" />
                      <p className="font-medium text-foreground">No Material Lifts Recorded</p>
                      <p className="text-sm text-muted-foreground text-center">
                        Create lifts from the 'Available POs' tab.
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
                            {LIFTS_COLUMNS_META.filter((col) => visibleLiftsColumns[col.dataKey]).map((col) => (
                              <TableHead key={col.dataKey} className="whitespace-nowrap text-xs px-3 py-2">
                                {col.header}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredMaterialLifts.map((lift) => {
                            // Check if Material Rate matches PO Rate - ONLY Material Rate comparison
                            const liftMaterialRate = parseFloat(lift.rate) || 0;
                            
                            // Find corresponding PO rate from INDENT-PO sheet column Y
                            const correspondingPO = purchaseOrders.find(po => po.indentNo === lift.indentNo);
                            const poRate = parseFloat(correspondingPO?.rate) || 0;
                            const materialRateMatches = Math.abs(liftMaterialRate - poRate) < 0.01;
                            
                            return (
                              <TableRow 
                                key={lift.id} 
                                className={`hover:bg-purple-50/50 ${!materialRateMatches ? 'bg-red-50 border-red-700' : ''}`}
                              >
                                {LIFTS_COLUMNS_META.filter((col) => visibleLiftsColumns[col.dataKey]).map((column) => (
                                  <TableCell
                                    key={column.dataKey}
                                    className={`whitespace-nowrap text-xs px-3 py-2 ${
                                      column.dataKey === "id" ? "font-medium text-primary" : "text-gray-700"
                                    } ${
                                      column.dataKey === "vendorName" ||
                                      column.dataKey === "material" ||
                                      column.dataKey === "transporterName"
                                        ? "truncate max-w-[150px]"
                                        : ""
                                    }`}
                                  >
                                    {renderCell(lift, column)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {showPopup && selectedPO && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[95vh] flex flex-col shadow-2xl">
            <CardHeader className="px-7 py-5 bg-gray-50 border-b border-gray-200 flex justify-between items-center rounded-t-xl">
              <CardTitle className="font-semibold text-lg text-gray-800">
                Record Lift for <span className="text-purple-600">{formData.indentNo}</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClosePopup}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="p-7 space-y-6 overflow-y-auto scrollbar-hide">
              <form onSubmit={handleSubmit}>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mb-6">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Selected Purchase Order Details </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <Label className="text-slate-500">Indent No.</Label>
                      <p className="font-medium text-slate-600">{selectedPO.indentNo}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Vendor</Label>
                      <p className="font-medium text-slate-600 truncate">{selectedPO.vendorName}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Material</Label>
                      <p className="font-medium text-slate-600 truncate">{selectedPO.rawMaterialName}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">PO Quantity</Label>
                      <p className="font-medium text-slate-600">{selectedPO.quantity} units</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                  {[
                    { label: "Bill No.", name: "billNo", type: "text", isRequired: true },
                    {
                      label: "Type",
                      name: "Type",
                      type: "select",
                      options: [{ value: "", label: "Select type" }, ...typeOptions],
                      isRequired: true,
                    },
                    {
                      label: "Area Lifting",
                      name: "Arealifting",
                      type: "select",
                      options: [{ value: "", label: "Select area" }, ...areaOptions],
                      isRequired: true,
                    },
                    {
                      label: "Lead Time (days for lifting)",
                      name: "liftingLeadTime",
                      type: "number",
                      isRequired: true,
                    },
                    { label: "Truck No.", name: "truckNo", type: "text", isRequired: true },
                    { label: "Driver No.", name: "driverNo", type: "text", isRequired: true },
                    {
                      label: "Transporter Name",
                      name: "TransporterName",
                      type: "select",
                      options: [{ value: "", label: "Select transporter" }, ...transporterOptions],
                      isRequired: true,
                    },
                    {
                      label: "Type Of Transporting Rate",
                      name: "rateType",
                      type: "select",
                      options: [{ value: "", label: "Select rate type" }, ...rateTypeOptions],
                      isRequired: true,
                    },
                    { label: "Material Rate (INR)", name: "rate", type: "number", step: "any", isRequired: true },
                    { label: "Transport Rate (INR)", name: "transportRate", type: "number", step: "any", isRequired: false }, // Changed to not required
                    {
                      label: "Lifted Quantity (Units)",
                      name: "truckQty",
                      type: "number",
                      step: "any",
                      isRequired: true,
                    },
                    {
                      label: "Truck Quantity",
                      name: "additionalTruckQty",
                      type: "number",
                      step: "any",
                      isRequired: false,
                    },
                  ].map((field) => {
                    const placeholderLabel =
                      field.type === "select"
                        ? field.options.find((opt) => opt.value === "")?.label ||
                          `Select ${field.label.toLowerCase().replace(" *", "")}`
                        : field.label.replace(" *", "")
                    const actualOptions = field.type === "select" ? field.options.filter((opt) => opt.value !== "") : []
                    return (
                      <div key={field.name}>
                        <Label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={field.name}>
                          {field.label} {field.isRequired && <span className="text-red-500">*</span>}
                        </Label>
                        {field.type === "select" ? (
                          <Select
                            name={field.name}
                            value={formData[field.name]}
                            onValueChange={(value) => handleFormSelectChange(field.name, value)}
                          >
                            <SelectTrigger
                              className={`w-full ${formErrors[field.name] ? "border-red-500" : "border-gray-300"}`}
                            >
                              <SelectValue placeholder={placeholderLabel} />
                            </SelectTrigger>
                            <SelectContent>
                              {actualOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={field.type}
                            id={field.name}
                            name={field.name}
                            value={formData[field.name]}
                            onChange={handleInputChange}
                            step={field.step}
                            className={`${formErrors[field.name] ? "border-red-500" : "border-gray-300"}`}
                            placeholder={placeholderLabel}
                          />
                        )}
                        {formErrors[field.name] && (
                          <p className="mt-1 text-xs text-red-600">{formErrors[field.name]}</p>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Add this to the form grid after the existing fields */}
<div className="col-span-3">
  <Label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="hasBilty">
    Has Bilty? <span className="text-red-500">*</span>
  </Label>
  <Select
    name="hasBilty"
    value={formData.hasBilty}
    onValueChange={(value) => handleFormSelectChange("hasBilty", value)}
  >
    <SelectTrigger className={`w-full ${formErrors.hasBilty ? "border-red-500" : "border-gray-300"}`}>
      <SelectValue placeholder="Select option" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="yes">Yes</SelectItem>
      <SelectItem value="no">No</SelectItem>
    </SelectContent>
  </Select>
  {formErrors.hasBilty && <p className="mt-1 text-xs text-red-600">{formErrors.hasBilty}</p>}
</div>

{formData.hasBilty === "yes" && (
  <>
    <div>
      <Label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="biltyNo">
        Bilty Number <span className="text-red-500">*</span>
      </Label>
      <Input
        type="text"
        id="biltyNo"
        name="biltyNo"
        value={formData.biltyNo}
        onChange={handleInputChange}
        className={`${formErrors.biltyNo ? "border-red-500" : "border-gray-300"}`}
        placeholder="Enter bilty number"
      />
      {formErrors.biltyNo && <p className="mt-1 text-xs text-red-600">{formErrors.biltyNo}</p>}
    </div>

    <div className="col-span-2">
      <Label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="biltyImage">
        Upload Bilty Image
      </Label>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-purple-400 transition-colors">
        <div className="space-y-1 text-center">
          <Upload className="mx-auto h-10 w-10 text-gray-400" />
          <div className="flex text-sm text-gray-600 justify-center">
            <Label
              htmlFor="biltyImage"
              className="relative cursor-pointer bg-white rounded-md font-medium text-purple-600 hover:text-purple-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-purple-500 px-1"
            >
              <span>Upload bilty image</span>
              <Input
                id="biltyImage"
                name="biltyImage"
                type="file"
                className="sr-only"
                onChange={(e) => {
                  const { name, files } = e.target
                  setFormData({ ...formData, [name]: files && files[0] ? files[0] : null })
                }}
                accept="image/*,.pdf"
              />
            </Label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">
            {formData.biltyImage ? formData.biltyImage.name : "PNG, JPG, PDF up to 10MB"}
          </p>
        </div>
      </div>
    </div>
  </>
)}

                <div className="mt-5">
                  <Label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="billImage">
                    Upload Bill Image (Optional)
                  </Label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-purple-400 transition-colors">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-10 w-10 text-gray-400" />
                      <div className="flex text-sm text-gray-600 justify-center">
                        <Label
                          htmlFor="billImage"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-purple-600 hover:text-purple-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-purple-500 px-1"
                        >
                          <span>Upload a file</span>
                          <Input
                            id="billImage"
                            name="billImage"
                            type="file"
                            className="sr-only"
                            onChange={handleFileUpload}
                            accept="image/*,.pdf"
                          />
                        </Label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {formData.billImage ? formData.billImage.name : "PNG, JPG, PDF up to 10MB"}
                      </p>
                    </div>
                  </div>
                  {formErrors.billImage && <p className="mt-1 text-xs text-red-600">{formErrors.billImage}</p>}
                </div>

                <div className="pt-6 flex justify-end gap-4 border-t border-gray-200 mt-4">
                  <Button type="button" variant="outline" onClick={handleClosePopup}>
                    Cancel
                  </Button>
                  <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin my-0.5" /> Recording Lift...
                      </>
                    ) : (
                      "Record Material Lifting"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          {/* Cancel Pending PO Quantity Popup */}
{cancelPendingPO.show && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="px-6 py-5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <CardTitle className="font-semibold text-lg text-gray-800">
          Cancel Pending PO Quantity
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCloseCancelPopup}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Purchase Order Details</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <Label className="text-slate-500">Indent No.</Label>
                <p className="font-medium text-slate-600">{cancelPendingPO.indentNo}</p>
              </div>
              <div>
                <Label className="text-slate-500">Current Cancel Qty</Label>
                <p className="font-medium text-slate-600">
                  {purchaseOrders.find(po => po.id === cancelPendingPO.poId)?.orderCancelQty || "0"}
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Cancel Quantity <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              value={cancelPendingPO.cancelQuantity}
              onChange={handleCancelQuantityChange}
              placeholder="Enter quantity to cancel"
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be added to the existing Order Cancel Qty in column AI
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleCloseCancelPopup}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={submitCancelPendingPO}
              disabled={cancelPendingPO.loading}
            >
              {cancelPendingPO.loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                "Submit Cancel Quantity"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
)}


        </div>
      )}
    </div>
  )
}
