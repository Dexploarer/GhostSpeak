'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Plus, Clock, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';

export default function EscrowPage() {
  const [activeTab, setActiveTab] = useState('active');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Ghost Protect Escrow
          </h1>
          <p className="text-muted-foreground mt-2">
            Secure B2C escrow with buyer protection and dispute resolution
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Escrow
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Escrows</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">Successfully released</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Disputes</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Under arbitration</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">125.5</div>
            <p className="text-xs text-muted-foreground">SOL escrowed</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {[
            {
              id: 'ESC-001',
              buyer: '7xKXt...9Gk',
              amount: '5.0 SOL',
              service: 'AI Model Training',
              deadline: '3 days',
              status: 'awaiting_delivery',
            },
            {
              id: 'ESC-002',
              buyer: '9qRsT...2Mp',
              amount: '2.5 SOL',
              service: 'Content Generation',
              deadline: '5 days',
              status: 'funded',
            },
            {
              id: 'ESC-003',
              buyer: '4hWxY...7Kl',
              amount: '10.0 SOL',
              service: 'Data Analysis',
              deadline: '1 day',
              status: 'delivery_submitted',
            },
          ].map((escrow) => (
            <Card key={escrow.id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">{escrow.id}</CardTitle>
                    <CardDescription>{escrow.service}</CardDescription>
                  </div>
                  <Badge
                    variant={
                      escrow.status === 'delivery_submitted'
                        ? 'default'
                        : escrow.status === 'funded'
                          ? 'secondary'
                          : 'outline'
                    }
                  >
                    {escrow.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Buyer</p>
                    <code className="text-sm">{escrow.buyer}</code>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="text-sm font-medium">{escrow.amount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Deadline</p>
                    <p className="text-sm font-medium">{escrow.deadline}</p>
                  </div>
                  <div className="flex gap-2">
                    {escrow.status === 'awaiting_delivery' && (
                      <Button size="sm" variant="outline">
                        Submit Delivery
                      </Button>
                    )}
                    {escrow.status === 'funded' && (
                      <Button size="sm">Start Work</Button>
                    )}
                    {escrow.status === 'delivery_submitted' && (
                      <Button size="sm" disabled>
                        Awaiting Buyer Approval
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Escrows</CardTitle>
              <CardDescription>Successfully released transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                24 escrows successfully completed with 100% buyer satisfaction rate
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disputes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                Active Disputes
              </CardTitle>
              <CardDescription>Escrows under arbitration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    id: 'ESC-042',
                    buyer: '5nPqR...8Jh',
                    amount: '7.5 SOL',
                    service: 'API Integration',
                    filedDate: '2 days ago',
                    reason: 'Incomplete delivery',
                  },
                ].map((dispute) => (
                  <div
                    key={dispute.id}
                    className="p-4 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{dispute.id}</p>
                          <Badge variant="destructive">Disputed</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {dispute.service}
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Buyer:</span>{' '}
                            <code>{dispute.buyer}</code>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Amount:</span>{' '}
                            {dispute.amount}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Filed:</span>{' '}
                            {dispute.filedDate}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Reason:</span>{' '}
                            {dispute.reason}
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
