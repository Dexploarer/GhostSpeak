'use client'

import React, { useState } from 'react'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { PageHeader } from '@/components/dashboard/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Shield,
  Plus,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Wallet,
  Key,
  Loader2,
} from 'lucide-react'
import {
  CreateMultisigForm,
  MultisigCard,
  PendingTransactionCard,
  MultisigTransactionFlow,
} from '@/components/multisig'
import {
  useMultisigs,
  useMultisigsAsSigner,
  type Multisig,
  TransactionStatus,
  TransactionType,
  TransactionPriority,
} from '@/lib/queries/multisig'
import { useCrossmintSigner } from '@/lib/hooks/useCrossmintSigner'
import type { Address } from '@solana/kit'

// Demo data for UI demonstration
const DEMO_MULTISIGS: Multisig[] = [
  {
    address: 'DemoMultisig1111111111111111111111111111111' as Address,
    multisigId: '1001',
    threshold: 2,
    signers: [
      'Signer111111111111111111111111111111111111' as Address,
      'Signer222222222222222222222222222222222222' as Address,
      'Signer333333333333333333333333333333333333' as Address,
    ],
    owner: 'Owner1111111111111111111111111111111111111' as Address,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    nonce: 5,
    pendingTransactions: [
      {
        transactionId: 'tx001',
        transactionType: TransactionType.Transfer,
        target: 'Target111111111111111111111111111111111111' as Address,
        data: '0x',
        requiredSignatures: 2,
        currentSignatures: [
          {
            signer: 'Signer111111111111111111111111111111111111' as Address,
            signedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            signatureMethod: 'ed25519',
          },
        ],
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000),
        priority: TransactionPriority.Normal,
        status: TransactionStatus.PartiallyApproved,
        description: 'Transfer 100 USDC to marketing wallet',
      },
    ],
    config: {
      maxSigners: 10,
      defaultTimeout: 86400,
      allowEmergencyOverride: true,
      emergencyThreshold: 1,
      autoExecute: true,
      signerChangeThreshold: 2,
    },
    emergencyConfig: {
      emergencyContacts: [],
      emergencyThreshold: 1,
      emergencyTimeout: 3600,
      freezeEnabled: true,
      frozen: false,
    },
  },
  {
    address: 'DemoMultisig2222222222222222222222222222222' as Address,
    multisigId: '1002',
    threshold: 3,
    signers: [
      'SignerA11111111111111111111111111111111111' as Address,
      'SignerB11111111111111111111111111111111111' as Address,
      'SignerC11111111111111111111111111111111111' as Address,
      'SignerD11111111111111111111111111111111111' as Address,
      'SignerE11111111111111111111111111111111111' as Address,
    ],
    owner: 'Owner1111111111111111111111111111111111111' as Address,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    nonce: 23,
    pendingTransactions: [
      {
        transactionId: 'tx002',
        transactionType: TransactionType.ProtocolUpgrade,
        target: 'Program11111111111111111111111111111111111' as Address,
        data: '0x',
        requiredSignatures: 3,
        currentSignatures: [
          {
            signer: 'SignerA11111111111111111111111111111111111' as Address,
            signedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            signatureMethod: 'ed25519',
          },
          {
            signer: 'SignerB11111111111111111111111111111111111' as Address,
            signedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
            signatureMethod: 'ed25519',
          },
          {
            signer: 'SignerC11111111111111111111111111111111111' as Address,
            signedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            signatureMethod: 'ed25519',
          },
        ],
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 120 * 60 * 60 * 1000),
        priority: TransactionPriority.High,
        status: TransactionStatus.FullyApproved,
        description: 'Upgrade to GhostSpeak v2.1.0',
      },
    ],
    config: {
      maxSigners: 10,
      defaultTimeout: 172800,
      allowEmergencyOverride: true,
      emergencyThreshold: 2,
      autoExecute: false,
      signerChangeThreshold: 3,
    },
    emergencyConfig: {
      emergencyContacts: [],
      emergencyThreshold: 2,
      emergencyTimeout: 7200,
      freezeEnabled: true,
      frozen: false,
    },
  },
]

export default function MultisigPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedMultisig, setSelectedMultisig] = useState<Multisig | null>(null)

  const { address, isConnected } = useCrossmintSigner()
  const { data: ownedMultisigs, isLoading: loadingOwned } = useMultisigs()
  const { data: signerMultisigs, isLoading: loadingSigner } = useMultisigsAsSigner()

  // Use demo data when no real data is available
  const displayMultisigs = ownedMultisigs?.length ? ownedMultisigs : DEMO_MULTISIGS
  const displaySignerMultisigs = signerMultisigs ?? []

  // Calculate stats
  const totalMultisigs = displayMultisigs.length + displaySignerMultisigs.length
  const pendingTransactions = displayMultisigs.reduce(
    (acc, m) =>
      acc +
      m.pendingTransactions.filter(
        (tx) =>
          tx.status === TransactionStatus.Pending ||
          tx.status === TransactionStatus.PartiallyApproved
      ).length,
    0
  )
  const readyToExecute = displayMultisigs.reduce(
    (acc, m) =>
      acc +
      m.pendingTransactions.filter((tx) => tx.status === TransactionStatus.FullyApproved).length,
    0
  )
  const totalSigners = displayMultisigs.reduce((acc, m) => acc + m.signers.length, 0)

  const allPendingTransactions = displayMultisigs.flatMap((m) =>
    m.pendingTransactions
      .filter(
        (tx) =>
          tx.status !== TransactionStatus.Executed && tx.status !== TransactionStatus.Cancelled
      )
      .map((tx) => ({ ...tx, multisigAddress: m.address, threshold: m.threshold }))
  )

  return (
    <div className="space-y-8">
      <PageHeader
        title="Multisig Wallets"
        description="Manage multi-signature wallets for secure governance operations"
      >
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Multisig
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <GlassCard className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalMultisigs}</p>
            <p className="text-sm text-muted-foreground">Total Multisigs</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Clock className="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{pendingTransactions}</p>
            <p className="text-sm text-muted-foreground">Pending Transactions</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{readyToExecute}</p>
            <p className="text-sm text-muted-foreground">Ready to Execute</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalSigners}</p>
            <p className="text-sm text-muted-foreground">Total Signers</p>
          </div>
        </GlassCard>
      </div>

      {/* Not connected warning */}
      {!isConnected && (
        <GlassCard className="p-6 border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-center gap-4">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
            <div>
              <h3 className="font-semibold text-foreground">Wallet Not Connected</h3>
              <p className="text-sm text-muted-foreground">
                Connect your wallet to view and manage your multisig wallets. Showing demo data for
                preview.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Main Content */}
      <Tabs defaultValue="owned" className="space-y-6">
        <TabsList>
          <TabsTrigger value="owned" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Owned ({displayMultisigs.length})
          </TabsTrigger>
          <TabsTrigger value="signer" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            As Signer ({displaySignerMultisigs.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending ({allPendingTransactions.length})
          </TabsTrigger>
        </TabsList>

        {/* Owned Multisigs */}
        <TabsContent value="owned" className="space-y-6">
          {loadingOwned ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : displayMultisigs.length === 0 ? (
            <GlassCard className="p-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">No Multisigs Yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Create your first multisig wallet to securely manage funds and execute governance
                  operations with multiple signers.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Multisig
                </Button>
              </div>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayMultisigs.map((multisig) => (
                <MultisigCard
                  key={multisig.address}
                  multisig={multisig}
                  isOwner={multisig.owner === address}
                  onClick={() => setSelectedMultisig(multisig)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Multisigs as Signer */}
        <TabsContent value="signer" className="space-y-6">
          {loadingSigner ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : displaySignerMultisigs.length === 0 ? (
            <GlassCard className="p-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold">Not a Signer on Any Multisig</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  You are not listed as a signer on any multisig wallets. Ask the owner of a
                  multisig to add your address as a signer.
                </p>
              </div>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displaySignerMultisigs.map((multisig) => (
                <MultisigCard
                  key={multisig.address}
                  multisig={multisig}
                  isOwner={false}
                  onClick={() => setSelectedMultisig(multisig)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pending Transactions */}
        <TabsContent value="pending" className="space-y-6">
          {allPendingTransactions.length === 0 ? (
            <GlassCard className="p-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold">All Caught Up!</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  There are no pending transactions requiring your attention.
                </p>
              </div>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {allPendingTransactions.map((tx) => (
                <PendingTransactionCard
                  key={`${tx.multisigAddress}-${tx.transactionId}`}
                  transaction={tx}
                  multisigAddress={tx.multisigAddress}
                  threshold={tx.threshold}
                  isUserSigner={true}
                  hasUserSigned={tx.currentSignatures.some((s) => s.signer === address)}
                  currentUserAddress={address ?? undefined}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Multisig Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Create New Multisig
            </DialogTitle>
          </DialogHeader>
          <CreateMultisigForm
            onSuccess={() => setIsCreateDialogOpen(false)}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Multisig Detail Dialog */}
      <Dialog open={!!selectedMultisig} onOpenChange={() => setSelectedMultisig(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Multisig Details
            </DialogTitle>
          </DialogHeader>
          {selectedMultisig && (
            <div className="space-y-6">
              {/* Actions */}
              <div className="flex justify-end">
                <MultisigTransactionFlow
                  multisig={selectedMultisig}
                  onSuccess={() => setSelectedMultisig(null)}
                />
              </div>

              {/* Multisig Info */}
              <GlassCard className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-mono text-sm">{selectedMultisig.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Threshold</p>
                    <p className="font-semibold">
                      {selectedMultisig.threshold} of {selectedMultisig.signers.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Owner</p>
                    <p className="font-mono text-sm">
                      {selectedMultisig.owner.slice(0, 8)}...{selectedMultisig.owner.slice(-8)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nonce</p>
                    <p className="font-mono">{selectedMultisig.nonce}</p>
                  </div>
                </div>
              </GlassCard>

              {/* Signers */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Signers ({selectedMultisig.signers.length})
                </h4>
                <div className="grid gap-2">
                  {selectedMultisig.signers.map((signer, index) => (
                    <GlassCard key={signer} className="p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <span className="font-mono text-sm flex-1">{signer}</span>
                      {signer === address && <Badge variant="outline">You</Badge>}
                    </GlassCard>
                  ))}
                </div>
              </div>

              {/* Pending Transactions */}
              {selectedMultisig.pendingTransactions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Pending Transactions ({selectedMultisig.pendingTransactions.length})
                  </h4>
                  <div className="space-y-4">
                    {selectedMultisig.pendingTransactions.map((tx) => (
                      <PendingTransactionCard
                        key={tx.transactionId}
                        transaction={tx}
                        multisigAddress={selectedMultisig.address}
                        threshold={selectedMultisig.threshold}
                        isUserSigner={address ? selectedMultisig.signers.includes(address) : false}
                        hasUserSigned={tx.currentSignatures.some((s) => s.signer === address)}
                        currentUserAddress={address ?? undefined}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
