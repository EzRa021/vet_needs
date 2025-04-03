'use client'

import { useAuth } from '@/context/AuthContext'
import { useBranches } from '@/context/BranchContext'
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { ToastAction } from "@/components/ui/toast"
import { Clock } from '@/components/clock'
import { Sun, Moon, Sunset, CalendarPlus } from 'lucide-react'
import { useEffect, useState } from 'react'


export const dynamic = 'force-static'
export default function DashboardPage() {
  const { userDetails } = useAuth()
  const { toast } = useToast()
  const [backgroundImage, setBackgroundImage] = useState('')
  
  // console.log(userDetails )
  
  const getTimeInfo = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 8) return { text: 'Early morning', icon: Sun, image: "/pexels-raybilcliff-1706614.jpg" }
    if (hour >= 8 && hour < 12) return { text: 'Good morning', icon: Sun, image: "/pexels-tomfisk-2278543.jpg" }
    if (hour >= 12 && hour < 18) return { text: 'Good afternoon', icon: Sunset, image: '/pexels-brett-sayles-912364.jpg' }
    if (hour >= 18 && hour < 22) return { text: 'Good evening', icon: Moon, image: '/pexels-pixabay-36744.jpg' }
    return { text: 'Good night', icon: Moon, image: '/pexels-minan1398-920534.jpg' }
  }

  const { text: greeting, icon: GreetingIcon, image } = getTimeInfo()

  useEffect(() => {
    setBackgroundImage(image)
  }, [image])

  return (
    <div 
      className="h-full w-full bg-cover bg-center transition-all duration-1000 ease-in-out"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="min-h-screen bg-black bg-opacity-50 ">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-4xl font-bold text-white">Cashier Dashboard</h1>
            <Clock />
          </div>

          <div className="mb-8 rounded-lg bg-white bg-opacity-10 p-6 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2 justify-center">
              <GreetingIcon className="h-8 w-8 text-yellow-500" />
              <h2 className="text-4xl font-semibold text-white">
                {greeting}, {userDetails?.fullname || 'User'}!
              </h2>
            </div>
            <p className="mt-2 text-center text-gray-200">
              Welcome to your dashboard. Here is an overview of your account.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-white bg-opacity-10 p-6 shadow-lg backdrop-blur-md">
              <h3 className="mb-4 text-xl font-semibold text-white">User Info</h3>
              <p className="text-gray-200">Email: {userDetails?.email}</p>
              <p className="text-gray-200">Role: {userDetails?.role}</p>
            </div>

            <div className="rounded-lg bg-white bg-opacity-10 p-6 shadow-lg backdrop-blur-md">
              <h3 className="mb-4 text-xl font-semibold text-white">Active Branch</h3>
              <p className="text-gray-200">Name: {userDetails?.branchName}</p>
            </div>

            <div className="rounded-lg bg-white bg-opacity-10 p-6 shadow-lg backdrop-blur-md">
              <h3 className="mb-4 text-xl font-semibold text-white">Quick Actions</h3>
              <Button
                variant="outline"
                onClick={() => {
                  toast({
                    title: "Scheduled: Catch up",
                    description: "Friday, February 10, 2023 at 5:57 PM",
                    action: (
                      <ToastAction altText="Goto schedule to undo">Undo</ToastAction>
                    ),
                  })
                }}
                className="flex items-center space-x-2 bg-white bg-opacity-20 text-white hover:bg-white hover:bg-opacity-30"
              >
                <CalendarPlus className="h-4 w-4" />
                <span>Add to calendar</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

