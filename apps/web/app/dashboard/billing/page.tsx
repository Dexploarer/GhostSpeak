'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Coins,
  History,
  ArrowUpRight,
} from 'lucide-react'

// Tier configuration for display
const TIER_COLORS = {
  free: 'bg-gray-500',
  developer: 'bg-blue-500',
  growth: 'bg-green-500',
  enterprise: 'bg-purple-500',
}

export default function BillingPage() {
  const { publicKey } = useWallet()
  const walletAddress = publicKey?.toString()

  // Queries
  const balance = useQuery(api.lib.credits.getBalance, walletAddress ? { walletAddress } : 'skip')
  const pricing = useQuery(api.lib.credits.getPricing, walletAddress ? { walletAddress } : 'skip')
  const usage = useQuery(
    api.lib.credits.getUsageHistory,
    walletAddress ? { walletAddress } : 'skip'
  )
  const tokenPrices = useQuery(api.lib.credits.getTokenPricesPublic, {})

  // State
  const [selectedToken, setSelectedToken] = useState<'USDC' | 'SOL' | 'GHOST'>('USDC')
  const [customAmount, setCustomAmount] = useState<string>('10')
  const [isDepositing, setIsDepositing] = useState(false)
  const [depositResult, setDepositResult] = useState<any>(null)

  // Calculate credits to display in real-time
  const calculateProjectedCredits = () => {
    if (!pricing || !tokenPrices) return 0
    const amount = parseFloat(customAmount) || 0
    if (amount <= 0) return 0

    let usdValue = amount
    if (selectedToken === 'SOL') usdValue = amount * tokenPrices.sol
    if (selectedToken === 'GHOST') usdValue = amount * tokenPrices.ghost

    const baseCredits = (usdValue / pricing.pricePerThousandCredits) * 1000
    const bonus = selectedToken === 'GHOST' ? pricing.ghostBonus : 0

    return Math.floor(baseCredits * (1 + bonus))
  }

  const projectedCredits = calculateProjectedCredits()

  return (
    <div className="container mx-auto py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Billing & Usage</h1>
        <p className="text-muted-foreground mt-2">
          Manage your API credits, subscription tier, and view usage history.
        </p>
      </header>

      {!walletAddress ? (
        <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-muted/20">
          <p className="mb-4 text-lg">Connect your wallet to view billing information</p>
          <WalletMultiButton />
        </div>
      ) : (
        <div className="grid gap-8">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Tier</CardTitle>
                <Badge className={TIER_COLORS[balance?.tier || 'free']}>
                  {(balance?.tier || 'Free').toUpperCase()}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pricing?.tierConfig.rateLimit}/min</div>
                <p className="text-xs text-muted-foreground">Rate Limit</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
                <Coins className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {balance?.totalCredits.toLocaleString() || 0}
                </div>
                <div className="mt-2 h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Math.min(
                        100,
                        ((balance?.freeCredits || 0) /
                          (pricing?.tierConfig.monthlyFreeCredits || 100)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {balance?.freeCredits.toLocaleString()} Free +{' '}
                  {balance?.paidCredits.toLocaleString()} Paid
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Usage</CardTitle>
                <History className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usage?.summary.totalApiCalls.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">API Calls (30 days)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">GHOST Bonus</CardTitle>
                <span className="text-xl">👻</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {((balance?.ghostBonus || 0) * 100).toFixed(0)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Extra credits when paying with GHOST
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Buy Credits Section */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Buy Credits</CardTitle>
                <CardDescription>
                  Add credits to your account. Pay with USDC, SOL, or GHOST.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Currency</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['USDC', 'SOL', 'GHOST'] as const).map((token) => (
                      <Button
                        key={token}
                        variant={selectedToken === token ? 'default' : 'outline'}
                        onClick={() => setSelectedToken(token)}
                        className="w-full"
                      >
                        {token}
                        {token === 'GHOST' && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            +{((balance?.ghostBonus || 0) * 100).toFixed(0)}%
                          </Badge>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount ({selectedToken})</label>
                  <Input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  {tokenPrices && (
                    <p className="text-xs text-muted-foreground">
                      Current Price: $
                      {selectedToken === 'USDC'
                        ? 1
                        : selectedToken === 'SOL'
                          ? tokenPrices.sol.toFixed(2)
                          : tokenPrices.ghost.toFixed(6)}
                    </p>
                  )}
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">You Receive:</span>
                    <span className="text-2xl font-bold text-primary">
                      {projectedCredits.toLocaleString()} Credits
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground flex justify-between">
                    <span>Rate: ${(pricing?.pricePerThousandCredits || 0.01) * 1}/1K</span>
                    {selectedToken === 'GHOST' && (
                      <span className="text-green-500 font-medium">
                        Includes {((balance?.ghostBonus || 0) * 100).toFixed(0)}% Bonus!
                      </span>
                    )}
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Treasury Wallet</AlertTitle>
                  <AlertDescription className="break-all font-mono text-xs mt-1">
                    {pricing?.treasuryWallet}
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter>
                <Button className="w-full" size="lg" disabled={true}>
                  Connect Wallet to Pay (Coming Soon)
                </Button>
              </CardFooter>
            </Card>

            {/* Recent Usage & Deposits */}
            <Card className="md:col-span-1 h-full">
              <CardHeader>
                <CardTitle>History</CardTitle>
                <CardDescription>Recent API calls and credit deposits</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="usage">
                  <TabsList className="w-full">
                    <TabsTrigger value="usage" className="flex-1">
                      API Usage
                    </TabsTrigger>
                    <TabsTrigger value="deposits" className="flex-1">
                      Deposits
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="usage" className="space-y-4 pt-4">
                    {usage?.recentCalls.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No recent API usage found.
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Endpoint</TableHead>
                              <TableHead>Method</TableHead>
                              <TableHead className="text-right">Credits</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {usage?.recentCalls.map((call, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-mono text-xs">{call.endpoint}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {call.method}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right text-destructive">
                                  -{call.credits}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="deposits" className="space-y-4 pt-4">
                    {usage?.deposits.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No deposits found.
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Amount</TableHead>
                              <TableHead>Token</TableHead>
                              <TableHead className="text-right">Time</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {usage?.deposits.map((deposit, i) => (
                              <TableRow key={i}>
                                <TableCell>{deposit.amount}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{deposit.token}</Badge>
                                </TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground">
                                  {new Date(deposit.timestamp).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
