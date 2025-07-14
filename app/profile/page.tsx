"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, User, DollarSign, Calendar, Target, TrendingDown, Minus } from "lucide-react"

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    fullName: "",
    investmentAmount: "",
    holdingPeriod: "",
    riskTolerance: [8],
    investmentObjective: "",
  })
  const [investorType, setInvestorType] = useState("")
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/login")
      return
    }
    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    setFormData((prev) => ({ ...prev, fullName: parsedUser.fullName || "" }))
  }, [router])

  const classifyInvestor = (horizon: number, riskTol: number, obj: string) => {
    if (riskTol >= 8 && horizon >= 4 && obj === "1") {
      return "Aggressive Investor"
    } else if (riskTol <= 5 && horizon <= 2 && obj === "2") {
      return "Conservative Investor"
    } else {
      return "Moderate Investor"
    }
  }

  useEffect(() => {
    if (formData.holdingPeriod && formData.riskTolerance[0] && formData.investmentObjective) {
      const type = classifyInvestor(
        Number.parseInt(formData.holdingPeriod),
        formData.riskTolerance[0],
        formData.investmentObjective,
      )
      setInvestorType(type)
    }
  }, [formData.holdingPeriod, formData.riskTolerance, formData.investmentObjective])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Store profile data
    const profileData = {
      ...formData,
      riskTolerance: formData.riskTolerance[0] / 100,
      investorType,
    }

    localStorage.setItem("profileData", JSON.stringify(profileData))
    router.push("/results")
    setLoading(false)
  }

  const getInvestorTypeColor = (type: string) => {
    switch (type) {
      case "Aggressive Investor":
        return "bg-red-100 text-red-800 border-red-200"
      case "Conservative Investor":
        return "bg-green-100 text-green-800 border-green-200"
      case "Moderate Investor":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getInvestorIcon = (type: string) => {
    switch (type) {
      case "Aggressive Investor":
        return <TrendingUp className="h-4 w-4" />
      case "Conservative Investor":
        return <TrendingDown className="h-4 w-4" />
      case "Moderate Investor":
        return <Minus className="h-4 w-4" />
      default:
        return null
    }
  }

  const progress = ((currentStep - 1) / 4) * 100

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Investment Profile</h1>
                <p className="text-gray-600">Tell us about your investment preferences</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Welcome back,</p>
              <p className="font-semibold text-gray-900">{user.fullName || user.username}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Profile Completion</span>
            <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Investment Preferences
                </CardTitle>
                <CardDescription>Complete your profile to get personalized portfolio recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600">1</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                        Full Name
                      </Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                        placeholder="Enter your full name"
                        className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Investment Details */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-semibold text-green-600">2</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Investment Details</h3>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="investmentAmount"
                          className="text-sm font-medium text-gray-700 flex items-center gap-2"
                        >
                          <DollarSign className="h-4 w-4" />
                          Investment Amount (₹)
                        </Label>
                        <Input
                          id="investmentAmount"
                          type="number"
                          value={formData.investmentAmount}
                          onChange={(e) => setFormData((prev) => ({ ...prev, investmentAmount: e.target.value }))}
                          placeholder="Enter amount in INR"
                          className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          min="1000"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="holdingPeriod"
                          className="text-sm font-medium text-gray-700 flex items-center gap-2"
                        >
                          <Calendar className="h-4 w-4" />
                          Holding Period
                        </Label>
                        <Select
                          value={formData.holdingPeriod}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, holdingPeriod: value }))}
                        >
                          <SelectTrigger className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select holding period" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 Year</SelectItem>
                            <SelectItem value="2">2 Years</SelectItem>
                            <SelectItem value="3">3 Years</SelectItem>
                            <SelectItem value="4">4 Years</SelectItem>
                            <SelectItem value="5">5 Years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Risk Assessment */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-semibold text-orange-600">3</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
                    </div>

                    <div className="space-y-6">
                      <div className="p-6 bg-gray-50 rounded-xl">
                        <Label className="text-sm font-medium text-gray-700 mb-4 block">
                          Risk Tolerance: {formData.riskTolerance[0]}%
                        </Label>
                        <Slider
                          value={formData.riskTolerance}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, riskTolerance: value }))}
                          max={20}
                          min={0}
                          step={1}
                          className="w-full mb-4"
                        />
                        <div className="flex justify-between text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <TrendingDown className="h-4 w-4" />
                            Conservative (0%)
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            Aggressive (20%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Investment Objective */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-semibold text-purple-600">4</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Investment Objective</h3>
                    </div>

                    <RadioGroup
                      value={formData.investmentObjective}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, investmentObjective: value }))}
                      className="space-y-3"
                    >
                      <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value="1" id="growth" />
                        <Label htmlFor="growth" className="flex-1 cursor-pointer">
                          <div className="font-medium">Growth</div>
                          <div className="text-sm text-gray-600">
                            Focus on capital appreciation and long-term growth
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value="2" id="income" />
                        <Label htmlFor="income" className="flex-1 cursor-pointer">
                          <div className="font-medium">Income</div>
                          <div className="text-sm text-gray-600">Focus on regular dividends and steady income</div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value="3" id="balanced" />
                        <Label htmlFor="balanced" className="flex-1 cursor-pointer">
                          <div className="font-medium">Balanced</div>
                          <div className="text-sm text-gray-600">Mix of growth and income strategies</div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Building Portfolio...
                      </div>
                    ) : (
                      "Build My Portfolio"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Investor Classification */}
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Investor Classification
                </CardTitle>
              </CardHeader>
              <CardContent>
                {investorType ? (
                  <div className="text-center space-y-4">
                    <Badge className={`text-base px-4 py-2 ${getInvestorTypeColor(investorType)} border`}>
                      <span className="flex items-center gap-2">
                        {getInvestorIcon(investorType)}
                        {investorType}
                      </span>
                    </Badge>
                    <div className="text-sm text-gray-600 space-y-2">
                      {investorType === "Aggressive Investor" && (
                        <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                          <p className="font-medium text-red-800 mb-1">High Risk, High Reward</p>
                          <p className="text-red-700">
                            You're comfortable with higher volatility for potentially greater returns.
                          </p>
                        </div>
                      )}
                      {investorType === "Conservative Investor" && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                          <p className="font-medium text-green-800 mb-1">Low Risk, Steady Returns</p>
                          <p className="text-green-700">
                            You prefer stable investments with predictable income streams.
                          </p>
                        </div>
                      )}
                      {investorType === "Moderate Investor" && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <p className="font-medium text-blue-800 mb-1">Balanced Approach</p>
                          <p className="text-blue-700">
                            You seek a balanced mix of growth potential and risk management.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Target className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">Complete the form to see your investor classification</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* What's Next */}
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">What's Next?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-blue-600">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Portfolio Optimization</p>
                    <p className="text-sm text-gray-600">Three advanced models analyze your preferences</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-green-600">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Risk Analysis</p>
                    <p className="text-sm text-gray-600">Comprehensive risk and return calculations</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-purple-600">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Visual Dashboard</p>
                    <p className="text-sm text-gray-600">Interactive charts and detailed insights</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
