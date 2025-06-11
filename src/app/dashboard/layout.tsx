'use client'

import { ReactNode, useState } from "react";
import ProtectedRoute from "../../components/ProtectedRoute";
import Sidebar from "../../components/dashboard/Sidebar";
import Header from "../../components/dashboard/Header";

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">
                {/* Mobile sidebar backdrop */}
                {sidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar with mobile support */}
                <Sidebar 
                    sidebarOpen={sidebarOpen} 
                    setSidebarOpen={setSidebarOpen} 
                />

                <div className="lg:pl-64">
                    {/* Header with menu toggle button */}
                    <Header 
                        sidebarOpen={sidebarOpen} 
                        setSidebarOpen={setSidebarOpen} 
                    />
                    
                    <main className="p-6">
                        {children}
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    )
}