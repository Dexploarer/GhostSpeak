'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Hash, Lock, MessageCircle, Volume2, Users, Settings, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChannelType, type CreateChannelData } from '@/lib/queries/channels'
import { useCreateChannel } from '@/lib/queries/channels'

const createChannelSchema = z.object({
  name: z
    .string()
    .min(1, 'Channel name is required')
    .max(50, 'Channel name too long')
    .regex(/^[a-z0-9-_]+$/, 'Only lowercase letters, numbers, hyphens, and underscores allowed'),
  description: z.string().max(500, 'Description too long').optional(),
  channelType: z.nativeEnum(ChannelType),
  isPrivate: z.boolean().default(false),
  maxMembers: z.string().optional(),
  allowFileSharing: z.boolean().default(true),
  allowExternalInvites: z.boolean().default(true),
  messageRetentionDays: z.string().default('365'),
  maxMessageSize: z.string().default('4096'),
  requireEncryption: z.boolean().default(false),
  slowModeSeconds: z.string().default('0'),
  tags: z.string().optional(),
})

type CreateChannelFormData = z.infer<typeof createChannelSchema>

interface CreateChannelFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  className?: string
}

const channelTypeOptions = [
  {
    value: ChannelType.Public,
    label: 'Public Channel',
    description: 'Anyone can join and view messages',
    icon: Hash,
    color: 'text-blue-500',
  },
  {
    value: ChannelType.Private,
    label: 'Private Channel',
    description: 'Invite-only with restricted access',
    icon: Lock,
    color: 'text-purple-500',
  },
  {
    value: ChannelType.Group,
    label: 'Announcement Channel',
    description: 'One-way communication for important updates',
    icon: Volume2,
    color: 'text-orange-500',
  },
]

export function CreateChannelForm({
  onSuccess,
  onCancel,
  className,
}: CreateChannelFormProps): React.JSX.Element {
  const [tagInput, setTagInput] = React.useState('')
  const [tags, setTags] = React.useState<string[]>([])

  const createChannel = useCreateChannel()

  const form = useForm<CreateChannelFormData>({
    resolver: zodResolver(createChannelSchema),
    defaultValues: {
      name: '',
      description: '',
      channelType: ChannelType.Public,
      isPrivate: false,
      maxMembers: '100',
      allowFileSharing: true,
      allowExternalInvites: true,
      messageRetentionDays: '365',
      maxMessageSize: '4096',
      requireEncryption: false,
      slowModeSeconds: '0',
      tags: '',
    },
  })

  const watchedChannelType = form.watch('channelType')
  const watchedIsPrivate = form.watch('isPrivate')

  // Auto-set privacy based on channel type
  React.useEffect(() => {
    if (watchedChannelType === ChannelType.Private) {
      form.setValue('isPrivate', true)
      form.setValue('requireEncryption', true)
      form.setValue('allowExternalInvites', false)
    } else if (watchedChannelType === ChannelType.Group) {
      form.setValue('allowFileSharing', false)
      form.setValue('slowModeSeconds', '0')
    }
  }, [watchedChannelType, form])

  const onSubmit = async (data: CreateChannelFormData): Promise<void> => {
    try {
      const channelData: CreateChannelData = {
        name: data.name,
        description: data.description || undefined,
        channelType: data.channelType,
        isPrivate: data.isPrivate,
        maxMembers: data.maxMembers ? parseInt(data.maxMembers) : undefined,
        tags,
        settings: {
          allowFileSharing: data.allowFileSharing,
          allowExternalInvites: data.allowExternalInvites,
          messageRetentionDays: parseInt(data.messageRetentionDays),
          maxMessageSize: parseInt(data.maxMessageSize),
          requireEncryption: data.requireEncryption,
          autoArchiveAfterDays: 0,
          slowModeSeconds: parseInt(data.slowModeSeconds),
        },
      }

      await createChannel.mutateAsync(channelData)
      onSuccess?.()
    } catch (error) {
      console.error('Failed to create channel:', error)
    }
  }

  const addTag = (): void => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string): void => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleTagKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const selectedChannelType = channelTypeOptions.find(
    (option) => option.value === watchedChannelType
  )
  const SelectedIcon = selectedChannelType?.icon || Hash

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn('space-y-6', className)}>
      {/* Channel Type Selection */}
      <div className="space-y-4">
        <Label>Channel Type</Label>
        <div className="grid grid-cols-1 gap-3">
          {channelTypeOptions.map((option) => {
            const Icon = option.icon
            const isSelected = watchedChannelType === option.value

            return (
              <Card
                key={option.value}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  isSelected && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                )}
                onClick={() => form.setValue('channelType', option.value)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Icon className={cn('w-6 h-6', option.color)} />
                    <div className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {option.description}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Basic Information */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Channel Name
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <div className="relative">
            <SelectedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="name"
              {...form.register('name')}
              placeholder="e.g., general, dev-discussion, announcements"
              className="pl-10"
            />
          </div>
          {form.formState.errors.name && (
            <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
          )}
          <p className="text-xs text-gray-500">
            Only lowercase letters, numbers, hyphens, and underscores allowed
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            {...form.register('description')}
            placeholder="Describe what this channel is for..."
            rows={3}
          />
          {form.formState.errors.description && (
            <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
          )}
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags (Optional)</Label>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyPress}
              placeholder="Add tags..."
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={addTag}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTag(tag)}
                    className="h-4 w-4 p-0 hover:bg-red-100"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500">Maximum 10 tags</p>
        </div>
      </div>

      <Separator />

      {/* Channel Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Channel Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Privacy Settings */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Privacy & Access
            </h4>

            {watchedChannelType !== ChannelType.Private && (
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="isPrivate">Private Channel</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Require invitation to join
                  </p>
                </div>
                <Switch
                  id="isPrivate"
                  checked={form.watch('isPrivate')}
                  onCheckedChange={(checked: boolean) => form.setValue('isPrivate', checked)}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="allowExternalInvites">Allow External Invites</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Members can invite others
                </p>
              </div>
              <Switch
                id="allowExternalInvites"
                checked={form.watch('allowExternalInvites')}
                onCheckedChange={(checked: boolean) =>
                  form.setValue('allowExternalInvites', checked)
                }
                disabled={watchedIsPrivate}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="requireEncryption">Require Encryption</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  End-to-end encrypted messages
                </p>
              </div>
              <Switch
                id="requireEncryption"
                checked={form.watch('requireEncryption')}
                onCheckedChange={(checked: boolean) => form.setValue('requireEncryption', checked)}
              />
            </div>
          </div>

          <Separator />

          {/* Member Settings */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Member Limits
            </h4>

            <div className="space-y-2">
              <Label htmlFor="maxMembers">Maximum Members</Label>
              <Select
                value={form.watch('maxMembers')}
                onValueChange={(value: string) => form.setValue('maxMembers', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 members</SelectItem>
                  <SelectItem value="25">25 members</SelectItem>
                  <SelectItem value="50">50 members</SelectItem>
                  <SelectItem value="100">100 members</SelectItem>
                  <SelectItem value="250">250 members</SelectItem>
                  <SelectItem value="500">500 members</SelectItem>
                  <SelectItem value="1000">1,000 members</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Message Settings */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Message Settings
            </h4>

            {watchedChannelType !== ChannelType.Group && (
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="allowFileSharing">Allow File Sharing</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Members can upload files
                  </p>
                </div>
                <Switch
                  id="allowFileSharing"
                  checked={form.watch('allowFileSharing')}
                  onCheckedChange={(checked: boolean) => form.setValue('allowFileSharing', checked)}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="messageRetentionDays">Message Retention (Days)</Label>
                <Select
                  value={form.watch('messageRetentionDays')}
                  onValueChange={(value: string) => form.setValue('messageRetentionDays', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                    <SelectItem value="0">Forever</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slowModeSeconds">Slow Mode (Seconds)</Label>
                <Select
                  value={form.watch('slowModeSeconds')}
                  onValueChange={(value: string) => form.setValue('slowModeSeconds', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Off</SelectItem>
                    <SelectItem value="5">5 seconds</SelectItem>
                    <SelectItem value="10">10 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={createChannel.isPending}
          className="flex items-center gap-2"
        >
          <SelectedIcon className="w-4 h-4" />
          {createChannel.isPending ? 'Creating...' : 'Create Channel'}
        </Button>
      </div>
    </form>
  )
}
