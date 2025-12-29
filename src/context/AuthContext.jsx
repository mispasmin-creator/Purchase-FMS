"use client"
import { createContext, useContext, useState, useEffect } from "react"
import { toast } from "sonner"

// Create and export the AuthContext
export const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [allowedSteps, setAllowedSteps] = useState([])

  // --- HARDCODED GOOGLE SHEET CONFIGURATION ---
  const SHEET_ID = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ"
  const SHEET_NAME = "Login"
  // --- END HARDCODED CONFIG ---

  // --- FIXED COLUMN INDICES (0-indexed) ---
  const USERNAME_COL_INDEX = 0 // Column A: User Name
  const PASSWORD_COL_INDEX = 1 // Column B: Password
  const STEPS_COL_INDEX = 2 // Column C: Steps
  const FIRM_NAME_COL_INDEX = 3 // Column D: Firm Name
  // --- END FIXED COLUMN INDICES ---

  useEffect(() => {
    const initializeAuth = async () => {
      const authStatus = localStorage.getItem("isAuthenticated")
      const userData = localStorage.getItem("user")
      const userSteps = localStorage.getItem("allowedSteps")

      if (authStatus === "true" && userData) {
        const parsedUser = JSON.parse(userData)
        setIsAuthenticated(true)
        setUser(parsedUser)

        if (userSteps) {
          const parsedUserSteps = JSON.parse(userSteps)
          setAllowedSteps(parsedUserSteps)
          console.log("AuthContext: Initialized with allowedSteps from localStorage:", parsedUserSteps)
        } else {
          console.log("AuthContext: allowedSteps not in localStorage, fetching roles for:", parsedUser.username)
          await fetchUserRoles(parsedUser.username)
        }
      }
      setIsLoading(false)
    }

    initializeAuth()
  }, [])

  const fetchUserRoles = async (username) => {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}&headers=1`
      console.log("Fetching user roles from URL:", url)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch user roles: ${response.status} ${response.statusText}`)
      }

      let text = await response.text()
      const jsonpStart = "google.visualization.Query.setResponse("
      if (text.startsWith(jsonpStart)) {
        text = text.substring(jsonpStart.length, text.length - 2)
      } else {
        const jsonStartIndex = text.indexOf("{")
        const jsonEndIndex = text.lastIndexOf("}")
        if (jsonStartIndex === -1 || jsonEndIndex === -1 || jsonEndIndex <= jsonStartIndex) {
          throw new Error("Invalid response format from Google Sheets for user roles.")
        }
        text = text.substring(jsonStartIndex, jsonEndIndex + 1)
      }

      const data = JSON.parse(text)

      if (data.status === "error" || !data.table || !data.table.rows) {
        setAllowedSteps([])
        localStorage.setItem("allowedSteps", JSON.stringify([]))
        localStorage.removeItem("user")
        setUser(null)
        return []
      }

      let userRoles = []
      let userFirm = null
      let userFound = false

      data.table.rows.forEach((row) => {
        if (userFound) return

        const rowUsername = row.c[USERNAME_COL_INDEX]?.v
        const rowStepsCellValue = row.c[STEPS_COL_INDEX]?.v
        const rowFirmName = row.c[FIRM_NAME_COL_INDEX]?.v

        if (rowUsername && rowUsername.toLowerCase() === username.toLowerCase()) {
          const stepsString = (rowStepsCellValue || "").trim()
          userRoles = stepsString.toLowerCase() === "all"
            ? ["admin"]
            : stepsString.split(",").map((step) => step.trim().toLowerCase()).filter(Boolean)

          userFirm = (rowFirmName || "").trim()
          userFound = true
        }
      })

      const currentUserData = JSON.parse(localStorage.getItem("user") || "{}")
      const updatedUserData = { ...currentUserData, firmName: userFirm }
      localStorage.setItem("user", JSON.stringify(updatedUserData))
      setUser(updatedUserData)
      localStorage.setItem("allowedSteps", JSON.stringify(userRoles))
      setAllowedSteps(userRoles)
      return userRoles
    } catch (error) {
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
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}&headers=1`
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch login data: ${response.status} ${response.statusText}`)
        }

        let text = await response.text()
        const jsonpStart = "google.visualization.Query.setResponse("
        if (text.startsWith(jsonpStart)) {
          text = text.substring(jsonpStart.length, text.length - 2)
        } else {
          const jsonStartIndex = text.indexOf("{")
          const jsonEndIndex = text.lastIndexOf("}")
          if (jsonStartIndex === -1 || jsonEndIndex === -1 || jsonEndIndex <= jsonStartIndex) {
            throw new Error("Invalid response format from Google Sheets for login.")
          }
          text = text.substring(jsonStartIndex, jsonEndIndex + 1)
        }

        const data = JSON.parse(text)

        if (data.status === "error" || !data.table || !data.table.rows) {
          toast.error("Login Failed", { description: "Could not retrieve login information." })
          resolve(false)
          return
        }

        let authenticated = false
        let userFoundRoles = []
        let userFoundFirm = null

        for (const row of data.table.rows) {
          const storedUsername = row.c[USERNAME_COL_INDEX]?.v
          const passwordCell = row.c[PASSWORD_COL_INDEX]
          const storedPassword = (passwordCell?.v !== null && passwordCell?.v !== undefined) ? passwordCell.v : passwordCell?.f;

          if (
            storedUsername &&
            storedUsername.toLowerCase() === username.toLowerCase() &&
            storedPassword &&
            storedPassword.toString() === password
          ) {
            authenticated = true
            const storedStepsCellValue = row.c[STEPS_COL_INDEX]?.v
            const storedFirmName = row.c[FIRM_NAME_COL_INDEX]?.v
            
            const stepsString = (storedStepsCellValue || "").trim()
            userFoundRoles = stepsString.toLowerCase() === "all" 
              ? ["admin"] 
              : stepsString.split(",").map(step => step.trim().toLowerCase()).filter(Boolean);

            userFoundFirm = (storedFirmName || "").trim()
            break
          }
        }

        if (authenticated) {
          const userData = { username, firmName: userFoundFirm }
          localStorage.setItem("isAuthenticated", "true")
          localStorage.setItem("user", JSON.stringify(userData))
          localStorage.setItem("allowedSteps", JSON.stringify(userFoundRoles))

          setUser(userData)
          setIsAuthenticated(true)
          setAllowedSteps(userFoundRoles)

          toast.success("Login Successful", { description: "Welcome to the Purchase Management System." })
          resolve(true)
          window.location.reload()
        } else {
          toast.error("Login Failed", { description: "Invalid username or password. Please try again." })
          resolve(false)
        }
      } catch (error) {
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
    window.location.reload()
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