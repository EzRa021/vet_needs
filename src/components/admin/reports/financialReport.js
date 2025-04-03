"use client"

import { useState, useEffect } from "react"
import { useTransactions } from "@/context/TransactionContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { useBranches } from "@/context/BranchContext"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  CreditCard,
  BarChart3,
  PieChartIcon,
  LineChartIcon,
} from "lucide-react"

export default function FinancialReportPage() {
  const [filterType, setFilterType] = useState("daily")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activeChart, setActiveChart] = useState("line")
  const { loading, error, transactions, financialMetrics, getFilteredReport } = useTransactions()
  const { activeBranch } = useBranches()
  const branchId = activeBranch?.id

  const handleDateSelect = (date) => {
    if (!date) return
    setSelectedDate(date)
  }

  const handleFilterChange = (newFilter) => {
    setFilterType(newFilter)
  }

  // This effect will run whenever filterType, selectedDate, or branchId changes
  useEffect(() => {
    const fetchReport = async () => {
      if (!branchId || !selectedDate) return

      try {
        await getFilteredReport(branchId, filterType, selectedDate)
      } catch (error) {
        console.error("Error fetching filtered report:", error)
      }
    }

    fetchReport()
  }, [branchId, filterType, selectedDate, getFilteredReport])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount)
  }

  const getChartData = () => {
    return transactions.map((transaction) => ({
      date: format(new Date(transaction.createdAt), "MM/dd"),
      sales: transaction.total,
      revenue: transaction.total - transaction.items.reduce((acc, item) => acc + item.costPrice * item.quantitySold, 0),
    }))
  }

  const getPieData = () => {
    // Group transactions by payment method
    const paymentMethods = transactions.reduce((acc, transaction) => {
      const method = transaction.paymentMethod || "Unknown"
      if (!acc[method]) {
        acc[method] = 0
      }
      acc[method] += transaction.total
      return acc
    }, {})

    // Convert to array format for PieChart
    return Object.keys(paymentMethods).map((method) => ({
      name: method.charAt(0).toUpperCase() + method.slice(1),
      value: paymentMethods[method],
    }))
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]

  const getPercentChange = (current, previous) => {
    if (previous === 0) return 100
    return ((current - previous) / previous) * 100
  }

  // Mock data for percent changes (in a real app, this would come from comparing periods)
  const percentChanges = {
    sales: 12.5,
    profit: 8.3,
    expenses: -5.2,
    netProfit: 15.7,
    transactions: 7.2,
    itemsSold: 9.8,
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading financial data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
          <h3 className="font-semibold">Error Loading Data</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Financial Report</h1>
        <p className="text-muted-foreground">
          Comprehensive financial overview for {activeBranch?.name || "your business"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Filters Section */}
        <Card className="md:col-span-8 lg:col-span-9">
          <CardHeader className="pb-3">
            <CardTitle>Report Filters</CardTitle>
            <CardDescription>Select time period and date range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <Tabs value={filterType} onValueChange={handleFilterChange} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="daily" className="text-xs sm:text-sm">
                    Daily
                  </TabsTrigger>
                  <TabsTrigger value="weekly" className="text-xs sm:text-sm">
                    Weekly
                  </TabsTrigger>
                  <TabsTrigger value="monthly" className="text-xs sm:text-sm">
                    Monthly
                  </TabsTrigger>
                  <TabsTrigger value="yearly" className="text-xs sm:text-sm">
                    Yearly
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-4 lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle>Date Selection</CardTitle>
            <CardDescription>Pick a specific date</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                className="rounded-md border"
                disabled={(date) => false}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{formatCurrency(financialMetrics.totalSales)}</div>
            <div className="flex items-center pt-1">
              {percentChanges.sales > 0 ? (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"
                >
                  <ArrowUpCircle className="h-3 w-3" /> {percentChanges.sales.toFixed(1)}%
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                  <ArrowDownCircle className="h-3 w-3" /> {Math.abs(percentChanges.sales).toFixed(1)}%
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-2">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{formatCurrency(financialMetrics.totalRevenue)}</div>
            <div className="flex items-center pt-1">
              {percentChanges.profit > 0 ? (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"
                >
                  <ArrowUpCircle className="h-3 w-3" /> {percentChanges.profit.toFixed(1)}%
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                  <ArrowDownCircle className="h-3 w-3" /> {Math.abs(percentChanges.profit).toFixed(1)}%
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-2">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{formatCurrency(financialMetrics.totalExpenses)}</div>
            <div className="flex items-center pt-1">
              {percentChanges.expenses < 0 ? (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"
                >
                  <ArrowDownCircle className="h-3 w-3" /> {Math.abs(percentChanges.expenses).toFixed(1)}%
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                  <ArrowUpCircle className="h-3 w-3" /> {percentChanges.expenses.toFixed(1)}%
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-2">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{formatCurrency(financialMetrics.netProfit)}</div>
            <div className="flex items-center pt-1">
              {percentChanges.netProfit > 0 ? (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"
                >
                  <ArrowUpCircle className="h-3 w-3" /> {percentChanges.netProfit.toFixed(1)}%
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                  <ArrowDownCircle className="h-3 w-3" /> {Math.abs(percentChanges.netProfit).toFixed(1)}%
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-2">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{financialMetrics.totalTransactions}</div>
            <div className="flex items-center pt-1">
              {percentChanges.transactions > 0 ? (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"
                >
                  <ArrowUpCircle className="h-3 w-3" /> {percentChanges.transactions.toFixed(1)}%
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                  <ArrowDownCircle className="h-3 w-3" /> {Math.abs(percentChanges.transactions).toFixed(1)}%
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-2">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{financialMetrics.totalItemsSold}</div>
            <div className="flex items-center pt-1">
              {percentChanges.itemsSold > 0 ? (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"
                >
                  <ArrowUpCircle className="h-3 w-3" /> {percentChanges.itemsSold.toFixed(1)}%
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                  <ArrowDownCircle className="h-3 w-3" /> {Math.abs(percentChanges.itemsSold).toFixed(1)}%
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-2">vs previous period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Financial Trend</CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant={activeChart === "line" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setActiveChart("line")}
                >
                  <LineChartIcon className="h-3 w-3 mr-1" /> Line
                </Badge>
                <Badge
                  variant={activeChart === "bar" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setActiveChart("bar")}
                >
                  <BarChart3 className="h-3 w-3 mr-1" /> Bar
                </Badge>
              </div>
            </div>
            <CardDescription>Sales and revenue trends over time</CardDescription>
            <Separator className="mt-4" />
          </CardHeader>
          <CardContent className="h-[400px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              {activeChart === "line" ? (
                <LineChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₦${value.toLocaleString()}`}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #f0f0f0",
                      borderRadius: "6px",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#8884d8"
                    name="Total Sales"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#82ca9d"
                    name="Revenue"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                </LineChart>
              ) : (
                <BarChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₦${value.toLocaleString()}`}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #f0f0f0",
                      borderRadius: "6px",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="sales" name="Total Sales" fill="#8884d8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revenue" name="Revenue" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Payment Methods</CardTitle>
              <Badge variant="outline">
                <PieChartIcon className="h-3 w-3 mr-1" /> Distribution
              </Badge>
            </div>
            <CardDescription>Sales by payment method</CardDescription>
            <Separator className="mt-4" />
          </CardHeader>
          <CardContent className="h-[400px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getPieData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {getPieData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Summary Section */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Summary of the most recent {Math.min(5, transactions.length)} transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                  <th className="text-left py-3 px-4 font-medium">Transaction ID</th>
                  <th className="text-left py-3 px-4 font-medium">Payment Method</th>
                  <th className="text-left py-3 px-4 font-medium">Items</th>
                  <th className="text-right py-3 px-4 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 5).map((transaction, index) => (
                  <tr key={transaction.id} className={index !== transactions.length - 1 ? "border-b" : ""}>
                    <td className="py-3 px-4 text-sm">{format(new Date(transaction.createdAt), "MMM dd, yyyy")}</td>
                    <td className="py-3 px-4 text-sm">{transaction.salesId || transaction.id.substring(0, 8)}</td>
                    <td className="py-3 px-4 text-sm">
                      <Badge variant="outline" className="capitalize">
                        {transaction.paymentMethod || "Cash"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm">{transaction.items?.length || 0}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium">{formatCurrency(transaction.total)}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      No transactions found for the selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

