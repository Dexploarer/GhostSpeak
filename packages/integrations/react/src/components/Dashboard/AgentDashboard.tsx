import React, { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { DashboardService, DashboardData } from '@ghostspeak/sdk';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Progress } from '../ui/Progress';
import { formatSol, formatDate, formatNumber } from '../../utils/format';

interface AgentDashboardProps {
  agentPubkey: PublicKey;
  dashboardService: DashboardService;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({
  agentPubkey,
  dashboardService
}) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, [agentPubkey]);

  const loadDashboard = async () => {
    try {
      setError(null);
      const data = await dashboardService.getDashboardData(agentPubkey);
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
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
            <Button onClick={loadDashboard} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { profile, earnings, activeOrders, metrics } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{profile.name}</h1>
          <p className="text-muted-foreground mt-1">{profile.description}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={profile.isActive ? 'default' : 'secondary'}>
            {profile.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <span className="text-2xl">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSol(earnings.totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">
              +{formatSol(earnings.currentPeriodEarnings)} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <span className="text-2xl">📋</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              {profile.totalOrders} total orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <span className="text-2xl">✅</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completionRate.toFixed(1)}%</div>
            <Progress value={metrics.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <span className="text-2xl">⭐</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(metrics.totalReviews)} reviews
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Active Orders</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeOrders.slice(0, 5).map((order) => (
                    <div key={order.orderId.toString()} className="flex items-center space-x-4">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{order.serviceName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatSol(order.price)} • {formatDate(order.startTime)}
                        </p>
                      </div>
                      <Badge variant="outline">{order.progress}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Response Time</span>
                    <span className="text-sm font-medium">
                      {Math.round(metrics.responseTime / 3600)}h
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Dispute Rate</span>
                    <span className="text-sm font-medium">{metrics.disputeRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Avg Delivery Time</span>
                    <span className="text-sm font-medium">
                      {Math.round(metrics.averageDeliveryTime / 86400)}d
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Reputation Score</span>
                    <span className="text-sm font-medium">{profile.reputation}/100</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Orders ({activeOrders.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeOrders.map((order) => (
                  <div
                    key={order.orderId.toString()}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{order.serviceName}</h4>
                      <Badge variant="outline">{order.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Buyer: {order.buyer.toString().slice(0, 8)}...</span>
                      <span>{formatSol(order.price)}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Progress</span>
                        <span>{order.progress}%</span>
                      </div>
                      <Progress value={order.progress} />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Started: {formatDate(order.startTime)}</span>
                      <span>Deadline: {formatDate(order.deadline)}</span>
                    </div>
                  </div>
                ))}
                {activeOrders.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No active orders</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Earnings Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Earnings</span>
                  <span className="font-medium">{formatSol(earnings.totalEarnings)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Period</span>
                  <span className="font-medium">{formatSol(earnings.currentPeriodEarnings)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending</span>
                  <span className="font-medium">{formatSol(earnings.pendingEarnings)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Available</span>
                  <span className="font-medium text-green-600">
                    {formatSol(earnings.withdrawableBalance)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Earnings by Period</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {earnings.earningsByPeriod.slice(0, 6).map((period) => (
                    <div key={period.period} className="flex justify-between items-center">
                      <span className="text-sm">{period.period}</span>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatSol(period.earnings)}</div>
                        <div className="text-xs text-muted-foreground">
                          {period.orderCount} orders
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Order Volume</h4>
                    <div className="space-y-1">
                      {metrics.orderVolume.slice(-7).map((volume) => (
                        <div key={volume.date} className="flex justify-between text-sm">
                          <span>{formatDate(new Date(volume.date))}</span>
                          <span>{volume.count} orders</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Key Metrics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Completion Rate</span>
                        <span className="text-sm font-medium">
                          {metrics.completionRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Dispute Rate</span>
                        <span className="text-sm font-medium">
                          {metrics.disputeRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Average Rating</span>
                        <span className="text-sm font-medium">
                          {metrics.averageRating.toFixed(1)}/5.0
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};