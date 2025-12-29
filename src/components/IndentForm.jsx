"use client"
import { useState, useEffect, useCallback } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { FileText, Loader2, CheckCircle, XCircle } from "lucide-react"
import { useAuth } from "../context/AuthContext"

export default function IndentForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    generatedBy: "",
    vendorName: "",
    firmName: "",
    rawMaterialName: "",
    quantity: "",
    currentStock: "",
    notes: "",
    deliveryOrderNo: "",
    priority: "",
  })
  const [errors, setErrors] = useState({})
  const [dropdownOptions, setDropdownOptions] = useState({
    generatedBy: [],
    vendorName: [],
    firmName: [],
    rawMaterialName: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [lastRLNumberNumeric, setLastRLNumberNumeric] = useState(0)
  const { user, allowedSteps } = useAuth()

  const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbzj9zlZTEhdlmaMt78Qy3kpkz7aOfVKVBRuJkd3wv_UERNrIRCaepSULpNa7W1g-pw/exec"
  const SHEET_ID = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ"
  const MASTER_SHEET_NAME = "Master"
  const SHEET_NAME = "INDENT-PO"

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const masterUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${MASTER_SHEET_NAME}&cb=${new Date().getTime()}`
      const indentUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}&cb=${new Date().getTime()}`

      const masterResponse = await fetch(masterUrl)
      if (!masterResponse.ok)
        throw new Error(`Failed to fetch Master sheet: ${masterResponse.status} ${masterResponse.statusText}`)
      
      let masterText = await masterResponse.text();
      const jsonpStart = "google.visualization.Query.setResponse(";
      if (masterText.startsWith(jsonpStart)) {
          masterText = masterText.substring(jsonpStart.length, masterText.length - 2);
      } else {
          const jsonStartIndex = masterText.indexOf('{');
          const jsonEndIndex = masterText.lastIndexOf('}');
          if (jsonStartIndex === -1 || jsonEndIndex === -1 || jsonEndIndex <= jsonStartIndex) {
              throw new Error("Invalid response format from Google Sheets.");
          }
          masterText = masterText.substring(jsonStartIndex, jsonEndIndex + 1);
      }
      
      const masterData = JSON.parse(masterText);

      if (masterData.status === "error" || !masterData.table) {
        throw new Error("Master sheet data is invalid or returned an error.")
      }
      
      // Data rows from the sheet (header is not included here)
      const masterRows = masterData.table.rows;

      // **FIX:** The screenshot shows the header row is being included in the data.
      // We explicitly skip the first row of the returned data to remove the header.
      const dataRowsOnly = masterRows.slice(1);

      const generatedByIndex = 0;      // Column A
      const vendorNameIndex = 1;       // Column B
      const rawMaterialNameIndex = 2;  // Column C
      const firmNameIndex = 9;         // Column J

      const extractUniqueValues = (rows, columnIndex) => {
        if (columnIndex === -1 || !rows || rows.length === 0) return [];
        const values = rows.map((row) => {
            const cell = row.c[columnIndex];
            // Ensure row and cell exist before trying to access properties
            return row && row.c && cell && cell.v !== null ? String(cell.v).trim() : "";
        }).filter(Boolean); // Filter out any empty strings that might result
        return [...new Set(values)].sort();
      };

      const options = {
        generatedBy: extractUniqueValues(dataRowsOnly, generatedByIndex),
        vendorName: extractUniqueValues(dataRowsOnly, vendorNameIndex),
        firmName: extractUniqueValues(dataRowsOnly, firmNameIndex),
        rawMaterialName: extractUniqueValues(dataRowsOnly, rawMaterialNameIndex),
      };

      if (!allowedSteps.includes("admin") && user?.firmName && user.firmName.toLowerCase() !== "all") {
        options.firmName = options.firmName.filter((firm) => firm.toLowerCase() === user.firmName.toLowerCase())
        setFormData((prev) => ({ ...prev, firmName: user.firmName }))
      }

      setDropdownOptions(options)

      const indentResponse = await fetch(indentUrl)
      if (!indentResponse.ok)
        throw new Error(`Failed to fetch Indent-PO sheet: ${indentResponse.status} ${indentResponse.statusText}`)

      const indentCsvData = await indentResponse.text()
      const indentRows = indentCsvData.split("\n").map((row) => {
        return row.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
      })

      const rlNumberColumnIndex = 1
      let highestNumber = 0
      if (indentRows.length > 1) {
        for (let i = 1; i < indentRows.length; i++) {
          if (indentRows[i] && indentRows[i].length > rlNumberColumnIndex) {
            const idValue = indentRows[i][rlNumberColumnIndex]
            if (idValue && typeof idValue === "string" && idValue.startsWith("RL-")) {
              const numStr = idValue.substring(3)
              const num = Number.parseInt(numStr, 10)
              if (!isNaN(num) && num > highestNumber) {
                highestNumber = num
              }
            }
          }
        }
      }
      setLastRLNumberNumeric(highestNumber)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load initial form data.", {
        description: "Please try refreshing. Error: " + error.message,
        icon: <XCircle className="h-4 w-4" />,
      })
    } finally {
      setIsLoading(false)
    }
  }, [SHEET_ID, SHEET_NAME, MASTER_SHEET_NAME, user, allowedSteps])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (errors[name]) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]: null,
      }))
    }
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (errors[name]) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]: null,
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.generatedBy) newErrors.generatedBy = "Generated By is required."
    // if (!formData.vendorName) newErrors.vendorName = "Vendor Name is required."
    if (!formData.firmName) newErrors.firmName = "Firm Name is required."
    if (!formData.rawMaterialName) newErrors.rawMaterialName = "Raw Material Name is required."
    
    // Stricter check for Quantity
    if (!formData.quantity) {
        newErrors.quantity = "Quantity is required."
    } else if (isNaN(Number(formData.quantity)) || Number(formData.quantity) <= 0) {
        newErrors.quantity = "Quantity must be a positive number."
    }

    // Stricter check for Current Stock
    if (!formData.currentStock) {
        newErrors.currentStock = "Current stock is required."
    } else if (isNaN(Number(formData.currentStock))) {
        newErrors.currentStock = "Current stock must be a number."
    }

    if (!formData.priority) newErrors.priority = "Priority is required."
    
    setErrors(newErrors); // Update state for UI error messages
    return newErrors; // Return errors immediately for synchronous check
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validateForm(); // Get validation errors directly

    // Check the returned errors object instead of state
    if (Object.keys(validationErrors).length > 0) {
      const firstErrorKey = Object.keys(validationErrors)[0];
      toast.error("Validation Error", {
        description: validationErrors[firstErrorKey],
        icon: <XCircle className="h-4 w-4" />,
      });
      return; // Stop the submission
    }

    setIsSubmitting(true)
    try {
      const nextNumericPart = lastRLNumberNumeric + 1
      const paddedNumber = String(nextNumericPart).padStart(3, "0")
      const rlNumber = `RL-${paddedNumber}`

      const now = new Date()
      const timestamp = now.toLocaleString("en-GB", { hour12: false }).replace(",", "");

      // This array maps your form data to the columns in the sheet.
      // The order is critical.
      const rowData = [
        timestamp,            // Column A
        rlNumber,             // Column B
        formData.firmName,    // Column C
        formData.generatedBy, // Column D
        " ",  // Column E
        formData.rawMaterialName, // Column F
        formData.quantity,    // Column G
        formData.currentStock,// Column H
        formData.priority,    // Column I
        formData.deliveryOrderNo, // Column J
        formData.notes,       // Column K
      ]

      const formPayload = new URLSearchParams()
      formPayload.append("sheetName", SHEET_NAME)
      formPayload.append("action", "insert")
      formPayload.append("rowData", JSON.stringify(rowData))

      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: formPayload,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Submission failed: ${response.status}. Details: ${errorText || "N/A"}`,
        )
      }

      const result = await response.json()
      if (!result.success && result.result !== "success") {
        throw new Error(result.message || "Submission reported an issue from Apps Script.")
      }

      setLastRLNumberNumeric(nextNumericPart)
      toast.success("Success!", {
        description: `RL Number ${rlNumber} generated successfully!`,
        icon: <CheckCircle className="h-4 w-4" />,
      })

      // Reset the form
      setFormData({
        generatedBy: "",
        // vendorName: "",
        firmName: user?.firmName && user.firmName.toLowerCase() !== "all" ? user.firmName : "",
        rawMaterialName: "",
        quantity: "",
        currentStock: "",
        notes: "",
        deliveryOrderNo: "",
        priority: "",
      })
      setErrors({})
    } catch (error) {
      console.error("Error submitting form:", error)
      toast.error("Submission Failed", {
        description: error.message || "Failed to submit RL Number. Please try again.",
        icon: <XCircle className="h-4 w-4" />,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <Card className="w-full max-w-lg shadow-lg">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="ml-3 text-gray-700 mt-4">Loading form data...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 p-4 sm:p-6 lg:p-6">
      <Card className="w-full bg-white shadow-md rounded-lg border border-gray-200">
        <CardHeader className="p-6 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2 text-gray-700">
            <FileText className="h-6 w-6 text-primary" />
            Step 1: Generate Entry
          </CardTitle>
          <CardDescription className="text-gray-600">
            Fill out the form to generate a new entry with an RL Number
          </CardDescription>
          {user?.firmName && user.firmName.toLowerCase() !== "all" && (
            <p className="text-primary text-sm mt-1">
              Creating entry for: <span className="font-semibold">{user.firmName}</span>
            </p>
          )}
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="generatedBy">Generated By</Label>
                <Select
                  name="generatedBy"
                  value={formData.generatedBy}
                  onValueChange={(value) => handleSelectChange("generatedBy", value)}
                >
                  <SelectTrigger className={`mt-1 ${errors.generatedBy ? "border-red-500" : ""}`}>
                    <SelectValue placeholder="Select generator" />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownOptions.generatedBy.map((option, index) => (
                      <SelectItem key={`gen-${index}`} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.generatedBy && <p className="text-red-500 text-xs mt-1">{errors.generatedBy}</p>}
              </div>

              <div>
                <Label htmlFor="firmName">Firm Name</Label>
                <Select
                  name="firmName"
                  value={formData.firmName}
                  onValueChange={(value) => handleSelectChange("firmName", value)}
                  disabled={!allowedSteps.includes("admin") && user?.firmName && user.firmName.toLowerCase() !== "all"}
                >
                  <SelectTrigger className={`mt-1 ${errors.firmName ? "border-red-500" : ""}`}>
                    <SelectValue placeholder="Select firm name" />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownOptions.firmName.map((option, index) => (
                      <SelectItem key={`firm-${index}`} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.firmName && <p className="text-red-500 text-xs mt-1">{errors.firmName}</p>}
              </div>

              {/* <div>
                <Label htmlFor="vendorName">Vendor Name</Label>
                <Select
                  name="vendorName"
                  value={formData.vendorName}
                  onValueChange={(value) => handleSelectChange("vendorName", value)}
                >
                  <SelectTrigger className={`mt-1 ${errors.vendorName ? "border-red-500" : ""}`}>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownOptions.vendorName.map((option, index) => (
                      <SelectItem key={`ven-${index}`} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.vendorName && <p className="text-red-500 text-xs mt-1">{errors.vendorName}</p>}
              </div> */}

              <div>
                <Label htmlFor="rawMaterialName">Raw Material Name</Label>
                <Select
                  name="rawMaterialName"
                  value={formData.rawMaterialName}
                  onValueChange={(value) => handleSelectChange("rawMaterialName", value)}
                >
                  <SelectTrigger className={`mt-1 ${errors.rawMaterialName ? "border-red-500" : ""}`}>
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownOptions.rawMaterialName.map((option, index) => (
                      <SelectItem key={`mat-${index}`} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.rawMaterialName && <p className="text-red-500 text-xs mt-1">{errors.rawMaterialName}</p>}
              </div>

              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="text"
                  name="quantity"
                  placeholder="Enter quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  className={`mt-1 ${errors.quantity ? "border-red-500" : ""}`}
                />
                {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
              </div>

              <div>
                <Label htmlFor="currentStock">Current Stock As Per Factory</Label>
                <Input
                  id="currentStock"
                  type="text"
                  name="currentStock"
                  placeholder="Enter current stock"
                  value={formData.currentStock}
                  onChange={handleChange}
                  className={`mt-1 ${errors.currentStock ? "border-red-500" : ""}`}
                />
                {errors.currentStock && <p className="text-red-500 text-xs mt-1">{errors.currentStock}</p>}
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  name="priority"
                  value={formData.priority}
                  onValueChange={(value) => handleSelectChange("priority", value)}
                >
                  <SelectTrigger className={`mt-1 ${errors.priority ? "border-red-500" : ""}`}>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Regular">Regular</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                    <SelectItem value="Planned">Planned</SelectItem>
                  </SelectContent>
                </Select>
                {errors.priority && <p className="text-red-500 text-xs mt-1">{errors.priority}</p>}
              </div>

              <div className="lg:col-span-2">
                <Label htmlFor="deliveryOrderNo">Delivery Order No.</Label>
                <Input
                  id="deliveryOrderNo"
                  type="text"
                  name="deliveryOrderNo"
                  placeholder="Enter delivery order number (optional)"
                  value={formData.deliveryOrderNo}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="lg:col-span-3">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Enter any additional notes or requirements"
                value={formData.notes}
                onChange={handleChange}
                className="min-h-[80px] mt-1"
              />
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                className="w-full font-semibold rounded-md"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Generate Entry"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}