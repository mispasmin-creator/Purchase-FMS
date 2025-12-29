// src/components/VendorPaymentPage.jsx
"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Landmark, PlusCircle, Info } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function VendorPaymentPage() {
  const { user } = useAuth();
  
  // A user has access to all firms ONLY if their firmName is literally 'all'.
  const hasAllAccess = user?.firmName?.toLowerCase() === 'all';

  // Define the firm-to-URL mapping with lowercase keys for robust matching.
  const firmLinks = {
    "pmmpl": "https://docs.google.com/spreadsheets/d/1VR2nVpRVaDFG54vzNsAjmQFGielNYX_ykjzGYY3UT9M/edit?gid=0#gid=0",
    "rkl": "https://docs.google.com/spreadsheets/d/1QVEUJrh0R-8ibt_Md8wbCA3j0ZN2gBWN_wPdlfVqW08/edit?gid=0#gid=0",
    "purab": "https://docs.google.com/spreadsheets/d/1eMZCScHdVAn3gS2fsMYg7Tig7WVcp9duh5yiyx2Laqo/edit?gid=0#gid=0"
  };
  
  // For display purposes, create a mapping from lowercase to original case.
  const firmDisplayNames = {
    "pmmpl": "PMMPl",
    "rkl": "Rkl",
    "purab": "Purab"
  };

  // Get the URL using the lowercase version of the user's firm name.
  const userFirmKey = user?.firmName?.toLowerCase();
  const firmUrl = userFirmKey ? firmLinks[userFirmKey] : null;
  const firmDisplayName = userFirmKey ? firmDisplayNames[userFirmKey] : user?.firmName;

  return (
    <div className="space-y-4 p-4 md:p-6 bg-slate-50 min-h-screen">
      <Card className="shadow-md border-none">
        <CardHeader className="p-4 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2 text-gray-700 text-lg">
            <Landmark className="h-5 w-5 text-purple-600" />
            Vendor Payment
          </CardTitle>
          <CardDescription className="text-gray-500 text-sm">
            Create a new vendor payment entry by selecting the appropriate firm.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 lg:p-8 text-center">
          <div className="flex flex-wrap justify-center items-center gap-4">
            {hasAllAccess ? (
              // If user has 'all' access, show a button for each firm.
              Object.entries(firmDisplayNames).map(([key, displayName]) => (
                <a key={key} href={firmLinks[key]} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="inline-flex items-center justify-center py-2.5 px-6 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 transform hover:scale-105">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Create Payment for {displayName}
                  </Button>
                </a>
              ))
            ) : (
              // Otherwise, show a single button for the user's specific firm, if a URL is found.
              firmUrl ? (
                <a href={firmUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="inline-flex items-center justify-center py-2.5 px-6 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 transform hover:scale-105">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Create Payment for {firmDisplayName}
                  </Button>
                </a>
              ) : (
                // Message when no specific link is configured for the user's firm.
                <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-purple-200/50 bg-purple-50/50 rounded-lg mx-auto my-4 text-center max-w-sm">
                  <Info className="h-12 w-12 text-purple-500 mb-3" />
                  <p className="font-medium text-foreground">No Payment Link Configured</p>
                  <p className="text-sm text-muted-foreground">
                    No direct payment link is currently configured for your firm. Please contact support.
                  </p>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}