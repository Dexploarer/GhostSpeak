'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Send,
  Paperclip,
  Smile,
  X,
  Reply,
  Image,
  FileText,
  Loader2,
  Hash,
  AtSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message, SendMessageData } from '@/lib/queries/channels'
import { useSendMessage } from '@/lib/queries/channels'
import { toast } from 'sonner'

const messageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(4096, 'Message too long'),
})

type MessageFormData = z.infer<typeof messageSchema>

interface MessageComposerProps {
  channelAddress: string
  replyTo?: Message
  onClearReply?: () => void
  placeholder?: string
  maxLength?: number
  disabled?: boolean
  className?: string
}

const emojiOptions = ['👍', '👎', '❤️', '🎉', '😄', '😢', '😮', '😡', '🚀', '👀']

export function MessageComposer({
  channelAddress,
  replyTo,
  onClearReply,
  placeholder = 'Type a message...',
  maxLength = 4096,
  disabled = false,
  className,
}: MessageComposerProps): React.JSX.Element {
  const [files, setFiles] = React.useState<File[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false)
  const [mentions, setMentions] = React.useState<string[]>([])
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const sendMessage = useSendMessage()

  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      content: '',
    },
  })

  const watchedContent = form.watch('content')
  const remainingChars = maxLength - watchedContent.length

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [watchedContent])

  // Focus textarea on mount
  React.useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus()
    }
  }, [disabled])

  const onSubmit = async (data: MessageFormData): Promise<void> => {
    if (disabled || !data.content.trim()) return

    try {
      const messageData: SendMessageData = {
        channelAddress,
        content: data.content.trim(),
        replyTo: replyTo?.id,
        mentions,
        attachments: files,
      }

      await sendMessage.mutateAsync(messageData)

      // Reset form
      form.reset()
      setFiles([])
      setMentions([])
      onClearReply?.()

      // Refocus textarea
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      form.handleSubmit(onSubmit)()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const selectedFiles = Array.from(e.target.files || [])

    // Validate file size (10MB limit)
    const oversizedFiles = selectedFiles.filter((file) => file.size > 10 * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      toast.error('Some files are too large (max 10MB per file)')
      return
    }

    // Limit to 5 files
    const newFiles = [...files, ...selectedFiles].slice(0, 5)
    setFiles(newFiles)

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number): void => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const insertEmoji = (emoji: string): void => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = form.getValues('content')
    const newText = text.slice(0, start) + emoji + text.slice(end)

    form.setValue('content', newText)
    setShowEmojiPicker(false)

    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + emoji.length, start + emoji.length)
    }, 0)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (file: File): React.ReactNode => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-4 h-4" alt="Image file" />
    }
    return <FileText className="w-4 h-4" />
  }

  return (
    <div className={cn('border-t bg-white dark:bg-gray-900 p-4', className)}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        {/* Reply Context */}
        {replyTo && (
          <Card className="p-3 bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-500">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Reply className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Replying to {replyTo.senderName || replyTo.sender.slice(0, 8) + '...'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {replyTo.content}
                </p>
              </div>
              {onClearReply && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClearReply}
                  className="flex-shrink-0 h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* File Attachments */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((file, index) => (
              <Badge
                key={index}
                variant="outline"
                className="flex items-center gap-2 px-3 py-2 max-w-xs"
              >
                {getFileIcon(file)}
                <span className="truncate text-xs">
                  {file.name} ({formatFileSize(file.size)})
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="h-4 w-4 p-0 hover:bg-red-100"
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        {/* Message Input */}
        <div className="relative">
          <Textarea
            {...form.register('content', {
              setValueAs: (value) => {
                // Auto-resize textarea
                if (textareaRef.current) {
                  textareaRef.current.style.height = 'auto'
                  textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
                }
                return value
              },
            })}
            ref={(e) => {
              form.register('content').ref(e)
              textareaRef.current = e
            }}
            placeholder={disabled ? 'You cannot send messages in this channel' : placeholder}
            disabled={disabled || sendMessage.isPending}
            onKeyDown={handleKeyPress}
            className={cn(
              'min-h-[44px] max-h-[120px] resize-none pr-24',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={{ paddingRight: '96px' }}
          />

          {/* Character Counter */}
          {remainingChars < 100 && (
            <div className="absolute bottom-2 right-2 text-xs text-gray-500">
              <span className={cn(remainingChars < 0 && 'text-red-500')}>{remainingChars}</span>
            </div>
          )}
        </div>

        {form.formState.errors.content && (
          <p className="text-sm text-red-500">{form.formState.errors.content.message}</p>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* File Upload */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || files.length >= 5}
              className="h-9 w-9 p-0"
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            {/* Emoji Picker */}
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={disabled}
                className="h-9 w-9 p-0"
              >
                <Smile className="w-4 h-4" />
              </Button>

              {showEmojiPicker && (
                <Card className="absolute bottom-full mb-2 left-0 p-3 z-10 shadow-lg">
                  <div className="grid grid-cols-5 gap-2">
                    {emojiOptions.map((emoji) => (
                      <Button
                        key={emoji}
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => insertEmoji(emoji)}
                        className="h-8 w-8 p-0 text-lg hover:bg-gray-100"
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Helper Text */}
            <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500 ml-4">
              <div className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                <span>Channel mention</span>
              </div>
              <div className="flex items-center gap-1">
                <AtSign className="w-3 h-3" />
                <span>User mention</span>
              </div>
              <div>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Enter</kbd>{' '}
                to send
              </div>
            </div>
          </div>

          {/* Send Button */}
          <Button
            type="submit"
            disabled={
              disabled || !watchedContent.trim() || remainingChars < 0 || sendMessage.isPending
            }
            className="flex items-center gap-2"
          >
            {sendMessage.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send
          </Button>
        </div>
      </form>
    </div>
  )
}
