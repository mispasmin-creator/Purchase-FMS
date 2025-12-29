// src/components/AppHeader.jsx
"use client";

import React from 'react';
import { Menu, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Import Sonner's toast if needed (though AppHeader doesn't use it directly)
// import { toast } from 'sonner';

export default function AppHeader({ toggleDesktopSidebar, isSidebarOpen, setIsMobileSidebarOpen }) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm p-3 sm:p-4 flex items-center justify-between sticky top-0 z-40 h-16 flex-shrink-0 border-b border-gray-200">
      {/* Left side: Sidebar Toggle (Desktop & Mobile) */}
      <div className="flex items-center">
        {/* Desktop Sidebar Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDesktopSidebar}
          aria-label={isSidebarOpen ? "Close desktop sidebar" : "Open desktop sidebar"}
          className="text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg hidden md:inline-flex" // Hidden on mobile
        >
          <Menu size={24} />
        </Button>

        {/* Mobile Sidebar Trigger (Hamburger Icon) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileSidebarOpen(true)} // Open mobile sheet
          aria-label="Open mobile sidebar"
          className="text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg md:hidden mr-4" // Visible on mobile
        >
          <Menu size={24} />
        </Button>

        <h1 className="text-xl font-bold text-gray-800 ml-0 md:ml-4">Purchase Management</h1> {/* Adjusted ml */}
      </div>

      {/* Right side: User Info and Logout Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            <UserCircle size={24} className="text-blue-600" />
            <div className="text-left hidden md:block">
              <p className="text-xs text-gray-500">Logged in as</p>
              <p className="text-sm font-medium text-blue-700">{user?.username || "User"}</p>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48 shadow-lg" align="end">
          <DropdownMenuLabel className="md:hidden">
            <p className="text-xs text-gray-500">Logged in as</p>
            <p className="text-sm font-semibold text-blue-700 truncate">{user?.username || "User"}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="md:hidden" />

          <DropdownMenuItem
            onClick={logout}
            className="text-red-600 hover:!bg-red-50 hover:!text-red-700 flex items-center gap-2"
          >
            <LogOut size={16} className="mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}