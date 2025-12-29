"use client"

import { useState, useEffect, useCallback, useContext } from "react"
import { Scale, Loader2, AlertTriangle, FileText, Search, Filter } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { AuthContext } from "../context/AuthContext"

const SHEET_ID = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ"
const TL_SHEET_NAME = "TL"
const API_URL = "https://script.google.com/macros/s/AKfycbzj9zlZTEhdlmaMt78Qy3kpkz7aOfVKVBRuJkd3wv_UERNrIRCaepSULpNa7W1g-pw/exec"

export default function TolerancePage() {
  const { user } = useContext(AuthContext)
  const [toleranceData, setToleranceData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterColumn, setFilterColumn] = useState("all")

  const fetchToleranceData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        TL_SHEET_NAME,
      )}&cb=${new Date().getTime()}`
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch tolerance data: ${response.status} ${response.statusText}`)
      }
      
      let text = await response.text()
      
      // Clean up Google Sheets response format
      if (text.startsWith("google.visualization.Query.setResponse(")) {
        text = text.substring(text.indexOf("(") + 1, text.lastIndexOf(")"))
      } else {
        const jsonStart = text.indexOf("{")
        const jsonEnd = text.lastIndexOf("}")
        if (jsonStart === -1 || jsonEnd === -1) {
          throw new Error("Invalid JSON response format from Google Sheets.")
        }
        text = text.substring(jsonStart, jsonEnd + 1)
      }

      const data = JSON.parse(text)

      if (data.status === "error") {
        throw new Error(data.errors?.[0]?.detailed_message || "Sheet API returned error status.")
      }

      if (!data.table || !data.table.rows || data.table.rows.length === 0) {
        throw new Error("Tolerance Sheet data is empty or has no rows.")
      }

      // Process the data
      const cols = data.table.cols?.map(col => col.label || col.id) || []
      const rows = data.table.rows || []

      const processedData = rows
        .slice(1) // Skip header row
        .filter((row) => row.c && row.c.some((cell) => cell && cell.v !== null && cell.v !== undefined))
        .map((row, index) => {
          const record = { id: index + 1 }
          row.c.forEach((cell, cellIndex) => {
            const columnName = cols[cellIndex] || `col${cellIndex}`
            record[columnName] = cell && cell.v !== undefined && cell.v !== null ? cell.v : ""
          })
          return record
        })

      setToleranceData(processedData)
    } catch (error) {
      setError(`Failed to load tolerance data: ${error.message}`)
      setToleranceData([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchToleranceData()
  }, [fetchToleranceData])

  // Get column names from first record
  const columns = toleranceData.length > 0 ? Object.keys(toleranceData[0]).filter(key => key !== 'id') : []

  // Filter data based on search term and column filter
  const filteredData = toleranceData.filter((record) => {
    if (!searchTerm && filterColumn === "all") return true
    
    const searchLower = searchTerm.toLowerCase()
    
    if (filterColumn === "all") {
      return Object.values(record).some(value => 
        String(value).toLowerCase().includes(searchLower)
      )
    } else {
      return String(record[filterColumn] || "").toLowerCase().includes(searchLower)
    }
  })

  const handleClearFilters = () => {
    setSearchTerm("")
    setFilterColumn("all")
  }

  return (
    <div className="space-y-4 p-4 md:p-6 bg-slate-50 min-h-screen text-base">
      <Card className="shadow-md border-none">
        <CardHeader className="p-4 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2 text-gray-700 text-lg">
            <Scale className="h-5 w-5 text-purple-600" /> 
            Tolerance Data
          </CardTitle>
          <CardDescription className="text-gray-500 text-sm">
            Material tolerance specifications and parameters.
            {user?.firmName && user.firmName.toLowerCase() !== "all" && (
              <span className="ml-2 text-purple-600 font-medium">• User: {user.firmName}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {/* Filters Section */}
          <div className="mb-4 p-4 bg-purple-50/50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-medium">Filters</Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearFilters} 
                className="ml-auto bg-white"
              >
                Clear All
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search tolerance data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 bg-white"
                />
              </div>
              <Select value={filterColumn} onValueChange={setFilterColumn}>
                <SelectTrigger className="h-8 bg-white">
                  <SelectValue placeholder="Search in column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Columns</SelectItem>
                  {columns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-end">
                <Badge variant="secondary" className="text-xs">
                  {filteredData.length} of {toleranceData.length} records
                </Badge>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <Card className="shadow-sm border border-border">
            <CardHeader className="py-3 px-4 bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center text-sm font-semibold text-foreground">
                    <FileText className="h-4 w-4 text-purple-600 mr-2" />
                    Tolerance Specifications ({filteredData.length})
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Material tolerance data and specifications from TL sheet.
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchToleranceData}
                  className="h-8 text-xs bg-transparent"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Refresh"
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex flex-col justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 text-purple-600 animate-spin mb-3" />
                  <p className="text-muted-foreground">Loading tolerance data...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-destructive-foreground bg-destructive/10 rounded-lg mx-4 my-4 text-center">
                  <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
                  <p className="font-medium text-destructive">Error Loading Data</p>
                  <p className="text-sm text-muted-foreground max-w-md">{error}</p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-purple-200/50 bg-purple-50/50 rounded-lg mx-4 my-4 text-center">
                  <Scale className="h-12 w-12 text-purple-500 mb-3" />
                  <p className="font-medium text-foreground">No Data Found</p>
                  <p className="text-sm text-muted-foreground text-center">
                    {searchTerm || filterColumn !== "all" 
                      ? "No records match your current filters." 
                      : "No tolerance data available in the TL sheet."
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-b-lg">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                      <TableRow>
                        {columns.map((column) => (
                          <TableHead 
                            key={column} 
                            className="whitespace-nowrap text-xs px-3 py-2 font-medium"
                          >
                            {column}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((record) => (
                        <TableRow 
                          key={record.id} 
                          className="hover:bg-purple-50/50"
                        >
                          {columns.map((column) => (
                            <TableCell 
                                key={column} 
                                className="whitespace-nowrap text-xs px-3 py-2 text-gray-700"
                                >
                                {(record[column] || record[column] === 0) ? record[column] : "-"}
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
        </CardContent>
      </Card>
    </div>
  )
}
