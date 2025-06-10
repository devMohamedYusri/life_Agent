'use client'

import { ReactNode } from "react";
import ProtectedRoute from "../../components/ProtectedRoute";
import Sidebar from "../../components/dashboard/Sidebar";
import Header from "../../components/dashboard/Header";

export default function DashboardLayout({children}:{children:ReactNode}){
    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">
                <Sidebar/>
                <div className="lg:pl-64">
                    <Header/>
                    <main className="p-6">
                        {children}
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    )

}