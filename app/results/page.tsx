"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { TrendingUp, Shield, Target, ArrowLeft, DollarSign, Activity, AlertTriangle, Sparkles } from "lucide-react"

interface StockData {
  Sector: string
  Ticker: string
  "Current Price": string
  "Std Dev (%)": string
  [key: string]: string
}

interface PortfolioResult {
  method: string
  weights: number[]
  tickers: string[]
  sectors: string[]
  currentPrices: number[]
  quantities: number[]
  usedAmounts: number[]
  percentInvested: number[]
  expectedReturn: number
  portfolioRisk: number
  sharpeRatio: number
  var95: number
  futureValue: number
  sectorExposure: { [key: string]: number }
  uninvestedAmount: number
}

const COLORS = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#6366F1",
  "#84CC16",
  "#06B6D4",
  "#F43F5E",
  "#8B5A2B",
  "#6B7280",
  "#DC2626",
]

export default function ResultsPage() {
  const [user, setUser] = useState<any>(null)
  const [profileData, setProfileData] = useState<any>(null)
  const [stockData, setStockData] = useState<StockData[]>([])
  const [portfolios, setPortfolios] = useState<PortfolioResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    const profile = localStorage.getItem("profileData")

    if (!userData || !profile) {
      router.push("/login")
      return
    }

    const parsedUser = JSON.parse(userData)
    const parsedProfile = JSON.parse(profile)

    setUser(parsedUser)
    setProfileData(parsedProfile)

    // Load stock data and generate portfolios
    loadStockData(parsedProfile)
  }, [router])

  const loadStockData = async (profile: any) => {
    try {
      setLoading(true)
      const response = await fetch("/data/results.csv")
      const csvText = await response.text()
      const parsedData = parseCSV(csvText)

      console.log("Loaded stock data:", parsedData.length, "stocks")
      setStockData(parsedData)

      if (profile && parsedData.length > 0) {
        generatePortfolios(parsedData, profile)
      } else {
        console.error("Missing profile data or stock data")
        setError("Unable to load portfolio data")
        setLoading(false)
      }
    } catch (error) {
      console.error("Error loading stock data:", error)
      setError("Failed to load stock data. Please try again.")
      setLoading(false)
    }
  }

  const parseCSV = (csvText: string): StockData[] => {
    const lines = csvText.split("\n")
    const headers = lines[0].split(",")
    const data: StockData[] = []

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(",")
        const row: any = {}
        headers.forEach((header, index) => {
          row[header.trim()] = values[index]?.trim() || ""
        })
        data.push(row)
      }
    }

    return data.filter((row) => row["Current Price"] && !isNaN(Number.parseFloat(row["Current Price"])))
  }

  const computeCAGR = (stockData: StockData[], horizon: number) => {
    return stockData.map((stock) => {
      try {
        const currentPrice = Number.parseFloat(stock["Current Price"])
        if (!currentPrice || currentPrice <= 0) return 0

        const monthColumns = Object.keys(stock).filter((key) => key.match(/^\d{4}-\d{2}$/))
        const selectedMonths = monthColumns.slice(0, horizon * 12)

        if (selectedMonths.length === 0) return 0

        const validPrices = selectedMonths
          .map((month) => Number.parseFloat(stock[month]))
          .filter((price) => !isNaN(price) && price > 0)

        if (validPrices.length === 0) return 0

        const avgFuturePrice = validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length

        const cagr = Math.pow(avgFuturePrice / currentPrice, 1 / horizon) - 1

        return isNaN(cagr) || !isFinite(cagr) ? 0 : cagr
      } catch (error) {
        console.error("Error computing CAGR for stock:", stock.Ticker, error)
        return 0
      }
    })
  }

  const minimumVariancePortfolio = (covMatrix: number[][]) => {
    const n = covMatrix.length
    return new Array(n).fill(1 / n)
  }

  const sharpeRatioPortfolio = (returns: number[], covMatrix: number[][]) => {
    const n = returns.length
    const weights = returns.map((r) => Math.max(0, r))
    const sum = weights.reduce((a, b) => a + b, 0)
    return weights.map((w) => w / (sum || 1))
  }

  const hrpAllocation = (covMatrix: number[][]) => {
    const n = covMatrix.length
    return new Array(n).fill(1 / n)
  }

  const generatePortfolios = (data: StockData[], profile: any) => {
    try {
      console.log("Generating portfolios with profile:", profile)

      const horizon = Number.parseInt(profile.holdingPeriod)
      const investmentAmount = Number.parseFloat(profile.investmentAmount)

      console.log("Horizon:", horizon, "Investment:", investmentAmount)

      const validStocks = data.filter(
        (stock) =>
          stock["Current Price"] &&
          stock["Std Dev (%)"] &&
          !isNaN(Number.parseFloat(stock["Current Price"])) &&
          !isNaN(Number.parseFloat(stock["Std Dev (%)"])) &&
          Number.parseFloat(stock["Current Price"]) > 0,
      )

      console.log("Valid stocks:", validStocks.length)

      if (validStocks.length === 0) {
        console.error("No valid stocks found")
        setError("No valid stock data available")
        setLoading(false)
        return
      }

      const expectedReturns = computeCAGR(validStocks, horizon)
      const stocksWithReturns = validStocks.map((stock, i) => ({
        ...stock,
        expectedReturn: expectedReturns[i],
      }))

      const topStocks = stocksWithReturns
        .filter((stock) => !isNaN(stock.expectedReturn) && isFinite(stock.expectedReturn))
        .sort((a, b) => b.expectedReturn - a.expectedReturn)
        .slice(0, 15)

      console.log("Top stocks selected:", topStocks.length)

      if (topStocks.length === 0) {
        console.error("No valid top stocks found")
        setError("Unable to find suitable stocks for portfolio")
        setLoading(false)
        return
      }

      const returns = topStocks.map((s) => s.expectedReturn)
      const stdDevs = topStocks.map((s) => Number.parseFloat(s["Std Dev (%)"]) / 100)
      const covMatrix = stdDevs.map((std, i) => stdDevs.map((_, j) => (i === j ? std * std : std * stdDevs[j] * 0.3)))

      const riskFreeRate = 0.0698

      const portfolioMethods = [
        { name: "Minimum Variance", weights: minimumVariancePortfolio(covMatrix) },
        { name: "Sharpe Ratio Optimized", weights: sharpeRatioPortfolio(returns, covMatrix) },
        { name: "Hierarchical Risk Parity", weights: hrpAllocation(covMatrix) },
      ]

      const results = portfolioMethods.map((method) =>
        calculatePortfolioMetrics(
          method.name,
          method.weights,
          topStocks,
          returns,
          covMatrix,
          investmentAmount,
          horizon,
          riskFreeRate,
        ),
      )

      console.log("Generated portfolios:", results.length)
      setPortfolios(results)
      setLoading(false)
    } catch (error) {
      console.error("Error generating portfolios:", error)
      setError("Failed to generate portfolios. Please check your input data.")
      setLoading(false)
    }
  }

  const calculatePortfolioMetrics = (
    method: string,
    weights: number[],
    stocks: any[],
    returns: number[],
    covMatrix: number[][],
    investment: number,
    horizon: number,
    riskFreeRate: number,
  ): PortfolioResult => {
    const tickers = stocks.map((s) => s.Ticker)
    const sectors = stocks.map((s) => s.Sector)
    const currentPrices = stocks.map((s) => Number.parseFloat(s["Current Price"]))

    const allocAmounts = weights.map((w) => w * investment)
    const quantities = allocAmounts.map((amount, i) => Math.floor(amount / currentPrices[i]))
    const usedAmounts = quantities.map((qty, i) => qty * currentPrices[i])

    let remainingAmount = investment - usedAmounts.reduce((sum, amount) => sum + amount, 0)

    while (remainingAmount >= Math.min(...currentPrices)) {
      const sortedIndices = currentPrices
        .map((price, index) => ({ price, index }))
        .sort((a, b) => a.price - b.price)
        .map((item) => item.index)

      for (const i of sortedIndices) {
        if (remainingAmount >= currentPrices[i]) {
          quantities[i] += 1
          usedAmounts[i] += currentPrices[i]
          remainingAmount -= currentPrices[i]
          break
        }
      }
    }

    const percentInvested = usedAmounts.map((amount) => (amount / investment) * 100)

    const portfolioReturn = weights.reduce((sum, w, i) => sum + w * returns[i], 0)
    const portfolioVariance = weights.reduce(
      (sum, wi, i) => sum + weights.reduce((innerSum, wj, j) => innerSum + wi * wj * covMatrix[i][j], 0),
      0,
    )
    const portfolioRisk = Math.sqrt(portfolioVariance)
    const sharpeRatio = (portfolioReturn - riskFreeRate) / portfolioRisk

    const var95 = investment * Math.abs(portfolioReturn - 1.645 * portfolioRisk)
    const futureValue = investment * Math.pow(1 + portfolioReturn, horizon)

    const sectorExposure: { [key: string]: number } = {}
    sectors.forEach((sector, i) => {
      if (!sectorExposure[sector]) sectorExposure[sector] = 0
      sectorExposure[sector] += (usedAmounts[i] / investment) * 100
    })

    return {
      method,
      weights,
      tickers,
      sectors,
      currentPrices,
      quantities,
      usedAmounts,
      percentInvested,
      expectedReturn: portfolioReturn,
      portfolioRisk,
      sharpeRatio,
      var95,
      futureValue,
      sectorExposure,
      uninvestedAmount: remainingAmount,
    }
  }

  const getInsight = (sharpeRatio: number) => {
    if (sharpeRatio > 1.5) return "Excellent risk-adjusted return. Strong portfolio performance expected."
    if (sharpeRatio > 1.0) return "Good risk-return tradeoff. Solid investment strategy."
    if (sharpeRatio > 0.5) return "Moderate performance expected. Consider risk optimization."
    return "Lower risk-adjusted returns. Review strategy for better optimization."
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey}: ${entry.dataKey === "value" ? formatCurrency(entry.value) : `${entry.value.toFixed(1)}%`}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Optimizing Your Portfolio</h2>
          <p className="text-gray-600 mb-4">Our AI is analyzing market data and building your personalized portfolio</p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span>This may take a few moments</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="max-w-md border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Portfolio Generation Failed</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">{error}</p>
            <Button
              onClick={() => router.push("/profile")}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Back to Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (portfolios.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="max-w-md border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-gray-400" />
            </div>
            <CardTitle>No Portfolio Data</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">Unable to generate portfolio recommendations. Please try again.</p>
            <Button
              onClick={() => router.push("/profile")}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Back to Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user || !profileData) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => router.push("/profile")} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Profile
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Portfolio Dashboard</h1>
                <p className="text-gray-600">Your personalized investment recommendations</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Welcome back,</p>
              <p className="font-semibold text-gray-900">{profileData.fullName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* User Summary */}
        <div className="mb-8">
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Hello {profileData.fullName}!</h2>
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                    <span className="text-gray-600">You are a</span>
                    <Badge
                      className={`text-lg px-4 py-2 ${
                        profileData.investorType === "Aggressive Investor"
                          ? "bg-red-100 text-red-800 border-red-200"
                          : profileData.investorType === "Conservative Investor"
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-blue-100 text-blue-800 border-blue-200"
                      } border`}
                    >
                      {profileData.investorType}
                    </Badge>
                  </div>
                  <p className="text-gray-600">Here are your optimized portfolio recommendations</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(Number.parseFloat(profileData.investmentAmount))}
                    </div>
                    <div className="text-sm text-gray-600">Investment</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{profileData.holdingPeriod}Y</div>
                    <div className="text-sm text-gray-600">Horizon</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {(profileData.riskTolerance * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">Risk Tolerance</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {profileData.investmentObjective === "1"
                        ? "Growth"
                        : profileData.investmentObjective === "2"
                          ? "Income"
                          : "Balanced"}
                    </div>
                    <div className="text-sm text-gray-600">Objective</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="mvp" className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 h-14 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <TabsTrigger
              value="mvp"
              className="flex items-center gap-2 h-12 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white"
            >
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Minimum Variance</span>
              <span className="sm:hidden">MVP</span>
            </TabsTrigger>
            <TabsTrigger
              value="sharpe"
              className="flex items-center gap-2 h-12 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-green-700 data-[state=active]:text-white"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Sharpe Optimized</span>
              <span className="sm:hidden">Sharpe</span>
            </TabsTrigger>
            <TabsTrigger
              value="hrp"
              className="flex items-center gap-2 h-12 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white"
            >
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Risk Parity</span>
              <span className="sm:hidden">HRP</span>
            </TabsTrigger>
          </TabsList>

          {portfolios.map((portfolio, index) => (
            <TabsContent key={portfolio.method} value={index === 0 ? "mvp" : index === 1 ? "sharpe" : "hrp"}>
              <div className="space-y-8">
                {/* Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm hover:shadow-xl transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        Expected Return
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">
                        {(portfolio.expectedReturn * 100).toFixed(2)}%
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Annual return</p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm hover:shadow-xl transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-orange-600" />
                        Portfolio Risk
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-orange-600">
                        {(portfolio.portfolioRisk * 100).toFixed(2)}%
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Volatility</p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm hover:shadow-xl transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-600" />
                        Sharpe Ratio
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600">{portfolio.sharpeRatio.toFixed(2)}</div>
                      <p className="text-xs text-gray-500 mt-1">Risk-adjusted return</p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm hover:shadow-xl transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        95% VaR
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">{formatCurrency(portfolio.var95)}</div>
                      <p className="text-xs text-gray-500 mt-1">Max expected loss</p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm hover:shadow-xl transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-purple-600" />
                        Projected Value
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">{formatCurrency(portfolio.futureValue)}</div>
                      <p className="text-xs text-gray-500 mt-1">After {profileData.holdingPeriod} years</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Stock Allocation Pie Chart */}
                  <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-xl font-semibold flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        Stock Allocation
                      </CardTitle>
                      <CardDescription>Portfolio distribution by stock holdings</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                          <Pie
                            data={portfolio.tickers
                              .map((ticker, i) => ({
                                name: ticker,
                                value: portfolio.usedAmounts[i],
                                percentage: portfolio.percentInvested[i],
                              }))
                              .filter((item) => item.value > 0)
                              .sort((a, b) => b.value - a.value)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percentage }) =>
                              percentage > 5 ? `${name}: ${percentage.toFixed(1)}%` : ""
                            }
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {portfolio.tickers.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value, entry) => `${value}: ${formatCurrency(entry.payload.value)}`}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Sector Exposure Bar Chart */}
                  <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-xl font-semibold flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        Sector Exposure
                      </CardTitle>
                      <CardDescription>Portfolio diversification across sectors</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart
                          data={Object.entries(portfolio.sectorExposure)
                            .filter(([_, exposure]) => exposure > 0)
                            .map(([sector, exposure]) => ({
                              sector: sector.length > 12 ? sector.substring(0, 12) + "..." : sector,
                              fullSector: sector,
                              exposure: Number(exposure.toFixed(2)),
                            }))
                            .sort((a, b) => b.exposure - a.exposure)}
                          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey="sector"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            fontSize={12}
                            stroke="#666"
                          />
                          <YAxis label={{ value: "Exposure (%)", angle: -90, position: "insideLeft" }} stroke="#666" />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="exposure" fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Portfolio Holdings Table */}
                <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold">Portfolio Holdings</CardTitle>
                    <CardDescription>
                      Detailed breakdown of your {portfolio.method.toLowerCase()} portfolio
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-200">
                            <TableHead className="font-semibold text-gray-700">Ticker</TableHead>
                            <TableHead className="font-semibold text-gray-700">Sector</TableHead>
                            <TableHead className="font-semibold text-gray-700">Weight (%)</TableHead>
                            <TableHead className="font-semibold text-gray-700">Current Price (₹)</TableHead>
                            <TableHead className="font-semibold text-gray-700">Quantity</TableHead>
                            <TableHead className="font-semibold text-gray-700">Amount Used (₹)</TableHead>
                            <TableHead className="font-semibold text-gray-700">% of Investment</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {portfolio.tickers.map(
                            (ticker, i) =>
                              portfolio.usedAmounts[i] > 0 && (
                                <TableRow key={ticker} className="border-gray-100 hover:bg-gray-50">
                                  <TableCell className="font-medium text-blue-600">{ticker}</TableCell>
                                  <TableCell className="text-gray-600">{portfolio.sectors[i]}</TableCell>
                                  <TableCell className="font-medium">
                                    {(portfolio.weights[i] * 100).toFixed(2)}%
                                  </TableCell>
                                  <TableCell>₹{portfolio.currentPrices[i].toFixed(2)}</TableCell>
                                  <TableCell className="font-medium">{portfolio.quantities[i]}</TableCell>
                                  <TableCell className="font-medium">₹{portfolio.usedAmounts[i].toFixed(2)}</TableCell>
                                  <TableCell className="font-medium text-green-600">
                                    {portfolio.percentInvested[i].toFixed(2)}%
                                  </TableCell>
                                </TableRow>
                              ),
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {portfolio.uninvestedAmount > 0 && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              <strong>Uninvested Amount:</strong> {formatCurrency(portfolio.uninvestedAmount)}
                            </p>
                            <p className="text-xs text-yellow-700 mt-1">
                              Remaining cash after optimized share purchases (
                              {(
                                (portfolio.uninvestedAmount / Number.parseFloat(profileData.investmentAmount)) *
                                100
                              ).toFixed(2)}
                              % of total investment)
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-yellow-800">
                              Total Invested:{" "}
                              {formatCurrency(
                                Number.parseFloat(profileData.investmentAmount) - portfolio.uninvestedAmount,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Portfolio Insights */}
                <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                      Portfolio Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                        <p className="text-lg font-medium text-blue-900 mb-2">{getInsight(portfolio.sharpeRatio)}</p>
                        <p className="text-sm text-blue-700">
                          This {portfolio.method.toLowerCase()} strategy is designed for{" "}
                          {profileData.investorType.toLowerCase()}s seeking{" "}
                          {profileData.investmentObjective === "1"
                            ? "growth"
                            : profileData.investmentObjective === "2"
                              ? "income"
                              : "balanced"}{" "}
                          objectives.
                        </p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="font-semibold text-gray-900">Investment Summary</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Investment Horizon:</span>
                              <span className="font-medium">{profileData.holdingPeriod} years</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Risk Tolerance:</span>
                              <span className="font-medium">{(profileData.riskTolerance * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Investment Objective:</span>
                              <span className="font-medium">
                                {profileData.investmentObjective === "1"
                                  ? "Growth"
                                  : profileData.investmentObjective === "2"
                                    ? "Income"
                                    : "Balanced"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Investment:</span>
                              <span className="font-medium">
                                {formatCurrency(Number.parseFloat(profileData.investmentAmount))}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-semibold text-gray-900">Performance Metrics</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Expected Annual Return:</span>
                              <span className="font-medium text-green-600">
                                {(portfolio.expectedReturn * 100).toFixed(2)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Annual Volatility:</span>
                              <span className="font-medium text-orange-600">
                                {(portfolio.portfolioRisk * 100).toFixed(2)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Sharpe Ratio:</span>
                              <span className="font-medium text-blue-600">{portfolio.sharpeRatio.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Number of Holdings:</span>
                              <span className="font-medium">
                                {portfolio.quantities.filter((q) => q > 0).length} stocks
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
