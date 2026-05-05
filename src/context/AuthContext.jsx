"use client"
import { createContext, useContext, useState, useEffect } from "react"
import { toast } from "sonner"
import { supabase } from "../supabase"

// Create and export the AuthContext
export const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [allowedSteps, setAllowedSteps] = useState([])

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
      const rawPages = userRecord["Pages"];

      if (typeof rawPages === "string" && rawPages.trim().toLowerCase() === "viewonly") {
        userRoles = ["admin"];
        isReadOnly = true;
      } else if (Array.isArray(rawPages)) {
        userRoles = rawPages.map(p => p.trim().toLowerCase()).filter(Boolean);
      } else if (typeof rawPages === "string") {
        const stepsString = rawPages.trim();
        if (stepsString.toLowerCase() === "all" || stepsString.toLowerCase() === "admin") {
          userRoles = ["admin"];
        } else {
          try {
            const parsed = JSON.parse(stepsString);
            if (Array.isArray(parsed)) {
              userRoles = parsed.map(p => p.trim().toLowerCase()).filter(Boolean);
            } else {
              throw new Error("Not an array");
            }
          } catch (e) {
            // Fallback to CSV for old records
            userRoles = stepsString.split(",").map((step) => step.trim().toLowerCase()).filter(Boolean);
          }
        }
      }


      const rawFirm = (userRecord["Firm Name"] || "").trim()
      let userFirm = rawFirm
      
      // Parse multi-firm access if not "all"
      if (rawFirm.toLowerCase() !== "all" && rawFirm !== "") {
        try {
          const parsed = JSON.parse(rawFirm)
          if (Array.isArray(parsed)) {
            userFirm = parsed
          }
        } catch (e) {
          // Fallback for CSV for old records
          if (rawFirm.includes(",")) {
            userFirm = rawFirm.split(",").map((f) => f.trim()).filter(Boolean)
          }
        }
      }

      const currentUserData = JSON.parse(localStorage.getItem("user") || "{}")
      const updatedUserData = { ...currentUserData, firmName: userFirm, isReadOnly }
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

  const login = async (username, password) => {
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
        const rawFoundPages = userRecord["Pages"];

        if (typeof rawFoundPages === "string" && rawFoundPages.trim().toLowerCase() === "viewonly") {
          userFoundRoles = ["admin"];
          userIsReadOnly = true;
        } else if (Array.isArray(rawFoundPages)) {
          userFoundRoles = rawFoundPages.map(p => p.trim().toLowerCase()).filter(Boolean);
        } else if (typeof rawFoundPages === "string") {
          const stepsString = rawFoundPages.trim();
          if (stepsString.toLowerCase() === "all") {
            userFoundRoles = ["admin"];
          } else {
            try {
              const parsed = JSON.parse(stepsString);
              if (Array.isArray(parsed)) {
                userFoundRoles = parsed.map(p => p.trim().toLowerCase()).filter(Boolean);
              } else {
                throw new Error("Not an array");
              }
            } catch (e) {
              // Fallback for CSV
              userFoundRoles = stepsString.split(",").map((step) => step.trim().toLowerCase()).filter(Boolean);
            }
          }
        }


        const rawFoundFirm = (userRecord["Firm Name"] || "").trim()
        let userFoundFirm = rawFoundFirm

        // Parse multi-firm access if not "all"
        if (rawFoundFirm.toLowerCase() !== "all" && rawFoundFirm !== "") {
          try {
            const parsed = JSON.parse(rawFoundFirm)
            if (Array.isArray(parsed)) {
              userFoundFirm = parsed
            }
          } catch (e) {
            // Fallback for CSV for old records
            if (rawFoundFirm.includes(",")) {
              userFoundFirm = rawFoundFirm.split(",").map((f) => f.trim()).filter(Boolean)
            }
          }
        }

        // Save to localStorage
        const userData = { username, firmName: userFoundFirm, isReadOnly: userIsReadOnly }
        localStorage.setItem("isAuthenticated", "true")
        localStorage.setItem("user", JSON.stringify(userData))
        localStorage.setItem("allowedSteps", JSON.stringify(userFoundRoles))

        setUser(userData)
        setIsAuthenticated(true)
        setAllowedSteps(userFoundRoles)

        console.log("Login successful for:", username, "Roles:", userFoundRoles)
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

  const isReadOnly = !!(user?.isReadOnly)

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, allowedSteps, login, logout, isLoading, isReadOnly }}>
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