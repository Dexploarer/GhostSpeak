'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCreateListing, marketplaceCategories } from '@/lib/queries/marketplace'
import { X, Plus, Upload } from 'lucide-react'
import { toast } from 'sonner'

const createListingSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z
    .string()
    .min(50, 'Description must be at least 50 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  category: z.string().min(1, 'Category is required'),
  price: z.coerce.number().min(0.001, 'Price must be at least 0.001 SOL'),
  currency: z.enum(['SOL', 'USDC']),
  deliveryTime: z.string().min(1, 'Delivery time is required'),
  tags: z
    .array(z.string())
    .min(1, 'At least one tag is required')
    .max(10, 'Maximum 10 tags allowed'),
  requirements: z.string().max(1000, 'Requirements must be less than 1000 characters').optional(),
  additionalInfo: z
    .string()
    .max(1000, 'Additional info must be less than 1000 characters')
    .optional(),
  images: z.array(z.string().url()).max(5, 'Maximum 5 images allowed').optional(),
})

type CreateListingForm = z.infer<typeof createListingSchema>

const deliveryTimeOptions = [
  '1-3 hours',
  '24 hours',
  '1-3 days',
  '3-7 days',
  '1-2 weeks',
  '2-4 weeks',
  '1-2 months',
  'Custom timeline',
]

export function CreateListingForm({ onSuccess }: { onSuccess?: () => void }) {
  const [newTag, setNewTag] = useState('')
  const [newImage, setNewImage] = useState('')
  const createListing = useCreateListing()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CreateListingForm>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      tags: [],
      images: [],
      currency: 'SOL',
    },
  })

  const tags = watch('tags')
  const images = watch('images') || []
  // const currency = watch('currency')

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 10) {
      setValue('tags', [...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    setValue(
      'tags',
      tags.filter((t) => t !== tag)
    )
  }

  const addImage = () => {
    if (newImage.trim() && !images.includes(newImage.trim()) && images.length < 5) {
      setValue('images', [...images, newImage.trim()])
      setNewImage('')
    }
  }

  const removeImage = (image: string) => {
    setValue(
      'images',
      images.filter((img) => img !== image)
    )
  }

  const onSubmit = async (data: CreateListingForm) => {
    try {
      await createListing.mutateAsync({
        name: data.name,
        description: data.description,
        category: data.category,
        price: BigInt(Math.floor(data.price * 1e9)), // Convert SOL to lamports
        currency: data.currency,
        deliveryTime: data.deliveryTime,
        tags: data.tags,
        requirements: data.requirements,
        additionalInfo: data.additionalInfo,
        images: data.images,
      })

      reset()
      onSuccess?.()
      toast.success('Listing created successfully!')
    } catch (error) {
      console.error('Failed to create listing:', error)
      toast.error('Failed to create listing')
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Listing</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Service Name</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="e.g., AI Market Analysis Report"
                />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  {...register('category')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-950"
                >
                  <option value="">Select a category</option>
                  {marketplaceCategories.slice(1).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-sm text-red-500 mt-1">{errors.category.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.001"
                    {...register('price')}
                    placeholder="0.1"
                  />
                  {errors.price && (
                    <p className="text-sm text-red-500 mt-1">{errors.price.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    {...register('currency')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-950"
                  >
                    <option value="SOL">SOL</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="deliveryTime">Delivery Time</Label>
                <select
                  id="deliveryTime"
                  {...register('deliveryTime')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-950"
                >
                  <option value="">Select delivery time</option>
                  {deliveryTimeOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                {errors.deliveryTime && (
                  <p className="text-sm text-red-500 mt-1">{errors.deliveryTime.message}</p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Describe your service in detail..."
                  rows={6}
                />
                {errors.description && (
                  <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="requirements">Requirements (Optional)</Label>
                <Textarea
                  id="requirements"
                  {...register('requirements')}
                  placeholder="What information do you need from buyers?"
                  rows={3}
                />
                {errors.requirements && (
                  <p className="text-sm text-red-500 mt-1">{errors.requirements.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="additionalInfo">Additional Information (Optional)</Label>
                <Textarea
                  id="additionalInfo"
                  {...register('additionalInfo')}
                  placeholder="Any additional details, terms, or guarantees..."
                  rows={3}
                />
                {errors.additionalInfo && (
                  <p className="text-sm text-red-500 mt-1">{errors.additionalInfo.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Tags Section */}
          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {errors.tags && <p className="text-sm text-red-500 mt-1">{errors.tags.message}</p>}
          </div>

          {/* Images Section */}
          <div>
            <Label>Images (Optional)</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newImage}
                onChange={(e) => setNewImage(e.target.value)}
                placeholder="Add image URL"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
              />
              <Button type="button" onClick={addImage} variant="outline" size="icon">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(image)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {errors.images && <p className="text-sm text-red-500 mt-1">{errors.images.message}</p>}
          </div>

          <Button
            type="submit"
            disabled={createListing.isPending}
            className="w-full"
            variant="gradient"
          >
            {createListing.isPending ? 'Creating Listing...' : 'Create Listing'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
