import React, { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { ServiceTrackingService, ServiceStatus, Milestone, MilestoneStatus } from '@ghostspeak/sdk';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Timeline, TimelineItem } from '../ui/Timeline';
import { formatDate, formatDuration } from '../../utils/format';

interface OrderTrackingProps {
  orderId: PublicKey;
  trackingService: ServiceTrackingService;
  isAgent?: boolean;
}

export const OrderTracking: React.FC<OrderTrackingProps> = ({
  orderId,
  trackingService,
  isAgent = false
}) => {
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingProgress, setUpdatingProgress] = useState(false);

  useEffect(() => {
    loadServiceStatus();
  }, [orderId]);

  const loadServiceStatus = async () => {
    try {
      setError(null);
      const status = await trackingService.getServiceStatus(orderId);
      setServiceStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load service status');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgress = async (milestoneId: string, progress: number) => {
    if (!serviceStatus) return;
    
    setUpdatingProgress(true);
    try {
      await trackingService.updateMilestoneProgress(orderId, milestoneId, progress);
      await loadServiceStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update progress');
    } finally {
      setUpdatingProgress(false);
    }
  };

  const getMilestoneStatusColor = (status: MilestoneStatus): string => {
    switch (status) {
      case MilestoneStatus.Completed:
      case MilestoneStatus.Verified:
        return 'bg-green-500';
      case MilestoneStatus.InProgress:
        return 'bg-blue-500';
      case MilestoneStatus.Pending:
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={loadServiceStatus} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!serviceStatus) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Order Tracking</h2>
          <p className="text-muted-foreground">Order ID: {orderId.toString().slice(0, 8)}...</p>
        </div>
        <Badge variant={getStatusBadgeVariant(serviceStatus.status)}>
          {serviceStatus.status.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Overall Progress</span>
            <span className="text-sm font-normal">{serviceStatus.progress}%</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={serviceStatus.progress} className="mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Status: </span>
              <span className="font-medium">{serviceStatus.status.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Milestones: </span>
              <span className="font-medium">
                {serviceStatus.milestones.filter(m => m.status === MilestoneStatus.Completed).length}/
                {serviceStatus.milestones.length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Time Spent: </span>
              <span className="font-medium">
                {formatDuration(serviceStatus.timeTracking.totalTime)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="milestones" className="space-y-4">
        <TabsList>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="updates">Updates</TabsTrigger>
          <TabsTrigger value="time">Time Tracking</TabsTrigger>
          {serviceStatus.deliveryConfirmation && (
            <TabsTrigger value="delivery">Delivery</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="milestones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Milestones</CardTitle>
            </CardHeader>
            <CardContent>
              {serviceStatus.milestones.length > 0 ? (
                <div className="space-y-4">
                  {serviceStatus.milestones.map((milestone) => (
                    <div key={milestone.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{milestone.name}</h4>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${getMilestoneStatusColor(milestone.status)}`}></div>
                          <Badge variant="outline">{milestone.status.replace('_', ' ')}</Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">{milestone.description}</p>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Progress</span>
                          <span>{milestone.progress}%</span>
                        </div>
                        <Progress value={milestone.progress} />
                      </div>

                      {milestone.deliverables && milestone.deliverables.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-sm font-medium mb-1">Deliverables:</h5>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {milestone.deliverables.map((deliverable, index) => (
                              <li key={index} className="flex items-center space-x-2">
                                <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                                <span>{deliverable}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
                        <span>Due: {formatDate(milestone.dueDate)}</span>
                        {milestone.completedAt && (
                          <span>Completed: {formatDate(milestone.completedAt)}</span>
                        )}
                      </div>

                      {isAgent && milestone.status !== MilestoneStatus.Completed && (
                        <div className="mt-3 flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateProgress(milestone.id, Math.min(milestone.progress + 25, 100))}
                            disabled={updatingProgress}
                          >
                            Update Progress
                          </Button>
                          {milestone.progress === 100 && milestone.status !== MilestoneStatus.Completed && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateProgress(milestone.id, 100)}
                              disabled={updatingProgress}
                            >
                              Mark Complete
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No milestones defined for this order</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="updates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status Updates</CardTitle>
            </CardHeader>
            <CardContent>
              {serviceStatus.updates.length > 0 ? (
                <Timeline>
                  {serviceStatus.updates.map((update) => (
                    <TimelineItem
                      key={update.id}
                      title={update.title}
                      description={update.description}
                      timestamp={formatDate(update.timestamp)}
                      type={update.type}
                    />
                  ))}
                </Timeline>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No updates yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Time Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Time</span>
                  <span className="font-medium">
                    {formatDuration(serviceStatus.timeTracking.totalTime)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Active Sessions</span>
                  <span className="font-medium">{serviceStatus.timeTracking.sessions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Remaining</span>
                  <span className="font-medium">
                    {formatDuration(serviceStatus.timeTracking.estimatedTimeRemaining)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {serviceStatus.timeTracking.sessions.slice(-5).map((session, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium">
                          {formatDuration(session.duration)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(session.startTime)}
                        </div>
                      </div>
                      {session.description && (
                        <div className="text-xs text-muted-foreground max-w-32 truncate">
                          {session.description}
                        </div>
                      )}
                    </div>
                  ))}
                  {serviceStatus.timeTracking.sessions.length === 0 && (
                    <p className="text-sm text-muted-foreground">No time sessions recorded</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {serviceStatus.deliveryConfirmation && (
          <TabsContent value="delivery" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Confirmation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Delivered At:</span>
                    <p className="font-medium">
                      {formatDate(serviceStatus.deliveryConfirmation.deliveredAt)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Delivery Method:</span>
                    <p className="font-medium capitalize">
                      {serviceStatus.deliveryConfirmation.deliveryMethod.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                {serviceStatus.deliveryConfirmation.attachments && 
                 serviceStatus.deliveryConfirmation.attachments.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Attachments:</span>
                    <div className="mt-2 space-y-1">
                      {serviceStatus.deliveryConfirmation.attachments.map((attachment, index) => (
                        <div key={index} className="text-sm">
                          <a href={attachment} className="text-blue-600 hover:underline">
                            Attachment {index + 1}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {serviceStatus.deliveryConfirmation.notes && (
                  <div>
                    <span className="text-sm text-muted-foreground">Notes:</span>
                    <p className="mt-1 text-sm">{serviceStatus.deliveryConfirmation.notes}</p>
                  </div>
                )}

                <div>
                  <span className="text-sm text-muted-foreground">Signature:</span>
                  <p className="mt-1 text-xs font-mono bg-muted p-2 rounded">
                    {serviceStatus.deliveryConfirmation.signature}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};