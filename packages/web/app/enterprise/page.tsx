/**
 * Enterprise Onboarding Page
 *
 * Contact form for enterprise customers to get started with custom plans.
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Building2, Check, Mail as _Mail, Phone as _Phone, Users, Zap } from 'lucide-react'

export default function EnterprisePage() {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    companySize: '',
    useCase: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // TODO: Send to sales email or CRM
      const response = await fetch('/api/enterprise/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Thank you! Our team will contact you within 24 hours.', { duration: 5000 })
        setFormData({
          companyName: '',
          contactName: '',
          email: '',
          phone: '',
          companySize: '',
          useCase: '',
          message: '',
        })
      } else {
        throw new Error('Failed to submit')
      }
    } catch (_error) {
      toast.error('Failed to submit. Please email us at enterprise@ghostspeak.ai')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
            <Building2 className="h-4 w-4" />
            <span className="text-sm font-medium">Enterprise Solutions</span>
          </div>
          <h1 className="text-5xl font-bold mb-4">
            Scale AI Agent Verification
            <br />
            Across Your Organization
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Custom plans for large teams with dedicated support, advanced features, and volume
            discounts.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card>
            <CardHeader>
              <Zap className="h-10 w-10 mb-4 text-primary" />
              <CardTitle>Unlimited API Calls</CardTitle>
              <CardDescription>
                No rate limits or quotas. Process millions of verifications per month.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Users className="h-10 w-10 mb-4 text-primary" />
              <CardTitle>Dedicated Support</CardTitle>
              <CardDescription>
                Priority email, Slack channel, and video support with 4-hour response SLA.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Check className="h-10 w-10 mb-4 text-primary" />
              <CardTitle>Custom Integration</CardTitle>
              <CardDescription>
                Tailored webhooks, custom endpoints, and white-label options available.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Pricing Comparison */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Enterprise vs. Self-Serve</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Growth</CardTitle>
                <CardDescription>For growing teams</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">
                  $499<span className="text-lg text-muted-foreground">/mo</span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    20,000 verifications/month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    20 team members
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Email support
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Webhooks
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-primary shadow-lg">
              <CardHeader>
                <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium w-fit mb-2">
                  RECOMMENDED
                </div>
                <CardTitle>Enterprise</CardTitle>
                <CardDescription>For large organizations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">Custom</div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Unlimited verifications
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Unlimited team members
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Priority support (4hr SLA)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Custom webhooks
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Volume discounts
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Dedicated account manager
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="opacity-60">
              <CardHeader>
                <CardTitle>Startup</CardTitle>
                <CardDescription>For small teams</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">
                  $49<span className="text-lg text-muted-foreground">/mo</span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    1,000 verifications/month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />5 team members
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Community support
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Contact Form */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Get Started with Enterprise</CardTitle>
            <CardDescription>
              Fill out this form and our team will reach out within 24 hours to discuss your needs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    required
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <Label htmlFor="contactName">Your Name *</Label>
                  <Input
                    id="contactName"
                    required
                    value={formData.contactName}
                    onChange={(e) => handleChange('contactName', e.target.value)}
                    placeholder="John Smith"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Work Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="john@acme.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="companySize">Company Size *</Label>
                <Select
                  value={formData.companySize}
                  onValueChange={(v) => handleChange('companySize', v)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10 employees</SelectItem>
                    <SelectItem value="11-50">11-50 employees</SelectItem>
                    <SelectItem value="51-200">51-200 employees</SelectItem>
                    <SelectItem value="201-1000">201-1000 employees</SelectItem>
                    <SelectItem value="1000+">1000+ employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="useCase">Use Case *</Label>
                <Select
                  value={formData.useCase}
                  onValueChange={(v) => handleChange('useCase', v)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="How will you use GhostSpeak?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marketplace">AI Agent Marketplace</SelectItem>
                    <SelectItem value="payment">Payment Processor</SelectItem>
                    <SelectItem value="hiring">Hiring Platform</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="message">Tell us about your needs</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  placeholder="Expected monthly verification volume, custom requirements, etc."
                  rows={4}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Request Enterprise Access'}
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                Or email us directly at{' '}
                <a href="mailto:enterprise@ghostspeak.ai" className="text-primary hover:underline">
                  enterprise@ghostspeak.ai
                </a>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
