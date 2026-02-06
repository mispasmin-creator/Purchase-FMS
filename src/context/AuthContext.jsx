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
      const stepsString = (userRecord["Pages"] || "").trim()
      const userRoles = stepsString.toLowerCase() === "all"
        ? ["admin"]
        : stepsString.split(",").map((step) => step.trim().toLowerCase()).filter(Boolean)

      const userFirm = (userRecord["Firm Name"] || "").trim()

      const currentUserData = JSON.parse(localStorage.getItem("user") || "{}")
      const updatedUserData = { ...currentUserData, firmName: userFirm }
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
        const stepsString = (userRecord["Pages"] || "").trim()
        const userFoundRoles = stepsString.toLowerCase() === "all"
          ? ["admin"]
          : stepsString.split(",").map((step) => step.trim().toLowerCase()).filter(Boolean)

        const userFoundFirm = (userRecord["Firm Name"] || "").trim()

        // Save to localStorage
        const userData = { username, firmName: userFoundFirm }
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

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, allowedSteps, login, logout, isLoading }}>
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