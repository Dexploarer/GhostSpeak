'use client'

import React, { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  ShoppingCart,
  Plus,
  Search,
  Grid3X3,
  List,
  Star,
  Clock,
  Briefcase,
  Tag,
  RefreshCw,
  ExternalLink,
  DollarSign,
  Users,
  Gavel
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardCard } from '@/components/dashboard/shared/DashboardCard'
import { EmptyState } from '@/components/dashboard/shared/EmptyState'
import { DataTable } from '@/components/dashboard/shared/DataTable'
import { StatsCard } from '@/components/dashboard/shared/StatsCard'
import { FormDialog } from '@/components/dashboard/shared/FormDialog'
import { FormField, FormInput, FormTextarea, FormSelect } from '@/components/ui/form-field'
import { useFormValidation } from '@/lib/hooks/useFormValidation'
import { createListingSchema, createJobSchema, marketplaceCategories } from '@/lib/schemas/marketplace'
import { useMarketplaceListings, useCreateListing, useJobPostings, useCreateJobPosting } from '@/lib/queries/marketplace'
import { cn } from '@/lib/utils'

type Tab = 'services' | 'jobs' | 'my-listings' | 'auctions'

export default function MarketplacePage() {
  const { publicKey, connected } = useWallet()
  const [activeTab, setActiveTab] = useState<Tab>('services')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false)
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Form states
  const [listingForm, setListingForm] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    deliveryTime: '7 days',
    tags: [] as string[],
    requirements: ''
  })

  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    category: '',
    budgetMin: '',
    budgetMax: '',
    durationDays: '',
    requiredSkills: [] as string[],
    experienceLevel: ''
  })

  const [tagInput, setTagInput] = useState('')
  const [skillInput, setSkillInput] = useState('')

  // Queries
  const { data: listings, isLoading: listingsLoading, refetch: refetchListings } = useMarketplaceListings({
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    search: searchQuery || undefined
  })
  const { data: jobs, isLoading: jobsLoading, refetch: refetchJobs } = useJobPostings()

  // Mutations
  const createListingMutation = useCreateListing()
  const createJobMutation = useCreateJobPosting()

  // Validation
  const listingValidation = useFormValidation(createListingSchema)
  const jobValidation = useFormValidation(createJobSchema)

  // Filter user's listings
  const myListings = listings?.filter(l => l.seller === publicKey?.toBase58()) ?? []
  const allListings = listings ?? []
  const allJobs = jobs ?? []

  // Stats
  const totalListings = allListings.length
  const totalJobs = allJobs.length
  const myListingsCount = myListings.length
  const avgPrice = totalListings > 0
    ? Number(allListings.reduce((sum, l) => sum + l.price, BigInt(0)) / BigInt(totalListings)) / 1e9
    : 0

  // Handle listing creation
  const handleCreateListing = () => {
    const data = {
      ...listingForm,
      price: parseFloat(listingForm.price) || 0,
      tags: listingForm.tags
    }
    
    if (!listingValidation.validate(data)) return

    createListingMutation.mutate({
      name: listingForm.title,
      description: listingForm.description,
      category: listingForm.category,
      price: BigInt(Math.floor(parseFloat(listingForm.price) * 1e9)),
      currency: 'SOL',
      tags: listingForm.tags,
      deliveryTime: listingForm.deliveryTime,
      requirements: listingForm.requirements
    }, {
      onSuccess: () => {
        setIsCreateListingOpen(false)
        setListingForm({
          title: '',
          description: '',
          category: '',
          price: '',
          deliveryTime: '7 days',
          tags: [],
          requirements: ''
        })
        listingValidation.clearErrors()
      }
    })
  }

  // Handle job creation
  const handleCreateJob = () => {
    const data = {
      ...jobForm,
      budgetMin: parseFloat(jobForm.budgetMin) || 0,
      budgetMax: parseFloat(jobForm.budgetMax) || 0,
      durationDays: parseInt(jobForm.durationDays) || 0,
      requiredSkills: jobForm.requiredSkills
    }
    
    if (!jobValidation.validate(data)) return

    createJobMutation.mutate({
      title: jobForm.title,
      description: jobForm.description,
      budget: BigInt(Math.floor(parseFloat(jobForm.budgetMax) * 1e9)),
      duration: parseInt(jobForm.durationDays),
      requiredSkills: jobForm.requiredSkills,
      category: jobForm.category
    }, {
      onSuccess: () => {
        setIsCreateJobOpen(false)
        setJobForm({
          title: '',
          description: '',
          category: '',
          budgetMin: '',
          budgetMax: '',
          durationDays: '',
          requiredSkills: [],
          experienceLevel: ''
        })
        jobValidation.clearErrors()
      }
    })
  }

  // Add tag
  const addTag = () => {
    if (tagInput.trim() && !listingForm.tags.includes(tagInput.trim())) {
      setListingForm(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }))
      setTagInput('')
    }
  }

  // Add skill
  const addSkill = () => {
    if (skillInput.trim() && !jobForm.requiredSkills.includes(skillInput.trim())) {
      setJobForm(prev => ({ ...prev, requiredSkills: [...prev.requiredSkills, skillInput.trim()] }))
      setSkillInput('')
    }
  }

  const tabs = [
    { id: 'services' as Tab, label: 'Services', count: totalListings },
    { id: 'jobs' as Tab, label: 'Jobs', count: totalJobs },
    { id: 'my-listings' as Tab, label: 'My Listings', count: myListingsCount },
    { id: 'auctions' as Tab, label: 'Auctions', count: 0 }
  ]

  // Not connected state
  if (!connected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">Marketplace</h1>
          <p className="text-muted-foreground">Browse and offer AI agent services</p>
        </div>
        
        <EmptyState
          icon={ShoppingCart}
          title="Connect Your Wallet"
          description="Connect your wallet to browse services, post jobs, and create listings on the marketplace."
          features={[
            'Browse AI agent services',
            'Post jobs for agents to complete',
            'Create service listings'
          ]}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Marketplace</h1>
          <p className="text-muted-foreground">Browse and offer AI agent services</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => activeTab === 'jobs' ? refetchJobs() : refetchListings()}
            disabled={listingsLoading || jobsLoading}
            className="border-border"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', (listingsLoading || jobsLoading) && 'animate-spin')} />
            Refresh
          </Button>
          {activeTab === 'jobs' || activeTab === 'my-listings' ? (
            <Button
              onClick={() => setIsCreateJobOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Post Job
            </Button>
          ) : (
            <Button
              onClick={() => setIsCreateListingOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Listing
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          label="Total Services"
          value={totalListings}
          icon={ShoppingCart}
          loading={listingsLoading}
        />
        <StatsCard
          label="Open Jobs"
          value={totalJobs}
          icon={Briefcase}
          loading={jobsLoading}
        />
        <StatsCard
          label="My Listings"
          value={myListingsCount}
          icon={Tag}
          loading={listingsLoading}
        />
        <StatsCard
          label="Avg Price"
          value={avgPrice.toFixed(2)}
          unit="SOL"
          icon={DollarSign}
          loading={listingsLoading}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-[0_0_20px_rgba(204,255,0,0.2)]'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            <span className={cn(
              'px-1.5 py-0.5 rounded text-xs',
              activeTab === tab.id ? 'bg-primary-foreground/20' : 'bg-background'
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <DashboardCard noPadding>
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 px-4 rounded-xl bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
          >
            <option value="all">All Categories</option>
            {marketplaceCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <div className="flex gap-1 p-1 rounded-xl bg-muted">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-lg transition-all',
                viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-lg transition-all',
                viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </DashboardCard>

      {/* Content */}
      {activeTab === 'services' && (
        allListings.length === 0 && !listingsLoading ? (
          <EmptyState
            icon={ShoppingCart}
            title="No Services Yet"
            description="Be the first to create a service listing on the marketplace."
            actionLabel="Create Listing"
            onAction={() => setIsCreateListingOpen(true)}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listingsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-card/50 border border-border p-6 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                  <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              ))
            ) : (
              allListings.map((listing) => (
                <div
                  key={listing.address}
                  className="rounded-2xl bg-card/50 backdrop-blur-xl border border-border p-6 hover:border-primary/20 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground line-clamp-1">{listing.name}</h3>
                      <p className="text-xs text-muted-foreground">{listing.category}</p>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-bold">{listing.averageRating.toFixed(1)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {listing.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{listing.deliveryTime}</span>
                    </div>
                    <span className="text-lg font-black text-primary">
                      {(Number(listing.price) / 1e9).toFixed(2)} SOL
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <DataTable
            data={allListings}
            columns={[
              {
                header: 'Service',
                cell: (l) => (
                  <div>
                    <p className="font-bold text-foreground">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.category}</p>
                  </div>
                )
              },
              { header: 'Rating', cell: (l) => `${l.averageRating.toFixed(1)} / 5` },
              { header: 'Price', cell: (l) => `${(Number(l.price) / 1e9).toFixed(2)} SOL` },
              { header: 'Delivery', accessorKey: 'deliveryTime' }
            ]}
            isLoading={listingsLoading}
            keyExtractor={(l) => l.address}
          />
        )
      )}

      {activeTab === 'jobs' && (
        allJobs.length === 0 && !jobsLoading ? (
          <EmptyState
            icon={Briefcase}
            title="No Jobs Posted"
            description="Post a job to find AI agents for your tasks."
            actionLabel="Post Job"
            onAction={() => setIsCreateJobOpen(true)}
          />
        ) : (
          <DataTable
            data={allJobs}
            columns={[
              {
                header: 'Job',
                cell: (j) => (
                  <div>
                    <p className="font-bold text-foreground">{j.title}</p>
                    <p className="text-xs text-muted-foreground">{j.category}</p>
                  </div>
                )
              },
              { header: 'Budget', cell: (j) => `${(Number(j.budget) / 1e9).toFixed(2)} SOL` },
              { header: 'Deadline', cell: (j) => new Date(j.deadline).toLocaleDateString() },
              { header: 'Applications', cell: (j) => j.applications }
            ]}
            isLoading={jobsLoading}
            keyExtractor={(j) => j.address}
          />
        )
      )}

      {activeTab === 'my-listings' && (
        myListings.length === 0 && !listingsLoading ? (
          <EmptyState
            icon={Tag}
            title="No Listings Yet"
            description="Create your first service listing to start earning."
            actionLabel="Create Listing"
            onAction={() => setIsCreateListingOpen(true)}
          />
        ) : (
          <DataTable
            data={myListings}
            columns={[
              {
                header: 'Service',
                cell: (l) => (
                  <div>
                    <p className="font-bold text-foreground">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.category}</p>
                  </div>
                )
              },
              { header: 'Status', cell: (l) => l.isActive ? 'Active' : 'Inactive' },
              { header: 'Price', cell: (l) => `${(Number(l.price) / 1e9).toFixed(2)} SOL` },
              { header: 'Purchases', cell: (l) => l.totalPurchases }
            ]}
            isLoading={listingsLoading}
            keyExtractor={(l) => l.address}
          />
        )
      )}

      {activeTab === 'auctions' && (
        <EmptyState
          icon={Gavel}
          title="No Active Auctions"
          description="Auctions allow you to bid on exclusive AI agent services."
          features={[
            'English and Dutch auction formats',
            'Reserve price protection',
            'Automatic escrow on winning bid'
          ]}
        />
      )}

      {/* Create Listing Dialog */}
      <FormDialog
        open={isCreateListingOpen}
        onOpenChange={setIsCreateListingOpen}
        title="Create Service Listing"
        description="Offer your AI agent services on the marketplace"
        icon={ShoppingCart}
        submitLabel="Create Listing"
        onSubmit={handleCreateListing}
        isSubmitting={createListingMutation.isPending}
      >
        <FormField label="Title" name="title" required error={listingValidation.getFieldError('title')}>
          <FormInput
            id="title"
            value={listingForm.title}
            onChange={(e) => setListingForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="AI-Powered Data Analysis"
            error={!!listingValidation.getFieldError('title')}
          />
        </FormField>

        <FormField label="Description" name="description" required error={listingValidation.getFieldError('description')}>
          <FormTextarea
            id="description"
            value={listingForm.description}
            onChange={(e) => setListingForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe your service in detail..."
            rows={3}
            error={!!listingValidation.getFieldError('description')}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Category" name="category" required error={listingValidation.getFieldError('category')}>
            <FormSelect
              id="category"
              value={listingForm.category}
              onChange={(e) => setListingForm(prev => ({ ...prev, category: e.target.value }))}
              options={marketplaceCategories.map(c => ({ value: c, label: c }))}
              placeholder="Select"
              error={!!listingValidation.getFieldError('category')}
            />
          </FormField>

          <FormField label="Price (SOL)" name="price" required error={listingValidation.getFieldError('price')}>
            <FormInput
              id="price"
              type="number"
              step="0.01"
              value={listingForm.price}
              onChange={(e) => setListingForm(prev => ({ ...prev, price: e.target.value }))}
              placeholder="0.00"
              error={!!listingValidation.getFieldError('price')}
            />
          </FormField>
        </div>

        <FormField label="Tags" name="tags" error={listingValidation.getFieldError('tags')}>
          <div className="space-y-2">
            <div className="flex gap-2">
              <FormInput
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tag..."
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addTag}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {listingForm.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium flex items-center gap-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => setListingForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))}
                    className="hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </FormField>
      </FormDialog>

      {/* Create Job Dialog */}
      <FormDialog
        open={isCreateJobOpen}
        onOpenChange={setIsCreateJobOpen}
        title="Post a Job"
        description="Find AI agents to complete your tasks"
        icon={Briefcase}
        submitLabel="Post Job"
        onSubmit={handleCreateJob}
        isSubmitting={createJobMutation.isPending}
      >
        <FormField label="Title" name="title" required error={jobValidation.getFieldError('title')}>
          <FormInput
            id="job-title"
            value={jobForm.title}
            onChange={(e) => setJobForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Data Analysis for Market Research"
            error={!!jobValidation.getFieldError('title')}
          />
        </FormField>

        <FormField label="Description" name="description" required error={jobValidation.getFieldError('description')}>
          <FormTextarea
            id="job-description"
            value={jobForm.description}
            onChange={(e) => setJobForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the job requirements in detail..."
            rows={4}
            error={!!jobValidation.getFieldError('description')}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Min Budget (SOL)" name="budgetMin" required error={jobValidation.getFieldError('budgetMin')}>
            <FormInput
              id="budgetMin"
              type="number"
              step="0.01"
              value={jobForm.budgetMin}
              onChange={(e) => setJobForm(prev => ({ ...prev, budgetMin: e.target.value }))}
              placeholder="0.00"
              error={!!jobValidation.getFieldError('budgetMin')}
            />
          </FormField>

          <FormField label="Max Budget (SOL)" name="budgetMax" required error={jobValidation.getFieldError('budgetMax')}>
            <FormInput
              id="budgetMax"
              type="number"
              step="0.01"
              value={jobForm.budgetMax}
              onChange={(e) => setJobForm(prev => ({ ...prev, budgetMax: e.target.value }))}
              placeholder="0.00"
              error={!!jobValidation.getFieldError('budgetMax')}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Category" name="category" required error={jobValidation.getFieldError('category')}>
            <FormSelect
              id="job-category"
              value={jobForm.category}
              onChange={(e) => setJobForm(prev => ({ ...prev, category: e.target.value }))}
              options={marketplaceCategories.map(c => ({ value: c, label: c }))}
              placeholder="Select"
              error={!!jobValidation.getFieldError('category')}
            />
          </FormField>

          <FormField label="Duration (days)" name="durationDays" required error={jobValidation.getFieldError('durationDays')}>
            <FormInput
              id="durationDays"
              type="number"
              value={jobForm.durationDays}
              onChange={(e) => setJobForm(prev => ({ ...prev, durationDays: e.target.value }))}
              placeholder="7"
              error={!!jobValidation.getFieldError('durationDays')}
            />
          </FormField>
        </div>

        <FormField label="Required Skills" name="requiredSkills" error={jobValidation.getFieldError('requiredSkills')}>
          <div className="space-y-2">
            <div className="flex gap-2">
              <FormInput
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder="Add skill..."
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addSkill}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {jobForm.requiredSkills.map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium flex items-center gap-1"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => setJobForm(prev => ({ ...prev, requiredSkills: prev.requiredSkills.filter(s => s !== skill) }))}
                    className="hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </FormField>
      </FormDialog>
    </div>
  )
}
