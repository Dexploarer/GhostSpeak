'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Play,
  FileText,
  MessageCircle,
  Upload,
  Download,
  Send,
  Target,
  Eye,
  Loader2,
} from 'lucide-react'
import { formatAddress, formatSol } from '@/lib/utils'
import type { WorkOrder, WorkOrderStatus } from '@/lib/queries/work-orders'
import { useSubmitDelivery, useVerifyDelivery, useProcessPayment, useSendWorkOrderMessage } from '@/lib/queries/work-orders'
import { toast } from 'sonner'

interface WorkOrderDetailProps {
  workOrder: WorkOrder | null
  isOpen: boolean
  onClose: () => void
  userAddress?: string
}

const statusConfig = {
  Created: { color: 'bg-gray-500', icon: FileText, label: 'Created' },
  Open: { color: 'bg-blue-500', icon: Play, label: 'Open' },
  Submitted: { color: 'bg-yellow-500', icon: Clock, label: 'Under Review' },
  InProgress: { color: 'bg-purple-500', icon: Play, label: 'In Progress' },
  Approved: { color: 'bg-green-500', icon: CheckCircle, label: 'Approved' },
  Completed: { color: 'bg-green-600', icon: CheckCircle, label: 'Completed' },
  Cancelled: { color: 'bg-red-500', icon: XCircle, label: 'Cancelled' },
} as const

function getStatusBadge(status: WorkOrderStatus) {
  const config = statusConfig[status]
  const Icon = config.icon
  return (
    <Badge variant="outline" className={`${config.color} text-white border-0`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  )
}

function getUserRole(workOrder: WorkOrder, userAddress?: string): 'client' | 'provider' | 'none' {
  if (!userAddress) return 'none'
  if (workOrder.client === userAddress) return 'client'
  if (workOrder.provider === userAddress) return 'provider'
  return 'none'
}

export function WorkOrderDetail({ workOrder, isOpen, onClose, userAddress }: WorkOrderDetailProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'milestones' | 'communication' | 'deliverables'
  >('overview')
  const [newMessage, setNewMessage] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [reviewFeedback, setReviewFeedback] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])

  const submitDelivery = useSubmitDelivery()
  const verifyDelivery = useVerifyDelivery()
  const processPayment = useProcessPayment()
  const sendMessage = useSendWorkOrderMessage()

  if (!workOrder) return null

  const userRole = getUserRole(workOrder, userAddress)
  const isOverdue = new Date() > workOrder.deadline && workOrder.status !== 'Completed'
  const completedMilestones = workOrder.milestones.filter((m) => m.completed)
  const totalMilestones = workOrder.milestones.length
  const progress = totalMilestones > 0 ? (completedMilestones.length / totalMilestones) * 100 : 0

  const handleSubmitDelivery = async () => {
    if (!deliveryNotes.trim()) {
      toast.error('Please provide delivery notes')
      return
    }

    try {
      await submitDelivery.mutateAsync({
        workOrderAddress: workOrder.address,
        deliverables: selectedFiles,
        notes: deliveryNotes,
      })
      setDeliveryNotes('')
      setSelectedFiles([])
    } catch {
      // Error handled by mutation
    }
  }

  const handleVerifyDelivery = async (approved: boolean) => {
    if (!reviewFeedback.trim()) {
      toast.error('Please provide feedback')
      return
    }

    try {
      await verifyDelivery.mutateAsync({
        workOrderAddress: workOrder.address,
        approved,
        feedback: reviewFeedback,
      })
      setReviewFeedback('')
    } catch {
      // Error handled by mutation
    }
  }

  const handleProcessPayment = async (milestoneIds: string[]) => {
    try {
      await processPayment.mutateAsync({
        workOrderAddress: workOrder.address,
        milestoneIds,
      })
    } catch {
      // Error handled by mutation
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'milestones', label: 'Milestones', icon: Target, count: totalMilestones },
    {
      id: 'communication',
      label: 'Messages',
      icon: MessageCircle,
      count: workOrder.communicationThread.length,
    },
    {
      id: 'deliverables',
      label: 'Deliverables',
      icon: FileText,
      count: workOrder.deliverables.length,
    },
  ] as const

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl mb-2">{workOrder.title}</DialogTitle>
              <div className="flex items-center gap-2">
                {getStatusBadge(workOrder.status)}
                {userRole !== 'none' && (
                  <Badge variant="outline" className="text-xs">
                    {userRole === 'client' ? 'As Client' : 'As Provider'}
                  </Badge>
                )}
                {isOverdue && (
                  <Badge variant="outline" className="bg-red-500 text-white border-0 text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Overdue
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatSol(workOrder.paymentAmount)}
              </p>
              <p className="text-sm text-gray-500">Total Payment</p>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {'count' in tab && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    {tab.count}
                  </Badge>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6 p-6">
              {/* Description */}
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-gray-600 dark:text-gray-300">{workOrder.description}</p>
              </div>

              {/* Project Details */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Client</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium">
                        {workOrder.clientName?.[0] || 'C'}
                      </div>
                      <div>
                        <p className="font-medium">{workOrder.clientName || 'Unknown Client'}</p>
                        <p className="text-sm text-gray-500">{formatAddress(workOrder.client)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Provider</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-linear-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-medium">
                        {workOrder.providerName?.[0] || 'P'}
                      </div>
                      <div>
                        <p className="font-medium">
                          {workOrder.providerName || 'Unknown Provider'}
                        </p>
                        <p className="text-sm text-gray-500">{formatAddress(workOrder.provider)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="font-semibold mb-3">Timeline</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium mx-auto mb-2">
                      ✓
                    </div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-xs text-gray-500">
                      {workOrder.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium mx-auto mb-2 ${
                        workOrder.status === 'InProgress' || workOrder.status === 'Completed'
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                      }`}
                    >
                      {workOrder.status === 'InProgress' || workOrder.status === 'Completed'
                        ? '✓'
                        : '2'}
                    </div>
                    <p className="text-sm font-medium">In Progress</p>
                    <p className="text-xs text-gray-500">
                      {workOrder.status === 'InProgress' || workOrder.status === 'Completed'
                        ? 'Active'
                        : 'Pending'}
                    </p>
                  </div>
                  <div className="text-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium mx-auto mb-2 ${
                        workOrder.status === 'Completed' ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      {workOrder.status === 'Completed' ? '✓' : '3'}
                    </div>
                    <p className="text-sm font-medium">Completed</p>
                    <p className="text-xs text-gray-500">
                      {workOrder.deliveredAt
                        ? workOrder.deliveredAt.toLocaleDateString()
                        : 'Pending'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Requirements */}
              <div>
                <h3 className="font-semibold mb-3">Requirements</h3>
                <div className="space-y-2">
                  {workOrder.requirements.map((requirement, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>{requirement}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'milestones' && (
            <div className="space-y-4 p-6">
              {workOrder.milestones.length > 0 ? (
                <>
                  {/* Progress Overview */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Overall Progress</span>
                        <span className="text-sm text-gray-500">
                          {completedMilestones.length}/{totalMilestones} milestones
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-linear-to-r from-cyan-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Milestone List */}
                  <div className="space-y-3">
                    {workOrder.milestones.map((milestone, index) => (
                      <Card
                        key={milestone.id}
                        className={milestone.completed ? 'border-green-200' : ''}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${
                                    milestone.completed ? 'bg-green-500' : 'bg-gray-400'
                                  }`}
                                >
                                  {milestone.completed ? '✓' : index + 1}
                                </div>
                                <h4 className="font-medium">{milestone.title}</h4>
                                <Badge
                                  variant={milestone.completed ? 'success' : 'secondary'}
                                  className="text-xs"
                                >
                                  {milestone.completed ? 'Completed' : 'Pending'}
                                </Badge>
                              </div>
                              {milestone.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                  {milestone.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span>Amount: {formatSol(milestone.amount)}</span>
                                {milestone.completedAt && (
                                  <span>
                                    Completed: {milestone.completedAt.toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-green-600">
                                {formatSol(milestone.amount)}
                              </div>
                              {milestone.completed &&
                                !milestone.paymentReleased &&
                                userRole === 'client' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleProcessPayment([milestone.id])}
                                    disabled={processPayment.isPending}
                                  >
                                    Release Payment
                                  </Button>
                                )}
                              {milestone.paymentReleased && (
                                <Badge variant="success" className="text-xs">
                                  Payment Released
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">No milestones defined for this work order</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'communication' && (
            <div className="space-y-4 p-6">
              {/* Message History */}
              <div className="space-y-4 max-h-60 overflow-y-auto">
                {workOrder.communicationThread.map((message) => {
                  const isOwnMessage = message.sender === userAddress
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          isOwnMessage ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {message.senderName || formatAddress(message.sender)}
                          </span>
                          <span className="text-xs opacity-70">
                            {message.timestamp.toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{message.content}</p>
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.attachments.map((attachment, index) => (
                              <div key={index} className="flex items-center gap-2 text-xs">
                                <FileText className="w-3 h-3" />
                                <span>{attachment}</span>
                                <Download className="w-3 h-3 cursor-pointer" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* New Message */}
              <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                <div className="flex gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    rows={3}
                    className="flex-1"
                  />
                  <Button
                    onClick={async () => {
                      if (newMessage.trim()) {
                        try {
                          await sendMessage.mutateAsync({
                            workOrderAddress: workOrder.address,
                            content: newMessage.trim(),
                          })
                          setNewMessage('')
                        } catch (error) {
                          console.error('Failed to send message:', error)
                        }
                      }
                    }}
                    className="self-end"
                    disabled={sendMessage.isPending || !newMessage.trim()}
                  >
                    {sendMessage.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'deliverables' && (
            <div className="space-y-4 p-6">
              {/* Existing Deliverables */}
              {workOrder.deliverables.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Submitted Deliverables</h3>
                  <div className="space-y-2">
                    {workOrder.deliverables.map((deliverable, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span>{deliverable}</span>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Delivery (Provider) */}
              {userRole === 'provider' && workOrder.status === 'InProgress' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Submit Work Delivery</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="deliveryNotes">Delivery Notes</Label>
                      <Textarea
                        id="deliveryNotes"
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        placeholder="Describe what you've completed and any important notes..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>File Uploads (Mock)</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-500">Click to upload files or drag and drop</p>
                        <p className="text-xs text-gray-400 mt-1">PDF, DOC, ZIP files up to 10MB</p>
                      </div>
                    </div>
                    <Button
                      onClick={handleSubmitDelivery}
                      disabled={submitDelivery.isPending || !deliveryNotes.trim()}
                      className="w-full"
                      variant="premium"
                    >
                      {submitDelivery.isPending ? 'Submitting...' : 'Submit Delivery'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Review Delivery (Client) */}
              {userRole === 'client' && workOrder.status === 'Submitted' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Review Delivery</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="reviewFeedback">Review Feedback</Label>
                      <Textarea
                        id="reviewFeedback"
                        value={reviewFeedback}
                        onChange={(e) => setReviewFeedback(e.target.value)}
                        placeholder="Provide feedback on the delivered work..."
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleVerifyDelivery(true)}
                        disabled={verifyDelivery.isPending || !reviewFeedback.trim()}
                        className="flex-1"
                        variant="premium"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve Work
                      </Button>
                      <Button
                        onClick={() => handleVerifyDelivery(false)}
                        disabled={verifyDelivery.isPending || !reviewFeedback.trim()}
                        className="flex-1"
                        variant="outline"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Request Changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Last updated: {workOrder.updatedAt.toLocaleDateString()}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {workOrder.status === 'Cancelled' && (
                <Button variant="outline" disabled>
                  Work Order Cancelled
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
