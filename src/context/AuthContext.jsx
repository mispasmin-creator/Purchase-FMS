"use client"
import { createContext, useContext, useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { useLocation } from "react-router-dom"
import { supabase } from "../supabase"

// Create and export the AuthContext
export const AuthContext = createContext(undefined)

// Mapping from route pathname to the page name in ALL_PAGES
const PATH_TO_PAGE_MAP = {
  "/dashboard": "Dashboard",
  "/": "Dashboard",
  "/indent": "Indent",
  "/stock-approval": "HOD Approval",
  "/three-party": "Three Party",
  "/factory-approval": "Factory App.",
  "/management-approval": "Mgmt App.",
  "/make-po": "Make PO",
  "/po-history": "PO History",
  "/arrange-logistics": "Arrange Logistics",
  "/logistics-approval": "Logistics App.",
  "/po-entry": "PO Entry",
  "/advance-payement": "Advance Payement",
  "/lift": "Lift",
  "/receipt": "Receipt",
  "/management-unload": "Unload App.",
  "/lab": "Lab",
  "/lab-report": "Lab Report",
  "/bilty": "Bilty",
  "/mismatch": "Mismatch",
  "/purchaser-coordinate": "Purchaser Coord.",
  "/debit-note": "Debit Note",
  "/accounts-audit": "Accounts Audit",
  "/fullkitting": "Fullkitting",
  "/sale-of-raw-material": "Sale Of Raw Material",
  "/rectify-mistake": "Rectify Mistake",
  "/final-tally-entry": "Final Tally Entry",
  "/rectify-mistake-2": "Rectify Mistake 2",
  "/take-entry-tally": "Take Entry Tally",
  "/again-auditing": "Again Auditing",
  "/tolrance": "Tolerance",
  "/kyc": "KYC",
  "/vendor-payment": "Vendor Payment",
  "/purchase-return": "Purchase Return",
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [allowedSteps, setAllowedSteps] = useState([])
  const location = useLocation()

  // Using Supabase Login table for authentication

  useEffect(() => {
    const initializeAuth = async () => {
      const authStatus = localStorage.getItem("isAuthenticated")
      const userData = localStorage.getItem("user")

      if (authStatus === "true" && userData) {
        const parsedUser = JSON.parse(userData)
        setIsAuthenticated(true)
        setUser(parsedUser)

        // Always fetch fresh roles from Supabase on page load
        console.log("AuthContext: Fetching fresh roles from Supabase for:", parsedUser.username)
        await fetchUserRoles(parsedUser.username)
      }
      setIsLoading(false)
    }

    initializeAuth()
  }, [])

  const fetchUserRoles = async (username) => {
    try {
      console.log("Fetching user roles from Supabase for:", username)

      // Query Supabase Login table
      const { data, error } = await supabase
        .from("Login")
        .select("*")
        .ilike("User Name", username)

      if (error) throw error

      if (!data || data.length === 0) {
        console.warn("No user found in Supabase Login table")
        setAllowedSteps([])
        localStorage.setItem("allowedSteps", JSON.stringify([]))
        localStorage.removeItem("user")
        setUser(null)
        return []
      }

      const userRecord = data[0]
      let userRoles = [];
      let isReadOnly = false;
      let isSuperAdminFlag = false;
      let pageFirms = null;
      const rawPages = userRecord["Pages"];

      if (typeof rawPages === "string" && rawPages.trim().toLowerCase() === "viewonly") {
        userRoles = ["admin"];
        isReadOnly = true;
      } else if (typeof rawPages === "string" && rawPages.trim().toLowerCase() === "super admin") {
        userRoles = ["admin"];
        isSuperAdminFlag = true;
      } else if (Array.isArray(rawPages)) {
        userRoles = rawPages.map(p => typeof p === "string" ? p.trim().toLowerCase() : String(p || "").trim().toLowerCase()).filter(Boolean);
      } else if (typeof rawPages === "string") {
        const stepsString = rawPages.trim();
        if (stepsString.toLowerCase() === "all" || stepsString.toLowerCase() === "admin") {
          userRoles = ["admin"];
        } else {
          try {
            const parsed = JSON.parse(stepsString);
            if (Array.isArray(parsed)) {
              userRoles = parsed.map(p => typeof p === "string" ? p.trim().toLowerCase() : String(p || "").trim().toLowerCase()).filter(Boolean);
            } else if (parsed && typeof parsed === "object") {
              pageFirms = parsed;
              userRoles = Object.keys(parsed).map(p => p.trim().toLowerCase()).filter(Boolean);
            } else {
              throw new Error("Invalid page format");
            }
          } catch (e) {
            // Fallback to CSV for old records
            userRoles = stepsString.split(",").map((step) => step.trim().toLowerCase()).filter(Boolean);
          }
        }
      }

      let userFirm = userRecord["Firm Name"]
      if (Array.isArray(userFirm)) {
        // Already an array
      } else if (typeof userFirm === "string") {
        const trimmed = userFirm.trim()
        if (trimmed.toLowerCase() === "all") {
          userFirm = "all"
        } else {
          try {
            const parsed = JSON.parse(trimmed)
            if (Array.isArray(parsed)) {
              userFirm = parsed
            } else {
              userFirm = trimmed
            }
          } catch (e) {
            if (trimmed.includes(",")) {
              userFirm = trimmed.split(",").map((f) => f.trim()).filter(Boolean)
            } else {
              userFirm = trimmed
            }
          }
        }
      } else {
        userFirm = ""
      }

      const currentUserData = JSON.parse(localStorage.getItem("user") || "{}")
      const updatedUserData = { 
        ...currentUserData, 
        firmName: userFirm, 
        globalFirms: userFirm,
        pageFirms,
        isReadOnly, 
        isSuperAdmin: isSuperAdminFlag 
      }
      localStorage.setItem("user", JSON.stringify(updatedUserData))
      setUser(updatedUserData)
      localStorage.setItem("allowedSteps", JSON.stringify(userRoles))
      setAllowedSteps(userRoles)

      console.log("User roles loaded:", userRoles)
      return userRoles
    } catch (error) {
      console.error("Error fetching user roles:", error)
      toast.error("Role Fetch Error", { description: `Failed to load user roles: ${error.message}` })
      setAllowedSteps([])
      localStorage.setItem("allowedSteps", JSON.stringify([]))
      localStorage.removeItem("user")
      setUser(null)
      return []
    }
  }

  const login = async (username, password, expectSuperAdmin = false) => {
    return new Promise(async (resolve) => {
      try {
        console.log("Attempting login for user:", username)

        // Query Supabase Login table
        const { data, error } = await supabase
          .from("Login")
          .select("*")
          .ilike("User Name", username)

        if (error) throw error

        if (!data || data.length === 0) {
          console.log("❌ User not found in database")
          toast.error("Login Failed", { description: "Invalid username or password. Please try again." })
          resolve(false)
          return
        }

        // Find matching user with correct password
        const userRecord = data.find(
          (record) => record["Password"] && record["Password"].toString() === password
        )

        if (!userRecord) {
          console.log("❌ Password mismatch")
          toast.error("Login Failed", { description: "Invalid username or password. Please try again." })
          resolve(false)
          return
        }

        // Extract user data
        let userFoundRoles = [];
        let userIsReadOnly = false;
        let userIsSuperAdmin = false;
        let pageFirms = null;
        const rawFoundPages = userRecord["Pages"];

        if (typeof rawFoundPages === "string" && rawFoundPages.trim().toLowerCase() === "viewonly") {
          userFoundRoles = ["admin"];
          userIsReadOnly = true;
        } else if (typeof rawFoundPages === "string" && rawFoundPages.trim().toLowerCase() === "super admin") {
          userFoundRoles = ["admin"];
          userIsSuperAdmin = true;
        } else if (Array.isArray(rawFoundPages)) {
          userFoundRoles = rawFoundPages.map(p => typeof p === "string" ? p.trim().toLowerCase() : String(p || "").trim().toLowerCase()).filter(Boolean);
        } else if (typeof rawFoundPages === "string") {
          const stepsString = rawFoundPages.trim();
          if (stepsString.toLowerCase() === "all") {
            userFoundRoles = ["admin"];
          } else {
            try {
              const parsed = JSON.parse(stepsString);
              if (Array.isArray(parsed)) {
                userFoundRoles = parsed.map(p => typeof p === "string" ? p.trim().toLowerCase() : String(p || "").trim().toLowerCase()).filter(Boolean);
              } else if (parsed && typeof parsed === "object") {
                pageFirms = parsed;
                userFoundRoles = Object.keys(parsed).map(p => p.trim().toLowerCase()).filter(Boolean);
              } else {
                throw new Error("Invalid page format");
              }
            } catch (e) {
              // Fallback for CSV
              userFoundRoles = stepsString.split(",").map((step) => step.trim().toLowerCase()).filter(Boolean);
            }
          }
        }

        // Validate Super Admin role if expected
        if (expectSuperAdmin && !userIsSuperAdmin) {
          toast.error("Login Failed", { description: "Is account mein Super Admin access nahi hai." })
          resolve(false)
          return
        }

        let userFoundFirm = userRecord["Firm Name"]
        if (Array.isArray(userFoundFirm)) {
          // Already an array
        } else if (typeof userFoundFirm === "string") {
          const trimmed = userFoundFirm.trim()
          if (trimmed.toLowerCase() === "all") {
            userFoundFirm = "all"
          } else {
            try {
              const parsed = JSON.parse(trimmed)
              if (Array.isArray(parsed)) {
                userFoundFirm = parsed
              } else {
                userFoundFirm = trimmed
              }
            } catch (e) {
              if (trimmed.includes(",")) {
                userFoundFirm = trimmed.split(",").map((f) => f.trim()).filter(Boolean)
              } else {
                userFoundFirm = trimmed
              }
            }
          }
        } else {
          userFoundFirm = ""
        }

        // Save to localStorage
        const userData = { 
          username, 
          firmName: userFoundFirm, 
          globalFirms: userFoundFirm,
          pageFirms,
          isReadOnly: userIsReadOnly, 
          isSuperAdmin: userIsSuperAdmin 
        }
        localStorage.setItem("isAuthenticated", "true")
        localStorage.setItem("user", JSON.stringify(userData))
        localStorage.setItem("allowedSteps", JSON.stringify(userFoundRoles))

        setUser(userData)
        setIsAuthenticated(true)
        setAllowedSteps(userFoundRoles)

        console.log("Login successful for:", username, "Roles:", userFoundRoles, "SuperAdmin:", userIsSuperAdmin)
        toast.success("Login Successful", { description: "Welcome to the Purchase Management System." })
        resolve(true)

        // Delay reload to show toast message
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } catch (error) {
        console.error("Login error:", error)
        toast.error("Login Error", { description: `An error occurred during login: ${error.message}` })
        resolve(false)
      }
    })
  }

  const logout = () => {
    localStorage.removeItem("isAuthenticated")
    localStorage.removeItem("user")
    localStorage.removeItem("allowedSteps")
    setIsAuthenticated(false)
    setUser(null)
    setAllowedSteps([])
    toast.info("Logged Out", { description: "You have been successfully logged out." })

    // Delay reload to show toast message
    setTimeout(() => {
      window.location.reload()
    }, 800)
  }

  // Dynamically compute the active user with overriden active page firm permissions
  const activeUser = useMemo(() => {
    if (!user) return null

    const updatedUser = { ...user }

    if (user.pageFirms) {
      const pathname = location.pathname
      const pageName = PATH_TO_PAGE_MAP[pathname]
      if (pageName) {
        const pageFirmsList = user.pageFirms[pageName]
        if (pageFirmsList && Array.isArray(pageFirmsList)) {
          updatedUser.firmName = pageFirmsList
        } else {
          updatedUser.firmName = user.globalFirms || user.firmName
        }
      } else {
        updatedUser.firmName = user.globalFirms || user.firmName
      }
    }
    return updatedUser
  }, [user, location.pathname])

  const hasPageFirmAccess = (pageName, firmName) => {
    if (!user) return false
    
    // Admin / Super Admin has access to all firms
    if (user.isSuperAdmin || allowedSteps.includes("admin")) return true

    const normSearchFirm = String(firmName || "").toLowerCase().trim()

    if (user.pageFirms) {
      const pageFirmsList = user.pageFirms[pageName]
      if (pageFirmsList && Array.isArray(pageFirmsList)) {
        return pageFirmsList.map(f => String(f || "").toLowerCase().trim()).includes(normSearchFirm)
      }
    }

    const globalFirms = user.globalFirms || user.firmName
    if (!globalFirms) return false
    if (globalFirms === "all" || (Array.isArray(globalFirms) && globalFirms.map(f => String(f || "").toLowerCase().trim()).includes("all"))) {
      return true
    }
    if (Array.isArray(globalFirms)) {
      return globalFirms.map(f => String(f || "").toLowerCase().trim()).includes(normSearchFirm)
    }
    return String(globalFirms).toLowerCase().trim() === normSearchFirm
  }

  const isReadOnly = !!(user?.isReadOnly)
  const isSuperAdmin = !!(user?.isSuperAdmin)

  return (
    <AuthContext.Provider value={{ user: activeUser, isAuthenticated, allowedSteps, login, logout, isLoading, isReadOnly, isSuperAdmin, hasPageFirmAccess }}>
      {!isLoading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}