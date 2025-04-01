"use client"

import { Check, Sparkles, Zap, Plane, MapPin, FileText, CreditCard, Shield, Users, Globe, Star, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

const features = {
  free: [
    "Up to 5 flights per month",
    "Basic flight details",
    "Flight notes",
    "Email support",
    "Basic analytics",
    "Community access"
  ],
  basic: [
    "Up to 20 flights per month",
    "Advanced flight details",
    "Priority support",
    "Advanced analytics",
    "Flight sharing",
    "Custom categories",
    "Export to PDF",
    "API access"
  ],
  pro: [
    "Unlimited flights",
    "Advanced flight details",
    "Priority support",
    "Advanced analytics",
    "Flight sharing",
    "Custom categories",
    "Export to PDF",
    "API access",
    "Team collaboration",
    "Custom branding",
    "Dedicated support",
    "SLA guarantee"
  ],
  enterprise: [
    "Everything in Pro",
    "Team collaboration",
    "Custom branding",
    "Dedicated support",
    "SLA guarantee",
    "Advanced security",
    "Custom integrations",
    "Training sessions",
    "White-label options",
    "Custom development",
    "24/7 priority support",
    "Dedicated account manager"
  ]
}

export default function PricingPage() {
  const handleSubscribe = (plan: string) => {
    toast.success(`🚀 Ready to soar with ${plan} plan! We'll set up your subscription shortly. ✈️`)
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">Choose Your Flight Plan</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Start tracking your flights for free and upgrade as you need more features. All plans include our core features with additional benefits as you upgrade.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-7xl mx-auto">
        {/* Free Plan */}
        <Card className="relative border-2 hover:border-flight/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-flight" />
              Free
            </CardTitle>
            <CardDescription>Perfect for getting started</CardDescription>
            <div className="mt-4">
              <span className="text-3xl font-bold">$0</span>
              <span className="text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {features.free.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-flight" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full bg-flight hover:bg-flight/90"
              onClick={() => handleSubscribe("Free")}
            >
              Get Started Free
            </Button>
          </CardFooter>
        </Card>

        {/* Basic Plan */}
        <Card className="relative border-2 hover:border-flight/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-flight" />
              Basic
            </CardTitle>
            <CardDescription>For occasional travelers</CardDescription>
            <div className="mt-4">
              <span className="text-3xl font-bold">$9</span>
              <span className="text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {features.basic.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-flight" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full bg-flight hover:bg-flight/90"
              onClick={() => handleSubscribe("Basic")}
            >
              Upgrade to Basic
            </Button>
          </CardFooter>
        </Card>

        {/* Pro Plan */}
        <Card className="relative border-2 border-flight shadow-lg scale-105">
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-flight hover:bg-flight/90">
            Most Popular
          </Badge>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-flight" />
              Pro
            </CardTitle>
            <CardDescription>For frequent travelers</CardDescription>
            <div className="mt-4">
              <span className="text-3xl font-bold">$19</span>
              <span className="text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {features.pro.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-flight" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full bg-flight hover:bg-flight/90"
              onClick={() => handleSubscribe("Pro")}
            >
              Upgrade to Pro
            </Button>
          </CardFooter>
        </Card>

        {/* Enterprise Plan */}
        <Card className="relative border-2 hover:border-flight/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-flight" />
              Enterprise
            </CardTitle>
            <CardDescription>For teams and organizations</CardDescription>
            <div className="mt-4">
              <span className="text-3xl font-bold">$49</span>
              <span className="text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {features.enterprise.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-flight" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full bg-flight hover:bg-flight/90"
              onClick={() => handleSubscribe("Enterprise")}
            >
              Contact Sales
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="mt-16 max-w-4xl mx-auto">
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-flight" />
              All Plans Include
            </CardTitle>
            <CardDescription>Core features available to all users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-flight/10 flex items-center justify-center mt-0.5">
                  <MapPin className="h-4 w-4 text-flight" />
                </div>
                <div>
                  <div className="font-medium">Flight Tracking</div>
                  <div className="text-sm text-muted-foreground">Track all your flights in one place</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-flight/10 flex items-center justify-center mt-0.5">
                  <FileText className="h-4 w-4 text-flight" />
                </div>
                <div>
                  <div className="font-medium">Flight Notes</div>
                  <div className="text-sm text-muted-foreground">Add personal notes to your flights</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-flight/10 flex items-center justify-center mt-0.5">
                  <CreditCard className="h-4 w-4 text-flight" />
                </div>
                <div>
                  <div className="font-medium">Secure Payments</div>
                  <div className="text-sm text-muted-foreground">SSL encrypted payment processing</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-flight/10 flex items-center justify-center mt-0.5">
                  <Globe className="h-4 w-4 text-flight" />
                </div>
                <div>
                  <div className="font-medium">Global Access</div>
                  <div className="text-sm text-muted-foreground">Access your flights from anywhere</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
        <p className="text-muted-foreground mb-6">
          We're here to help you choose the right plan for your needs.
        </p>
        <Button variant="outline" className="gap-2">
          <Users className="h-4 w-4" />
          Contact Support
        </Button>
      </div>
    </div>
  )
} 