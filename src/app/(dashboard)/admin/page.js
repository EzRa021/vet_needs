'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useBranches } from '@/context/BranchContext'
import { useItems } from '@/context/ItemContext'
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { ToastAction } from "@/components/ui/toast"
import { Clock } from '@/components/clock'
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Sun, Moon, Sunset, CalendarPlus, Wifi, WifiOff, 
  RefreshCw, Database, BarChart3, FileText, Settings,
  AlertTriangle, CheckCircle, XCircle, Clock3
} from 'lucide-react'

export const dynamic = 'force-static'

export default function DashboardPage() {
  const { activeBranch } = useBranches()
  const { userDetails } = useAuth()
  const { isOnline, syncStatus, triggerSync, loading, items } = useItems()
  const { toast } = useToast()
  const [backgroundImage, setBackgroundImage] = useState('')
  const [networkSpeed, setNetworkSpeed] = useState({ type: 'unknown', speed: 0 })
  const [syncStats, setSyncStats] = useState({
    lastSync: null,
    pendingChanges: 0,
    totalDocuments: 0,
    failedOperations: 0,
    successfulOperations: 0
  })
  const [localDBSize, setLocalDBSize] = useState(0)
  const [activeTab, setActiveTab] = useState('overview')

  const getTimeInfo = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 8) return { text: 'Early morning', icon: Sun, image: "/pexels-raybilcliff-1706614.jpg" }
    if (hour >= 8 && hour < 12) return { text: 'Good morning', icon: Sun, image: "/pexels-tomfisk-2278543.jpg" }
    if (hour >= 12 && hour < 18) return { text: 'Good afternoon', icon: Sunset, image: '/pexels-brett-sayles-912364.jpg' }
    if (hour >= 18 && hour < 22) return { text: 'Good evening', icon: Moon, image: '/pexels-pixabay-36744.jpg' }
    return { text: 'Good night', icon: Moon, image: '/pexels-minan1398-920534.jpg' }
  }

  const { text: greeting, icon: GreetingIcon, image } = getTimeInfo()

  const measureNetworkSpeed = useCallback(async () => {
    if (!isOnline) {
      setNetworkSpeed({ type: 'offline', speed: 0 })
      return
    }

    try {
      const startTime = Date.now()
      const response = await fetch('/api/placeholder/50/50', { cache: 'no-store' })
      if (!response.ok) console.log('Network response was not ok')
      const endTime = Date.now()
      
      const duration = endTime - startTime
      let type = 'fast'
      if (duration > 300) type = 'slow'
      else if (duration > 100) type = 'medium'
      
      setNetworkSpeed({ 
        type, 
        speed: duration,
        latency: duration 
      })
    } catch (error) {
      console.error('Error measuring network speed:', error)
      setNetworkSpeed({ type: 'error', speed: 0 })
    }
  }, [isOnline])

  const fetchDBInfo = useCallback(async () => {
    try {
      // Initialize PouchDB
      const PouchDB = (await import('pouchdb-browser')).default
      const localDB = new PouchDB('items')
      
      // Get info about the local database
      const info = await localDB.info()
      setLocalDBSize(info.doc_count || 0)
      
      // Get pending changes count
      const changes = await localDB.changes({
        since: 'now',
        live: false,
        include_docs: false
      })
      
      setSyncStats(prev => ({
        ...prev,
        totalDocuments: info.doc_count || 0,
        pendingChanges: changes.results ? changes.results.length : 0,
        lastSync: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Error fetching DB info:', error)
    }
  }, [])

  const handleSyncClick = useCallback(async () => {
    try {
      setSyncStats(prev => ({ ...prev, lastSync: new Date().toISOString() }))
      await triggerSync()
      await fetchDBInfo()
      measureNetworkSpeed()
    } catch (error) {
      console.error('Sync error:', error)
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message,
      })
    }
  }, [triggerSync, fetchDBInfo, measureNetworkSpeed, toast])

  useEffect(() => {
    setBackgroundImage(image)
    
    // Initial network speed measurement
    measureNetworkSpeed()
    
    // Initial DB info
    fetchDBInfo()
    
    // Set up intervals
    const networkInterval = setInterval(measureNetworkSpeed, 30000)
    const dbInfoInterval = setInterval(fetchDBInfo, 15000)
    
    return () => {
      clearInterval(networkInterval)
      clearInterval(dbInfoInterval)
    }
  }, [image, measureNetworkSpeed, fetchDBInfo])

  const getSyncStatusBadge = () => {
    switch (syncStatus) {
      case 'syncing':
        return <Badge variant="secondary" className="flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin" /> Syncing</Badge>
      case 'error':
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Error</Badge>
      default:
        return isOnline ? 
          <Badge variant="outline" className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Ready</Badge> : 
          <Badge variant="outline" className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" /> Offline</Badge>
    }
  }

  const getNetworkBadge = () => {
    if (!isOnline) return <Badge variant="destructive" className="flex items-center gap-1"><WifiOff className="h-3 w-3" /> Offline</Badge>
    
    switch (networkSpeed.type) {
      case 'fast':
        return <Badge variant="default" className="bg-green-600 flex items-center gap-1"><Wifi className="h-3 w-3" /> Fast ({networkSpeed.speed}ms)</Badge>
      case 'medium':
        return <Badge variant="default" className="bg-yellow-600 flex items-center gap-1"><Wifi className="h-3 w-3" /> Medium ({networkSpeed.speed}ms)</Badge>
      case 'slow':
        return <Badge variant="default" className="bg-orange-600 flex items-center gap-1"><Wifi className="h-3 w-3" /> Slow ({networkSpeed.speed}ms)</Badge>
      default:
        return <Badge variant="outline" className="flex items-center gap-1"><Wifi className="h-3 w-3" /> Unknown</Badge>
    }
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center transition-all duration-1000 ease-in-out"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="min-h-screen bg-black bg-opacity-60 ">
        <div className="container mx-auto px-4 py-8">
          {/* Header Section */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-4xl font-bold text-white">Dashboard</h1>
              <div className="flex space-x-2">
                {getSyncStatusBadge()}
                {getNetworkBadge()}
              </div>
            </div>
            <Clock />
          </div>

          {/* Greeting Card */}
          <div className="mb-8 rounded-lg bg-white bg-opacity-10 p-6 shadow-lg backdrop-blur-md border border-white/10">
            <div className="flex items-center gap-2 justify-center">
              <GreetingIcon className="h-8 w-8 text-yellow-400" />
              <h2 className="text-4xl font-semibold text-white">
                {greeting}, {userDetails?.fullname || 'User'}!
              </h2>
            </div>
            <p className="mt-2 text-center text-gray-200">
              Welcome to your dashboard. Here is an overview of your account and synchronization status.
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="mb-8" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sync">Sync Status</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* User Info Card */}
                <Card className="bg-white/10 border-white/10 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" /> User Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="flex justify-between"><span>Name:</span> <span className="font-medium">{userDetails?.fullname}</span></p>
                      <p className="flex justify-between"><span>Email:</span> <span className="font-medium">{userDetails?.email}</span></p>
                      <p className="flex justify-between"><span>Role:</span> <span className="font-medium">{userDetails?.role}</span></p>
                    </div>
                  </CardContent>
                </Card>

                {/* Active Branch Card */}
                <Card className="bg-white/10 border-white/10 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" /> Active Branch
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="flex justify-between"><span>Branch:</span> <span className="font-medium">{activeBranch?.branchName}</span></p>
                      <p className="flex justify-between"><span>Location:</span> <span className="font-medium">{activeBranch?.location || 'N/A'}</span></p>
                      <p className="flex justify-between"><span>Items:</span> <span className="font-medium">{items.length}</span></p>
                    </div>
                  </CardContent>
                </Card>

                {/* Analytics */}
                <Card className="bg-white/10 border-white/10 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" /> Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="flex justify-between"><span>Total Documents:</span> <span className="font-medium">{localDBSize}</span></p>
                      <p className="flex justify-between"><span>Network Quality:</span> <span className="font-medium capitalize">{networkSpeed.type}</span></p>
                      <p className="flex justify-between"><span>Sync Status:</span> <span className="font-medium capitalize">{syncStatus}</span></p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Sync Status Tab */}
            <TabsContent value="sync">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Real-time Sync Status */}
                <Card className="bg-white/10 border-white/10 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className={`h-5 w-5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                      Sync Status
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      Current synchronization status with the remote database
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Status:</span>
                        <span>{getSyncStatusBadge()}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Last Sync:</span>
                          <span>{syncStats.lastSync ? new Date(syncStats.lastSync).toLocaleTimeString() : 'Never'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pending Changes:</span>
                          <span>{syncStats.pendingChanges}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Documents:</span>
                          <span>{syncStats.totalDocuments}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="justify-between border-t border-white/10 pt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                      onClick={handleSyncClick}
                      disabled={!isOnline || syncStatus === 'syncing'}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                      {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-white hover:bg-white/10"
                      onClick={fetchDBInfo}
                    >
                      Refresh Stats
                    </Button>
                  </CardFooter>
                </Card>

                {/* Network Information */}
                <Card className="bg-white/10 border-white/10 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wifi className="h-5 w-5" />
                      Network Status
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      Current network connection information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Connection:</span>
                        <span>{isOnline ? 'Online' : 'Offline'}</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Network Quality:</span>
                          <span>{getNetworkBadge()}</span>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span>Latency:</span>
                            <span>{isOnline ? `${networkSpeed.latency || 0}ms` : 'N/A'}</span>
                          </div>
                          <Progress 
                            value={isOnline ? Math.max(0, 100 - (networkSpeed.latency / 5)) : 0} 
                            className="h-2"
                          />
                        </div>
                        
                        <div className="flex justify-between">
                          <span>Sync Enabled:</span>
                          <span>{isOnline ? 'Yes' : 'No (Offline Mode)'}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="justify-between border-t border-white/10 pt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                      onClick={measureNetworkSpeed}
                    >
                      Test Connection
                    </Button>
                    <span className="text-sm text-gray-300 flex items-center">
                      <Clock3 className="h-3 w-3 mr-1" />
                      Auto-refresh every 30s
                    </span>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
            
            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card className="bg-white/10 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Sync Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        toast({
                          title: "Scheduled: Database Backup",
                          description: "Backup will run automatically at midnight",
                          action: (
                            <ToastAction altText="Cancel scheduled backup">Cancel</ToastAction>
                          ),
                        })
                      }}
                      className="w-full flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      <span>Schedule Database Backup</span>
                    </Button>
                    
                    <div className="grid gap-4 grid-cols-2">
                      <Button
                        variant="outline"
                        onClick={handleSyncClick}
                        disabled={!isOnline || syncStatus === 'syncing'}
                        className="flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
                      >
                        <RefreshCw className={`h-4 w-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                        <span>Force Full Sync</span>
                      </Button>
                      
                      <Button
                        variant="destructive"
                        onClick={() => {
                          toast({
                            variant: "destructive",
                            title: "Clear Local Cache",
                            description: "This will clear all local data. Are you sure?",
                            action: (
                              <ToastAction altText="Yes, clear cache">Confirm</ToastAction>
                            ),
                          })
                        }}
                        className="flex items-center justify-center space-x-2"
                      >
                        <Database className="h-4 w-4" />
                        <span>Clear Local Cache</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}