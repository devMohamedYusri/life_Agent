'use client'
import { useAuthStore } from "@//lib/stores/authStore"
import { useRouter } from "next/navigation"
import { ReactNode, useEffect } from "react"
export default function ProtectedRoute({children}:{children:ReactNode}){
    const {user,loading,initialized}=useAuthStore()
    const router=useRouter()


    useEffect(()=>{
        if(initialized&& !loading&&  !user ){
            router.push('/auth/signin')
        }

    },[user,loading,initialized,router])

    if(!initialized || loading){
        return(
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>

            </div>
        )
    }

    return user ? <>{children}</>:null

}