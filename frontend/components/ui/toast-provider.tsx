"use client"

import type React from "react"

import { createContext, useContext, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

type ToastContextType = {
  showToast: (message: { title: string; description?: string; variant?: "default" | "destructive" }) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()

  const showToast = (message: { title: string; description?: string; variant?: "default" | "destructive" }) => {
    toast(message)
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      ;(window as any).showToast = showToast
    }
  }, [])

  return <ToastContext.Provider value={{ showToast }}>{children}</ToastContext.Provider>
}

export const useGlobalToast = () => {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error("useGlobalToast must be used within a ToastProvider")
  }
  return context
}
