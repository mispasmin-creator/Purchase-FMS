"use client"
import { useState, useEffect, useMemo, useCallback } from "react"
import {
  LayoutDashboard,
  CheckCircle,
  Hourglass,
  Truck,
  FileText,
  Archive,
  RefreshCw,
  X,
  CalendarIcon,
  List,
  Filter,
  TrendingUp,
  Package,
  Clock,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Activity,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import {
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar,
} from "recharts"
import { useAuth } from "../context/AuthContext"

// --- Constants ---
const SHEET_ID = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ"
const INDENT_PO_SHEET = "INDENT-PO"
const LIFT_ACCOUNTS_SHEET = "LIFT-ACCOUNTS"
const ACCOUNTS_SHEET = "ACCOUNTS"

// Enhanced color palette
const THEME_COLORS = {
  primary: "#8B5CF6",
  secondary: "#6366F1",
  accent: "#3B82F6",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#06B6D4",
  purple: "#8B5CF6",
  indigo: "#6366F1",
  pink: "#EC4899",
}

const PIE_COLORS = [
  "#10B981", // Green
  "#F59E0B", // Amber
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
  "#EC4899", // Pink
  "#6366F1", // Indigo
]

// --- Helper Functions ---
const parseGvizResponse = (text) => {
  if (!text) return null
  const jsonpMatch = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?$/s)
  if (jsonpMatch && jsonpMatch[1]) {
    try {
      return JSON.parse(jsonpMatch[1])
    } catch (e) {
      console.error("Failed to parse JSONP response:", e)
    }
  }
  const jsonStart = text.indexOf("{")
  const jsonEnd = text.lastIndexOf("}")
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    try {
      return JSON.parse(text.substring(jsonStart, jsonEnd + 1))
    } catch (e) {
      console.error("Failed to parse JSON:", e)
    }
  }
  return null
}

const parseDateFromSheet = (dateValue) => {
  if (!dateValue) return null
  if (dateValue instanceof Date) return dateValue
  if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
    const parts = dateValue.match(/\d+/g)
    if (parts && parts.length >= 3) {
      return new Date(Number.parseInt(parts[0]), Number.parseInt(parts[1]), Number.parseInt(parts[2]))
    }
  }
  const d = new Date(dateValue)
  return isNaN(d.getTime()) ? null : d
}

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-2xl border border-purple-200">
        <p className="font-bold text-gray-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: <span className="font-bold">{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = "purple", description }) => {
  const colorClasses = {
    purple: "from-purple-500 to-purple-600",
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    amber: "from-amber-500 to-amber-600",
    red: "from-red-500 to-red-600",
    indigo: "from-indigo-500 to-indigo-600",
  }

  return (
    <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
      <CardContent className="p-6 relative">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-600 mb-2">{title}</p>
            <h3 className="text-4xl font-bold text-gray-900 mb-1">{typeof value === 'number' ? value.toLocaleString() : value}</h3>
            {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
            {trend && (
              <div className="flex items-center gap-2 mt-3">
                {trend === 'up' && <ArrowUpRight className="h-4 w-4 text-green-500" />}
                {trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-500" />}
                {trend === 'neutral' && <Minus className="h-4 w-4 text-gray-400" />}
                <span className={`text-sm font-semibold ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                  {trendValue}
                </span>
              </div>
            )}
          </div>
          <div className={`p-4 rounded-2xl bg-gradient-to-br ${colorClasses[color]} shadow-lg`}>
            <Icon className="h-7 w-7 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [allPurchaseData, setAllPurchaseData] = useState([])
  const [allLiftAccountData, setAllLiftAccountData] = useState([])
  const [allAccountsData, setAllAccountsData] = useState([])
  const [activeTab, setActiveTab] = useState("overview")
  const [purchaseSubTab, setPurchaseSubTab] = useState("pending-lift")
  const { user, allowedSteps } = useAuth()

  // Filter States
  const [dateRange, setDateRange] = useState(undefined)
  const [filters, setFilters] = useState({
    vendorName: "all",
    material: "all",
    status: "all",
    rlNo: "",
    firmName: "all",
  })

  // Fetch Data
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const indentPoUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(INDENT_PO_SHEET)}`
      const liftAccountsUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(LIFT_ACCOUNTS_SHEET)}`
      const accountsUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(ACCOUNTS_SHEET)}`

      const [indentPoRes, liftAccountsRes, accountsRes] = await Promise.all([
        fetch(indentPoUrl), 
        fetch(liftAccountsUrl),
        fetch(accountsUrl)
      ])

      if (!indentPoRes.ok || !liftAccountsRes.ok || !accountsRes.ok) {
        throw new Error("Failed to fetch data from Google Sheets")
      }

      const indentPoData = parseGvizResponse(await indentPoRes.text())
      const liftAccountsData = parseGvizResponse(await liftAccountsRes.text())
      const accountsData = parseGvizResponse(await accountsRes.text())

      if (!indentPoData?.table || !liftAccountsData?.table || !accountsData?.table) {
        throw new Error("Invalid data structure from Google Sheets")
      }

      // Process INDENT-PO data
      let processedIndentPoData = indentPoData.table.rows
        .map((row, index) => {
          if (!row.c || index === 0) return null
          return {
            id: `po-${index}`,
            date: parseDateFromSheet(row.c[0]?.v),
            rlNo: row.c[1]?.v,
            firmName: row.c[2]?.v,
            vendorName: row.c[4]?.v,
            material: row.c[5]?.v,
            poQty: Number.parseFloat(row.c[23]?.v) || 0,
            poTimestamp: row.c[18]?.v,
            pendingQty: Number.parseFloat(row.c[33]?.v) || 0,
            notes: row.c[16]?.v,
            actualM: row.c[12]?.v,
            actualS: row.c[18]?.v,
            actualAL: row.c[37]?.v,
            actualAO: row.c[40]?.v,
          }
        })
        .filter((p) => p && p.rlNo)

      // Process LIFT-ACCOUNTS data
      let processedLiftAccountData = liftAccountsData.table.rows
        .map((row, index) => {
          if (!row.c || index === 0) return null
          return {
            id: `lift-${index}`,
            rlNo: row.c[2]?.v,
            deliveryOrderNo: row.c[6]?.v,
            liftedQty: Number.parseFloat(row.c[9]?.v) || 0,
            receivedTimestamp: row.c[20]?.v,
            receivedQty: Number.parseFloat(row.c[23]?.v) || 0,
            firmName: row.c[55]?.v,
            vendorName: row.c[3]?.v,
            material: row.c[5]?.v,
            notes: row.c[21]?.v,
            actualU: row.c[20]?.v,
            actualAE: row.c[30]?.v,
            actualAJ: row.c[35]?.v,
            actualBB: row.c[53]?.v,
          }
        })
        .filter((l) => l && l.rlNo)

      // Process ACCOUNTS data
      let processedAccountsData = accountsData.table.rows
        .map((row, index) => {
          if (!row.c || index === 0) return null
          return {
            id: `accounts-${index}`,
            rlNo: row.c[2]?.v,
            actualAA: row.c[26]?.v,
            actualAF: row.c[31]?.v,
            actualAK: row.c[36]?.v,
            actualAP: row.c[41]?.v,
            actualAU: row.c[46]?.v,
          }
        })
        .filter((a) => a && a.rlNo)

      // Apply firm filtering
      if (!allowedSteps.includes("admin") && user?.firmName && user.firmName.toLowerCase() !== "all") {
        const userFirmNameLower = user.firmName.toLowerCase()
        processedIndentPoData = processedIndentPoData.filter(
          (po) => po.firmName && String(po.firmName).toLowerCase() === userFirmNameLower
        )
        processedLiftAccountData = processedLiftAccountData.filter(
          (lift) => lift.firmName && String(lift.firmName).toLowerCase() === userFirmNameLower
        )
      }

      setAllPurchaseData(processedIndentPoData)
      setAllLiftAccountData(processedLiftAccountData)
      setAllAccountsData(processedAccountsData)
    } catch (e) {
      setError(`Failed to fetch dashboard data: ${e.message}`)
      console.error("Error:", e)
    } finally {
      setLoading(false)
    }
  }, [user, allowedSteps])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter Options
  const { vendorOptions, materialOptions, firmOptions } = useMemo(() => {
    const vendors = new Set()
    const materials = new Set()
    const firms = new Set()
    
    allPurchaseData.forEach((d) => {
      if (d.vendorName) vendors.add(d.vendorName)
      if (d.material) materials.add(d.material)
      if (d.firmName) firms.add(d.firmName)
    })
    
    allLiftAccountData.forEach((d) => {
      if (d.vendorName) vendors.add(d.vendorName)
      if (d.material) materials.add(d.material)
      if (d.firmName) firms.add(d.firmName)
    })

    return {
      vendorOptions: Array.from(vendors).sort(),
      materialOptions: Array.from(materials).sort(),
      firmOptions: Array.from(firms).sort(),
    }
  }, [allPurchaseData, allLiftAccountData])

  // Filtered Data
  const filteredIndentPoData = useMemo(() => {
    return allPurchaseData
      .filter((po) => {
        const materialLiftStatus = po.pendingQty === 0 ? "Complete" : "Pending"
        if (dateRange?.from && po.date && po.date < dateRange.from) return false
        if (dateRange?.to && po.date && po.date > dateRange.to) return false
        if (filters.rlNo && !po.rlNo?.toLowerCase().includes(filters.rlNo.toLowerCase())) return false
        if (filters.vendorName !== "all" && po.vendorName !== filters.vendorName) return false
        if (filters.material !== "all" && po.material !== filters.material) return false
        if (filters.status !== "all" && materialLiftStatus !== filters.status) return false
        if (filters.firmName !== "all" && po.firmName !== filters.firmName) return false
        return true
      })
      .map((po) => ({
        ...po,
        materialLiftStatus: po.pendingQty === 0 ? "Complete" : "Pending",
      }))
  }, [allPurchaseData, dateRange, filters])

  const filteredLiftAccountData = useMemo(() => {
    return allLiftAccountData.filter((lift) => {
      if (filters.rlNo && !lift.rlNo?.toLowerCase().includes(filters.rlNo.toLowerCase())) return false
      if (filters.vendorName !== "all" && lift.vendorName !== filters.vendorName) return false
      if (filters.material !== "all" && lift.material !== filters.material) return false
      if (filters.firmName !== "all" && lift.firmName !== filters.firmName) return false
      return true
    })
  }, [allLiftAccountData, filters])

  // Pending Stages Data
  const pendingStagesData = useMemo(() => {
    const stageNames = {
      indentPo: {
        M: 'Indent Approvals',
        S: 'Generate PO',
        AL: 'PO Entry In Tally',
        AO: 'Get Lift The Item'
      },
      liftAccounts: {
        U: 'Receipt / Quality Check',
        AE: 'Bilty Entry',
        AJ: 'Lab Testing',
        BB: 'Final Tally Entry'
      },
      accounts: {
        AA: 'Rectify & Bilty Add',
        AF: 'Audit Data',
        AK: 'Rectify Mistake 2',
        AP: 'Take Entry By Tally',
        AU: 'Again For Auditing'
      }
    }

    const pendingCounts = []

    const indentPoStages = [
      { key: 'actualM', columnName: 'M' },
      { key: 'actualS', columnName: 'S' },
      { key: 'actualAL', columnName: 'AL' },
      { key: 'actualAO', columnName: 'AO' },
    ]

    indentPoStages.forEach(({ key, columnName }) => {
      const pendingCount = filteredIndentPoData.filter(po => !po[key] || po[key] === null || po[key] === '').length
      pendingCounts.push({
        stageName: stageNames.indentPo[columnName],
        pendingCount: pendingCount,
        category: 'INDENT-PO'
      })
    })

    const liftAccountsStages = [
      { key: 'actualU', columnName: 'U' },
      { key: 'actualAE', columnName: 'AE' },
      { key: 'actualAJ', columnName: 'AJ' },
      { key: 'actualBB', columnName: 'BB' },
    ]

    liftAccountsStages.forEach(({ key, columnName }) => {
      const pendingCount = filteredLiftAccountData.filter(lift => !lift[key] || lift[key] === null || lift[key] === '').length
      pendingCounts.push({
        stageName: stageNames.liftAccounts[columnName],
        pendingCount: pendingCount,
        category: 'LIFT-ACCOUNTS'
      })
    })

    const accountsStages = [
      { key: 'actualAA', columnName: 'AA' },
      { key: 'actualAF', columnName: 'AF' },
      { key: 'actualAK', columnName: 'AK' },
      { key: 'actualAP', columnName: 'AP' },
      { key: 'actualAU', columnName: 'AU' },
    ]

    accountsStages.forEach(({ key, columnName }) => {
      const pendingCount = allAccountsData.filter(account => !account[key] || account[key] === null || account[key] === '').length
      pendingCounts.push({
        stageName: stageNames.accounts[columnName],
        pendingCount: pendingCount,
        category: 'ACCOUNTS'
      })
    })

    return pendingCounts
  }, [filteredIndentPoData, filteredLiftAccountData, allAccountsData])

  // Overview Data
  const overviewData = useMemo(() => {
    const kpis = {
      totalPOs: 0,
      pendingPOs: 0,
      completedPOs: 0,
      totalPoQuantity: 0,
      totalPendingQuantity: 0,
      totalReceivedQuantity: 0,
    }

    const vendorQuantities = {}
    const materialQuantities = {}
    const poQuantityByStatus = { Completed: 0, Pending: 0 }
    const uniquePOsByRlNo = new Set()

    filteredIndentPoData.forEach((po) => {
      uniquePOsByRlNo.add(po.rlNo)
      const isPoPendingForKPI = !po.poTimestamp
      
      if (isPoPendingForKPI) {
        kpis.pendingPOs += 1
      } else {
        kpis.completedPOs += 1
      }

      const isMaterialLiftComplete = po.pendingQty === 0
      if (isMaterialLiftComplete) {
        poQuantityByStatus["Completed"] += po.poQty
      } else {
        poQuantityByStatus["Pending"] += po.poQty
      }

      kpis.totalPoQuantity += po.poQty
      kpis.totalPendingQuantity += po.pendingQty

      if (po.material && po.poQty) {
        materialQuantities[po.material] = (materialQuantities[po.material] || 0) + po.poQty
      }
      if (po.vendorName && po.poQty) {
        vendorQuantities[po.vendorName] = (vendorQuantities[po.vendorName] || 0) + po.poQty
      }
    })

    kpis.totalPOs = uniquePOsByRlNo.size

    filteredLiftAccountData.forEach((lift) => {
      kpis.totalReceivedQuantity += lift.receivedQty
    })

    const top10Materials = Object.entries(materialQuantities)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    const top10Vendors = Object.entries(vendorQuantities)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    const poQuantityByStatusData = [
      { name: "Completed", value: poQuantityByStatus["Completed"], fill: "#10B981" },
      { name: "Pending", value: poQuantityByStatus["Pending"], fill: "#F59E0B" }
    ].filter(item => item.value > 0)

    return {
      kpis,
      top10Materials,
      top10Vendors,
      poQuantityByStatusData,
    }
  }, [filteredIndentPoData, filteredLiftAccountData])

  // Purchase Tab Tables
  const purchaseTabTables = useMemo(() => {
    const pendingLift = filteredIndentPoData.filter((po) => po.materialLiftStatus === "Pending")
    const inTransit = filteredLiftAccountData.filter((lift) => !lift.receivedTimestamp)
    const received = filteredLiftAccountData.filter((lift) => lift.receivedTimestamp)

    return { pendingLift, inTransit, received }
  }, [filteredIndentPoData, filteredLiftAccountData])

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({ vendorName: "all", material: "all", status: "all", rlNo: "", firmName: "all" })
    setDateRange(undefined)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <Loader2 className="w-16 h-16 text-purple-600 animate-spin mx-auto" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-purple-200 rounded-full animate-ping mx-auto"></div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Loading Dashboard</h3>
            <p className="text-gray-600">Fetching your data from Google Sheets...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-2xl border-red-200">
          <CardContent className="text-center p-8 space-y-6">
            <div className="p-4 bg-red-100 rounded-full inline-block">
              <Archive className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Connection Failed</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{error}</p>
            <Button onClick={fetchData} className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50">
      <div className="container mx-auto p-4 sm:p-6 max-w-full">
        {/* Header */}
        <div className="mb-8">
          <Card className="border-0 shadow-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
            <CardHeader className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-3xl font-bold flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <LayoutDashboard className="h-8 w-8" />
                    </div>
                    Purchase Management Dashboard
                  </CardTitle>
                  <CardDescription className="text-purple-100 text-base">
                    Real-time insights into your purchase operations and material logistics
                    {user?.firmName && user.firmName.toLowerCase() !== "all" && (
                      <span className="ml-2 text-white font-semibold">• Filtered by: {user.firmName}</span>
                    )}
                  </CardDescription>
                </div>
                <Button 
                  onClick={fetchData} 
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm shadow-lg"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        {/* <Card className="mb-8 border-0 shadow-lg">
          <CardHeader className="p-6 border-b border-gray-100">
            <CardTitle className="text-xl flex items-center gap-2">
              <Filter className="h-5 w-5 text-purple-600" />
              Advanced Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-10 border-gray-200 hover:border-purple-300"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-purple-600" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM dd, y")
                        )
                      ) : (
                        <span>Select dates</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 shadow-xl" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Firm Name</Label>
                <Select value={filters.firmName} onValueChange={(v) => handleFilterChange("firmName", v)}>
                  <SelectTrigger className="h-10 border-gray-200 hover:border-purple-300">
                    <SelectValue placeholder="All Firms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Firms</SelectItem>
                    {firmOptions.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Vendor</Label>
                <Select value={filters.vendorName} onValueChange={(v) => handleFilterChange("vendorName", v)}>
                  <SelectTrigger className="h-10 border-gray-200 hover:border-purple-300">
                    <SelectValue placeholder="All Vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {vendorOptions.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Material</Label>
                <Select value={filters.material} onValueChange={(v) => handleFilterChange("material", v)}>
                  <SelectTrigger className="h-10 border-gray-200 hover:border-purple-300">
                    <SelectValue placeholder="All Materials" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Materials</SelectItem>
                    {materialOptions.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Status</Label>
                <Select value={filters.status} onValueChange={(v) => handleFilterChange("status", v)}>
                  <SelectTrigger className="h-10 border-gray-200 hover:border-purple-300">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Indent No.</Label>
                <Input
                  placeholder="Search..."
                  value={filters.rlNo}
                  onChange={(e) => handleFilterChange("rlNo", e.target.value)}
                  className="h-10 border-gray-200 hover:border-purple-300"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={clearFilters} 
                  variant="outline" 
                  className="flex-1 h-10 border-gray-200 hover:border-purple-300"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card> */}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto mb-8 bg-white border-0 shadow-lg rounded-2xl p-2 h-auto">
            <TabsTrigger 
              value="overview" 
              className="flex items-center justify-center gap-2 py-4 text-base font-semibold rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-xl transition-all duration-300"
            >
              <TrendingUp className="h-5 w-5" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="purchase" 
              className="flex items-center justify-center gap-2 py-4 text-base font-semibold rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-xl transition-all duration-300"
            >
              <List className="h-5 w-5" />
              Purchase Data
            </TabsTrigger>
            <TabsTrigger 
              value="pending" 
              className="flex items-center justify-center gap-2 py-4 text-base font-semibold rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-xl transition-all duration-300"
            >
              <AlertTriangle className="h-5 w-5" />
              Workflow
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard
                title="Total Purchase Orders"
                value={overviewData.kpis.totalPOs}
                icon={FileText}
                color="purple"
                description="Unique purchase orders"
              />
              <StatCard
                title="Pending Issuance"
                value={overviewData.kpis.pendingPOs}
                icon={Clock}
                color="amber"
                description="Awaiting PO generation"
              />
              <StatCard
                title="Issued & Finalized"
                value={overviewData.kpis.completedPOs}
                icon={CheckCircle}
                color="green"
                description="Successfully completed"
              />
            </div>

            {/* Quantity Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg">
                      <Package className="h-6 w-6 text-white" />
                    </div>
                    <Badge className="bg-purple-100 text-purple-700 font-semibold">Total</Badge>
                  </div>
                  <p className="text-sm font-semibold text-gray-600 mb-1">Total PO Quantity</p>
                  <p className="text-3xl font-bold text-gray-900">{overviewData.kpis.totalPoQuantity.toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-lg">
                      <Hourglass className="h-6 w-6 text-white" />
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 font-semibold">Pending</Badge>
                  </div>
                  <p className="text-sm font-semibold text-gray-600 mb-1">Pending Quantity</p>
                  <p className="text-3xl font-bold text-gray-900">{overviewData.kpis.totalPendingQuantity.toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg">
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    </div>
                    <Badge className="bg-green-100 text-green-700 font-semibold">Received</Badge>
                  </div>
                  <p className="text-sm font-semibold text-gray-600 mb-1">Received Quantity</p>
                  <p className="text-3xl font-bold text-gray-900">{overviewData.kpis.totalReceivedQuantity.toLocaleString()}</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* PO Status Chart */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="p-6 border-b border-gray-100">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <PieChart className="h-6 w-6 text-purple-600" />
                    Material Lift Status Distribution
                  </CardTitle>
                  <CardDescription>PO quantity breakdown by completion status</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Tooltip content={<CustomTooltip />} />
                        <Pie
                          data={overviewData.poQuantityByStatusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          innerRadius={60}
                          paddingAngle={5}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                          labelLine={false}
                        >
                          {overviewData.poQuantityByStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} stroke="white" strokeWidth={3} />
                          ))}
                        </Pie>
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          iconType="circle"
                          wrapperStyle={{ paddingTop: "20px" }}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Vendors Chart */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="p-6 border-b border-gray-100">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                    Top 10 Vendors by Quantity
                  </CardTitle>
                  <CardDescription>Vendors ranked by total order quantity</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={overviewData.top10Vendors}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" stroke="#64748b" />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          width={100}
                          tick={{ fontSize: 12, fill: "#64748b" }}
                          stroke="#64748b"
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(139, 92, 246, 0.1)" }} />
                        <Bar 
                          dataKey="quantity" 
                          fill="url(#colorGradient)"
                          radius={[0, 8, 8, 0]}
                        />
                        <defs>
                          <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#8B5CF6" />
                            <stop offset="100%" stopColor="#6366F1" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Materials Chart */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="p-6 border-b border-gray-100">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Activity className="h-6 w-6 text-purple-600" />
                  Top 10 Materials by Quantity
                </CardTitle>
                <CardDescription>Most ordered materials ranked by quantity</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overviewData.top10Materials}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        stroke="#64748b"
                      />
                      <YAxis stroke="#64748b" tick={{ fill: "#64748b" }} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(139, 92, 246, 0.1)" }} />
                      <Bar 
                        dataKey="quantity" 
                        fill="url(#materialGradient)"
                        radius={[8, 8, 0, 0]}
                      />
                      <defs>
                        <linearGradient id="materialGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8B5CF6" />
                          <stop offset="100%" stopColor="#6366F1" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchase Tab */}
          <TabsContent value="purchase" className="space-y-6">
            <Tabs value={purchaseSubTab} onValueChange={setPurchaseSubTab}>
              <TabsList className="grid w-full grid-cols-3 max-w-xl mx-auto mb-6 bg-white border-0 shadow-lg rounded-2xl p-2 h-auto">
                <TabsTrigger 
                  value="pending-lift"
                  className="flex items-center justify-center gap-2 py-3 text-base font-semibold rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                >
                  <Hourglass className="h-5 w-5" />
                  Pending
                </TabsTrigger>
                <TabsTrigger 
                  value="in-transit"
                  className="flex items-center justify-center gap-2 py-3 text-base font-semibold rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                >
                  <Truck className="h-5 w-5" />
                  In-Transit
                </TabsTrigger>
                <TabsTrigger 
                  value="received"
                  className="flex items-center justify-center gap-2 py-3 text-base font-semibold rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Received
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending-lift">
                <Card className="border-0 shadow-lg">
                  <CardHeader className="p-6 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Hourglass className="h-6 w-6 text-amber-600" />
                      Purchase Orders Pending Lift
                      <Badge className="ml-2 bg-amber-500 text-white">{purchaseTabTables.pendingLift.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
                            <TableHead className="font-bold text-gray-700">Indent No.</TableHead>
                            <TableHead className="font-bold text-gray-700">PO Date</TableHead>
                            <TableHead className="font-bold text-gray-700">Firm</TableHead>
                            <TableHead className="font-bold text-gray-700">Vendor</TableHead>
                            <TableHead className="font-bold text-gray-700">Material</TableHead>
                            <TableHead className="text-right font-bold text-gray-700">PO Qty</TableHead>
                            <TableHead className="text-right font-bold text-gray-700">Pending</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchaseTabTables.pendingLift.length > 0 ? (
                            purchaseTabTables.pendingLift.map((po) => (
                              <TableRow key={po.id} className="hover:bg-amber-50/50 border-b border-gray-100">
                                <TableCell className="font-semibold text-purple-600">{po.rlNo}</TableCell>
                                <TableCell className="text-gray-700">{po.date ? format(po.date, "dd-MMM-yyyy") : "N/A"}</TableCell>
                                <TableCell className="text-gray-700">{po.firmName || "N/A"}</TableCell>
                                <TableCell className="text-gray-700">{po.vendorName}</TableCell>
                                <TableCell className="max-w-xs truncate text-gray-700">{po.material}</TableCell>
                                <TableCell className="text-right font-semibold text-gray-900">{po.poQty.toLocaleString()}</TableCell>
                                <TableCell className="text-right">
                                  <Badge className="bg-amber-100 text-amber-700 font-semibold">
                                    {po.pendingQty.toLocaleString()}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center h-32 text-gray-500">
                                <Package className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                <p className="font-medium">No pending purchase orders</p>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="in-transit">
                <Card className="border-0 shadow-lg">
                  <CardHeader className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Truck className="h-6 w-6 text-blue-600" />
                      Materials In-Transit
                      <Badge className="ml-2 bg-blue-500 text-white">{purchaseTabTables.inTransit.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
                            <TableHead className="font-bold text-gray-700">Indent No.</TableHead>
                            <TableHead className="font-bold text-gray-700">Delivery Order</TableHead>
                            <TableHead className="font-bold text-gray-700">Firm</TableHead>
                            <TableHead className="font-bold text-gray-700">Vendor</TableHead>
                            <TableHead className="font-bold text-gray-700">Material</TableHead>
                            <TableHead className="text-right font-bold text-gray-700">Lifted Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchaseTabTables.inTransit.length > 0 ? (
                            purchaseTabTables.inTransit.map((lift) => (
                              <TableRow key={lift.id} className="hover:bg-blue-50/50 border-b border-gray-100">
                                <TableCell className="font-semibold text-purple-600">{lift.rlNo}</TableCell>
                                <TableCell className="text-gray-700">{lift.deliveryOrderNo || "N/A"}</TableCell>
                                <TableCell className="text-gray-700">{lift.firmName || "N/A"}</TableCell>
                                <TableCell className="text-gray-700">{lift.vendorName}</TableCell>
                                <TableCell className="max-w-xs truncate text-gray-700">{lift.material}</TableCell>
                                <TableCell className="text-right font-semibold text-gray-900">{lift.liftedQty.toLocaleString()}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center h-32 text-gray-500">
                                <Truck className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                <p className="font-medium">No materials in transit</p>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="received">
                <Card className="border-0 shadow-lg">
                  <CardHeader className="p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                      Received Materials
                      <Badge className="ml-2 bg-green-500 text-white">{purchaseTabTables.received.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
                            <TableHead className="font-bold text-gray-700">Indent No.</TableHead>
                            <TableHead className="font-bold text-gray-700">Firm</TableHead>
                            <TableHead className="font-bold text-gray-700">Vendor</TableHead>
                            <TableHead className="font-bold text-gray-700">Material</TableHead>
                            <TableHead className="font-bold text-gray-700">Notes</TableHead>
                            <TableHead className="text-right font-bold text-gray-700">Lifted Qty</TableHead>
                            <TableHead className="text-right font-bold text-gray-700">Received Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchaseTabTables.received.length > 0 ? (
                            purchaseTabTables.received.map((lift) => (
                              <TableRow key={lift.id} className="hover:bg-green-50/50 border-b border-gray-100">
                                <TableCell className="font-semibold text-purple-600">{lift.rlNo}</TableCell>
                                <TableCell className="text-gray-700">{lift.firmName || "N/A"}</TableCell>
                                <TableCell className="text-gray-700">{lift.vendorName}</TableCell>
                                <TableCell className="max-w-xs truncate text-gray-700">{lift.material}</TableCell>
                                <TableCell className="max-w-xs truncate text-gray-700">{lift.notes || "N/A"}</TableCell>
                                <TableCell className="text-right font-semibold text-gray-900">{lift.liftedQty.toLocaleString()}</TableCell>
                                <TableCell className="text-right">
                                  <Badge className="bg-green-100 text-green-700 font-semibold">
                                    {lift.receivedQty.toLocaleString()}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center h-32 text-gray-500">
                                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                <p className="font-medium">No received materials</p>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Pending/Workflow Tab */}
          <TabsContent value="pending" className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <StatCard
                title="INDENT-PO Pending"
                value={pendingStagesData.slice(0, 4).reduce((sum, stage) => sum + stage.pendingCount, 0)}
                icon={FileText}
                color="purple"
                description="4 workflow stages"
              />
              <StatCard
                title="LIFT-ACCOUNTS Pending"
                value={pendingStagesData.slice(4, 8).reduce((sum, stage) => sum + stage.pendingCount, 0)}
                icon={Truck}
                color="blue"
                description="4 workflow stages"
              />
              <StatCard
                title="ACCOUNTS Pending"
                value={pendingStagesData.slice(8).reduce((sum, stage) => sum + stage.pendingCount, 0)}
                icon={CheckCircle}
                color="green"
                description="5 workflow stages"
              />
            </div>

            {/* Workflow Visualization */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="p-6 border-b border-gray-100">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Activity className="h-6 w-6 text-purple-600" />
                  Workflow Stage Analysis
                </CardTitle>
                <CardDescription>Visual breakdown of pending items across all workflow stages</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pendingStagesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="stageName" 
                        angle={-45}
                        textAnchor="end"
                        height={150}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        stroke="#64748b"
                      />
                      <YAxis stroke="#64748b" tick={{ fill: "#64748b" }} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(139, 92, 246, 0.1)" }} />
                      <Bar 
                        dataKey="pendingCount" 
                        fill="url(#pendingGradient)"
                        radius={[8, 8, 0, 0]}
                        name="Pending Count"
                      />
                      <defs>
                        <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F59E0B" />
                          <stop offset="100%" stopColor="#EF4444" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Stage Table */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="p-6 border-b border-gray-100">
                <CardTitle className="text-xl flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                  Detailed Pending Stages Overview
                  <Badge className="ml-2 bg-amber-500 text-white">
                    {pendingStagesData.reduce((sum, stage) => sum + stage.pendingCount, 0)} Total
                  </Badge>
                </CardTitle>
                <CardDescription>Comprehensive list of all workflow stages with pending counts</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
                        <TableHead className="font-bold text-gray-700">Category</TableHead>
                        <TableHead className="font-bold text-gray-700">Stage Name</TableHead>
                        <TableHead className="text-right font-bold text-gray-700">Pending Count</TableHead>
                        <TableHead className="text-right font-bold text-gray-700">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingStagesData.map((stage, index) => (
                        <TableRow key={index} className="hover:bg-amber-50/30 border-b border-gray-100">
                          <TableCell>
                            <Badge 
                              className={`font-semibold ${
                                stage.category === 'INDENT-PO' 
                                  ? 'bg-purple-100 text-purple-700' 
                                  : stage.category === 'LIFT-ACCOUNTS'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {stage.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-gray-900">{stage.stageName}</TableCell>
                          <TableCell className="text-right">
                            <span className="text-2xl font-bold text-gray-900">{stage.pendingCount}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge 
                              className={`font-semibold ${
                                stage.pendingCount === 0 
                                  ? 'bg-green-100 text-green-700' 
                                  : stage.pendingCount < 10
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {stage.pendingCount === 0 ? 'Clear' : stage.pendingCount < 10 ? 'Low' : 'High'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* INDENT-PO */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                  <CardTitle className="text-lg font-bold text-purple-700">INDENT-PO Stages</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Tooltip content={<CustomTooltip />} />
                        <Pie
                          data={pendingStagesData.slice(0, 4).map((s, i) => ({ ...s, fill: PIE_COLORS[i] }))}
                          dataKey="pendingCount"
                          nameKey="stageName"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={({ pendingCount }) => pendingCount > 0 ? pendingCount : ''}
                        >
                          {pendingStagesData.slice(0, 4).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} stroke="white" strokeWidth={2} />
                          ))}
                        </Pie>
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* LIFT-ACCOUNTS */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
                  <CardTitle className="text-lg font-bold text-blue-700">LIFT-ACCOUNTS Stages</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Tooltip content={<CustomTooltip />} />
                        <Pie
                          data={pendingStagesData.slice(4, 8).map((s, i) => ({ ...s, fill: PIE_COLORS[i] }))}
                          dataKey="pendingCount"
                          nameKey="stageName"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={({ pendingCount }) => pendingCount > 0 ? pendingCount : ''}
                        >
                          {pendingStagesData.slice(4, 8).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} stroke="white" strokeWidth={2} />
                          ))}
                        </Pie>
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* ACCOUNTS */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="p-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardTitle className="text-lg font-bold text-green-700">ACCOUNTS Stages</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Tooltip content={<CustomTooltip />} />
                        <Pie
                          data={pendingStagesData.slice(8).map((s, i) => ({ ...s, fill: PIE_COLORS[i] }))}
                          dataKey="pendingCount"
                          nameKey="stageName"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={({ pendingCount }) => pendingCount > 0 ? pendingCount : ''}
                        >
                          {pendingStagesData.slice(8).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} stroke="white" strokeWidth={2} />
                          ))}
                        </Pie>
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}