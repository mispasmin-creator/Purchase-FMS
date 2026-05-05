"use client"
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const { login } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters.";
    }
    if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const success = await login(formData.username, formData.password);
      // Note: login() handles toast messages and page reload on success
      // On failure, it will show toast error and we just stop loading
      if (!success) {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Login submission error:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-none overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#7da23a] to-[#6b8e2f] text-white p-6 rounded-t-lg">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center p-2 shadow-sm">
              <img src="/passary.jpeg" alt="Logo" className="w-full h-full object-contain mix-blend-multiply" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl font-bold text-white">Purchase Management System</CardTitle>
          <CardDescription className="text-center text-green-100">Enter your credentials to access the system</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</Label>
              <Input
                type="text"
                id="username"
                name="username"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
                disabled={isLoading}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors.username ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-[#6b8e2f] focus:ring-[#6b8e2f]"
                  }`}
                aria-invalid={!!errors.username}
                aria-describedby={errors.username ? "username-error" : undefined}
              />
              {errors.username && <p id="username-error" className="text-red-500 text-xs mt-1">{errors.username}</p>}
            </div>
            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</Label>
              <Input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors.password ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-[#6b8e2f] focus:ring-[#6b8e2f]"
                  }`}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              {errors.password && <p id="password-error" className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>
            <Button
              type="submit"
              className="w-full py-2.5 px-6 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-[#7da23a] hover:bg-[#6b8e2f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6b8e2f]"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </span>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
