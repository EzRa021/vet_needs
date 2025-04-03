"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { Loader2, Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { Progress } from "@/components/ui/progress"
import { usePathname, useRouter } from "next/navigation"

export const AppInitializer = ({ children }) => {
  const { loading, isAuthenticated, user, role } = useAuth()
  const [isInitializing, setIsInitializing] = useState(true)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [loadingText, setLoadingText] = useState("Initializing")
  const [progress, setProgress] = useState(0)
  const router = useRouter()
  const pathname = usePathname()

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Set minimum loading time to prevent flickering
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) {
        setIsInitializing(false)
      }
    }, 1500) // Minimum 1.5 seconds loading screen

    return () => clearTimeout(timer)
  }, [loading])

  // Animate loading progress
  useEffect(() => {
    const texts = ["Initializing", "Loading user data", "Preparing your dashboard", "Almost there"]
    let currentIndex = 0
    let progressValue = 0

    const interval = setInterval(() => {
      // Update loading text
      currentIndex = (currentIndex + 1) % texts.length
      setLoadingText(texts[currentIndex])

      // Update progress
      progressValue += 25
      if (progressValue > 95) progressValue = 95 // Cap at 95% until fully loaded
      setProgress(progressValue)
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  // Set progress to 100% when done loading
  useEffect(() => {
    if (!loading && isInitializing) {
      setProgress(100)
    }
  }, [loading, isInitializing])

  // Fix for client-side routing in Electron production
  useEffect(() => {
    // This effect will run on client-side only
    if (typeof window !== 'undefined' && !loading && !isInitializing) {
      // Function to handle URL syncing
      const handleLocationChange = () => {
        const currentPath = window.location.pathname
        
        // Only synchronize if there's a mismatch to avoid unnecessary updates
        if (pathname !== currentPath && pathname !== null) {
          console.log('Syncing URL state:', { pathname, currentPath })
          
          // Use replace to avoid creating unnecessary history entries
          window.history.replaceState(null, '', pathname)
        }
      }
      
      // Run once on mount and whenever pathname changes
      handleLocationChange()
      
      // Add event listener for back/forward navigation
      window.addEventListener('popstate', (event) => {
        // Prevent default behavior
        event.preventDefault()
        
        // Re-sync the URL
        handleLocationChange()
        
        // If it's a different path, use Next.js router to navigate
        const popPath = window.location.pathname
        if (popPath !== pathname) {
          router.push(popPath)
        }
      })
      
      return () => {
        window.removeEventListener('popstate', handleLocationChange)
      }
    }
  }, [pathname, router, loading, isInitializing])

  // Don't render theme toggle until mounted to prevent hydration mismatch
  if (!mounted) {
    return null
  }

  // Show loading page during initialization
  if (loading || isInitializing) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-background to-background/95 p-4">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="w-full max-w-md shadow-xl bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex flex-col items-center space-y-8">
                {/* Logo */}
                <motion.div
                  className="relative"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                >
                  <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center shadow-inner">
                   <Image src="/WhatsApp Image 2025-01-07 at 9.05.41 AM.jpeg" alt="Vet Needs" width={100} height={100} />
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-primary/30"
                    animate={{
                      scale: [1, 1.15, 1],
                      opacity: [0.7, 0, 0.7],
                    }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  />
                </motion.div>

                {/* App name */}
                <div className="space-y-2 text-center">
                  <h1 className="text-3xl font-bold text-primary">Vet Needs</h1>
                  <p className="text-muted-foreground text-sm">Veterinary care management platform</p>
                </div>

                {/* Loading indicator */}
                <div className="w-full space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-muted-foreground">{loadingText}</p>
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm font-medium">{progress}%</span>
                    </div>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>

                {/* Loading animation */}
                <div className="flex justify-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2.5 h-2.5 rounded-full bg-primary"
                      animate={{
                        y: ["0%", "-50%", "0%"],
                        opacity: [0.3, 1, 0.3],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: i * 0.2,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>

                {/* Theme toggle */}
                <div className="flex items-center justify-center w-full pt-4 mt-2">
                  <div className="flex items-center space-x-2 bg-muted/50 p-1.5 rounded-full">
                    <button
                      onClick={() => setTheme("light")}
                      className={cn(
                        "p-2 rounded-full transition-colors",
                        theme === "light"
                          ? "bg-background text-primary shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      aria-label="Light mode"
                    >
                      <Sun className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setTheme("dark")}
                      className={cn(
                        "p-2 rounded-full transition-colors",
                        theme === "dark"
                          ? "bg-background text-primary shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      aria-label="Dark mode"
                    >
                      <Moon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="text-muted-foreground text-sm mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          © {new Date().getFullYear()} Vet Needs. All rights reserved.
        </motion.p>
      </div>
    )
  }

  // Render children once app is initialized
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}