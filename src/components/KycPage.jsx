// src/components/KycPage.jsx
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { UserCheck, Loader2, CheckCircle, XCircle, Briefcase, Store, Truck, Info } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components for styling consistency
import { Badge } from "@/components/ui/badge"; // Import Badge for consistent styling

export default function KycPage() {
  const [activeForm, setActiveForm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [productFormData, setProductFormData] = useState({ productName: "" });
  const [transportationFormData, setTransportationFormData] = useState({ transporterName: "" });
  const [vendorFormData, setVendorFormData] = useState({
    vendorName: "",
    gstNumber: "",
    bankAcNo: "",
    ifscCode: "",
    phoneNumber: "",
    email: "",
  });

  const [errors, setErrors] = useState({});

  // Main constants for the application
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw9PLZyTtf2T-0BxX3Nqpn48o9Ou2_KGtDfZhLTpkfb_mFvJyXvm3dnF2M5GhDkJik/exec";
  const MASTER_SHEET_NAME = "Master";

  const handleFormChange = (formSetter) => (e) => {
    const { name, value } = e.target;
    formSetter(prev => ({ ...prev, [name]: value }));
    setErrors(prevErrors => ({ ...prevErrors, [name]: null }));
  };

  const validateForm = (formType, formData) => {
    const newErrors = {};
    switch (formType) {
      case 'product':
        if (!formData.productName.trim()) newErrors.productName = "Product Name is required.";
        break;
      case 'transportation':
        if (!formData.transporterName.trim()) newErrors.transporterName = "Transporter Name is required.";
        break;
      case 'vendor':
        if (!formData.vendorName.trim()) newErrors.vendorName = "Vendor Name is required.";
        if (!formData.bankAcNo.trim()) newErrors.bankAcNo = "Bank Account No. is required.";
        if (!formData.ifscCode.trim()) newErrors.ifscCode = "IFSC Code is required.";
        if (!formData.phoneNumber.trim()) {
            newErrors.phoneNumber = "Phone Number is required.";
        } else if (!/^\d+$/.test(formData.phoneNumber)) {
            newErrors.phoneNumber = "Phone Number must contain only digits.";
        }
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = "Invalid email format.";
        }
        break;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e, formType) => {
    e.preventDefault();
    let currentFormData, formSetter, resetState;

    switch (formType) {
      case 'product':
        currentFormData = productFormData;
        formSetter = setProductFormData;
        resetState = { productName: "" };
        break;
      case 'transportation':
        currentFormData = transportationFormData;
        formSetter = setTransportationFormData;
        resetState = { transporterName: "" };
        break;
      case 'vendor':
        currentFormData = vendorFormData;
        formSetter = setVendorFormData;
        resetState = { vendorName: "", gstNumber: "", bankAcNo: "", ifscCode: "", phoneNumber: "", email: "" };
        break;
      default:
        toast.error("Error", { description: "Unknown form type." });
        return;
    }

    if (!validateForm(formType, currentFormData)) {
      toast.error("Validation Error", { description: "Please fill all required fields correctly." });
      return;
    }
    setIsSubmitting(true);

    let rowData = Array(20).fill(""); // Covers columns A to T
    let successMessage = "";

    switch (formType) {
        case 'product':
            rowData[10] = "Product"; // Type Of KYC Form (Col K)
            rowData[17] = String(currentFormData.productName || ""); // Product Name (Col R)
            successMessage = `Product "${currentFormData.productName}" added to Master.`;
            break;
        case 'transportation':
            rowData[10] = "Transportation"; // Type Of KYC Form (Col K)
            rowData[18] = String(currentFormData.transporterName || ""); // Transporter Name (Col S)
            successMessage = `Transporter "${currentFormData.transporterName}" added to Master.`;
            break;
        case 'vendor':
            rowData[10] = "Vendor";                         // Type Of KYC Form (Col K)
            rowData[11] = String(currentFormData.vendorName || ""); // Vendor Name (Col L)
            rowData[12] = String(currentFormData.gstNumber || "");    // GST Number (Col M)
            rowData[13] = String(currentFormData.bankAcNo || "");     // Current Bank A/C No (Col N)
            rowData[14] = String(currentFormData.ifscCode || "");     // IFSC Code (Col O)
            rowData[15] = String(currentFormData.phoneNumber || "");  // Phone Number (Col P)
            rowData[16] = String(currentFormData.email || "");        // Email (Col Q)
            successMessage = `Vendor "${currentFormData.vendorName}" added to Master.`;
            break;
    }

    const formDataToSubmit = new FormData();
    formDataToSubmit.append("sheetName", MASTER_SHEET_NAME);
    formDataToSubmit.append("action", "insert");
    formDataToSubmit.append("rowData", JSON.stringify(rowData));

    try {
      const response = await fetch(SCRIPT_URL, { method: "POST", body: formDataToSubmit });
      if (!response.ok) throw new Error(`Server error: ${await response.text()}`);
      
      const result = await response.json();
      if (result.status !== "success" && !result.success) {
        throw new Error(result.message || "Apps Script reported an error.");
      }
      
      toast.success("Success!", { description: successMessage, icon: <CheckCircle className="h-4 w-4" /> });
      formSetter(resetState);
      setErrors({});
      setActiveForm(""); // Close the form after successful submission

    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Submission Failed", { description: error.message, icon: <XCircle className="h-4 w-4" /> });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProductForm = () => (
    <Card className="shadow-sm border border-border mt-6">
      <CardHeader className="py-3 px-4 bg-muted/30">
        <CardTitle className="flex items-center text-md font-semibold text-foreground">
            <Briefcase className="h-5 w-5 text-purple-600 mr-2"/> Add New Product
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <form onSubmit={(e) => handleSubmit(e, 'product')} className="space-y-4">
          <div>
            <Label htmlFor="productName" className="block text-sm font-medium text-gray-700">Product Name <span className="text-red-500">*</span></Label>
            <Input 
              id="productName" 
              name="productName" 
              value={productFormData.productName} 
              onChange={handleFormChange(setProductFormData)} 
              placeholder="Enter new product name" 
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors.productName ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}
            />
            {errors.productName && <p className="text-red-500 text-xs mt-1">{errors.productName}</p>}
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Product"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderTransportationForm = () => (
    <Card className="shadow-sm border border-border mt-6">
      <CardHeader className="py-3 px-4 bg-muted/30">
        <CardTitle className="flex items-center text-md font-semibold text-foreground">
            <Truck className="h-5 w-5 text-purple-600 mr-2"/> Add New Transporter
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <form onSubmit={(e) => handleSubmit(e, 'transportation')} className="space-y-4">
          <div>
            <Label htmlFor="transporterName" className="block text-sm font-medium text-gray-700">Transporter Name <span className="text-red-500">*</span></Label>
            <Input 
              id="transporterName" 
              name="transporterName" 
              value={transportationFormData.transporterName} 
              onChange={handleFormChange(setTransportationFormData)} 
              placeholder="Enter new transporter name" 
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors.transporterName ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}
            />
            {errors.transporterName && <p className="text-red-500 text-xs mt-1">{errors.transporterName}</p>}
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Transporter"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderVendorForm = () => (
    <Card className="shadow-sm border border-border mt-6">
      <CardHeader className="py-3 px-4 bg-muted/30">
        <CardTitle className="flex items-center text-md font-semibold text-foreground">
            <Store className="h-5 w-5 text-purple-600 mr-2"/> Add New Vendor
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <form onSubmit={(e) => handleSubmit(e, 'vendor')} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                    <Label htmlFor="vendorName" className="block text-sm font-medium text-gray-700">Vendor Name <span className="text-red-500">*</span></Label>
                    <Input 
                      id="vendorName" 
                      name="vendorName" 
                      value={vendorFormData.vendorName} 
                      onChange={handleFormChange(setVendorFormData)} 
                      placeholder="Enter vendor name" 
                      className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors.vendorName ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}
                    />
                    {errors.vendorName && <p className="text-red-500 text-xs mt-1">{errors.vendorName}</p>}
                </div>
                <div>
                    <Label htmlFor="gstNumber" className="block text-sm font-medium text-gray-700">GST Number (Optional)</Label>
                    <Input 
                      id="gstNumber" 
                      name="gstNumber" 
                      value={vendorFormData.gstNumber} 
                      onChange={handleFormChange(setVendorFormData)} 
                      placeholder="e.g. 29ABCDE1234F1Z5" 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                </div>
                <div>
                    <Label htmlFor="bankAcNo" className="block text-sm font-medium text-gray-700">Bank A/C No. <span className="text-red-500">*</span></Label>
                    <Input 
                      id="bankAcNo" 
                      name="bankAcNo" 
                      value={vendorFormData.bankAcNo} 
                      onChange={handleFormChange(setVendorFormData)} 
                      placeholder="Enter bank account number" 
                      className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors.bankAcNo ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}
                    />
                    {errors.bankAcNo && <p className="text-red-500 text-xs mt-1">{errors.bankAcNo}</p>}
                </div>
                <div>
                    <Label htmlFor="ifscCode" className="block text-sm font-medium text-gray-700">IFSC Code <span className="text-red-500">*</span></Label>
                    <Input 
                      id="ifscCode" 
                      name="ifscCode" 
                      value={vendorFormData.ifscCode} 
                      onChange={handleFormChange(setVendorFormData)} 
                      placeholder="e.g. SBIN0123456" 
                      className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors.ifscCode ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}
                    />
                    {errors.ifscCode && <p className="text-red-500 text-xs mt-1">{errors.ifscCode}</p>}
                </div>
                <div>
                    <Label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Phone Number <span className="text-red-500">*</span></Label>
                    <Input 
                      id="phoneNumber" 
                      name="phoneNumber" 
                      type="tel" 
                      value={vendorFormData.phoneNumber} 
                      onChange={handleFormChange(setVendorFormData)} 
                      placeholder="Enter phone number" 
                      className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors.phoneNumber ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}
                    />
                    {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>}
                </div>
                <div>
                    <Label htmlFor="email" className="block text-sm font-medium text-gray-700">Email (Optional)</Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      value={vendorFormData.email} 
                      onChange={handleFormChange(setVendorFormData)} 
                      placeholder="company@example.com" 
                      className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors.email ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
            </div>
            <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Vendor"}
                </Button>
            </div>
        </form>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen w-full bg-slate-50 p-4 md:p-6">
      <Card className="w-full max-w-4xl mx-auto shadow-md border-none">
        <CardHeader className="p-4 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2 text-gray-700 text-lg">
            <UserCheck className="h-5 w-5 text-purple-600" />
            KYC & Master Data Entry
          </CardTitle>
          <CardDescription className="text-gray-500 text-sm">
            Add new vendors, products, or transporters to the master list.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Tabs defaultValue="initial" className="w-full"> {/* Using Tabs for consistent styling */}
              <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/80 rounded-lg"> {/* Adjusted for 3 columns */}
                <TabsTrigger value="vendor" onClick={() => setActiveForm('vendor')} className="inline-flex h-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
                    <Store className="h-4 w-4"/> Add Vendor
                </TabsTrigger>
                <TabsTrigger value="product" onClick={() => setActiveForm('product')} className="inline-flex h-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
                    <Briefcase className="h-4 w-4"/> Add Product
                </TabsTrigger>
                <TabsTrigger value="transportation" onClick={() => setActiveForm('transportation')} className="inline-flex h-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
                    <Truck className="h-4 w-4"/> Add Transporter
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {activeForm === 'vendor' && renderVendorForm()}
          {activeForm === 'product' && renderProductForm()}
          {activeForm === 'transportation' && renderTransportationForm()}
          
          {activeForm === '' && (
            <div className="p-8 text-center text-muted-foreground border-2 border-dashed border-purple-200/50 bg-purple-50/50 rounded-lg mx-auto my-4 max-w-sm">
              <Info className="mx-auto h-12 w-12 text-purple-500 mb-3" />
              <p className="font-medium text-foreground">Select a Category</p>
              <p className="text-sm text-muted-foreground">Please choose a category above to add new master data entries.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}