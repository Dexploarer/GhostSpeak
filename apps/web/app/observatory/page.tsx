'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { TerminalWindow } from '@/components/shared/TerminalWindow'

type ObservatoryTab = 'LIVE' | 'ENDPOINTS' | 'REPORTS' | 'FRAUD' | 'X402'

function formatTimeAgo(timestampMs: number): string {
  const seconds = Math.floor((Date.now() - timestampMs) / 1000)
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function truncate(value: string, max = 160): string {
  if (!value) return ''
  if (value.length <= max) return value
  return `${value.slice(0, Math.max(0, max - 1))}…`
}

function formatUsdc(usdc: number | undefined | null): string {
  const amount = usdc ?? 0
  if (amount <= 0) return '$0.00'
  if (amount < 0.0001) return '<$0.0001'
  if (amount < 0.01) return `$${amount.toFixed(4)}`
  return `$${amount.toFixed(2)}`
}

function safeAddressLabel(address: string | undefined | null): string {
  if (!address) return '-'
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function TerminalTabs(props: { active: ObservatoryTab; onChange: (tab: ObservatoryTab) => void }) {
  const tabs: ObservatoryTab[] = ['LIVE', 'ENDPOINTS', 'REPORTS', 'FRAUD', 'X402']
  return (
    <div
      className="flex flex-wrap gap-2 border-b border-zinc-800 px-4 py-3 bg-zinc-950"
      data-testid="observatory-tabs"
    >
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => props.onChange(tab)}
          data-testid={`observatory-tab-${tab.toLowerCase()}`}
          className={`font-mono text-xs px-3 py-1.5 rounded border transition-colors ${
            props.active === tab
              ? 'bg-primary/15 border-primary/30 text-primary-foreground'
              : 'bg-zinc-900/40 border-zinc-800 text-zinc-300 hover:bg-zinc-900/70'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

function Drawer(props: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  testId?: string
}) {
  if (!props.open) return null

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={props.title}
      data-testid={props.testId ?? 'observatory-drawer'}
    >
      <div
        className="absolute inset-0 bg-black/70"
        onClick={props.onClose}
        data-testid="observatory-drawer-backdrop"
      />
      <div className="absolute inset-y-0 right-0 w-full max-w-3xl">
        <div className="h-full p-4 sm:p-6">
          <TerminalWindow title={props.title} className="h-full" glow={false}>
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 bg-zinc-950">
              <div className="font-mono text-xs text-zinc-400">observation_details</div>
              <button
                type="button"
                onClick={props.onClose}
                className="font-mono text-xs px-2 py-1 rounded border border-zinc-800 text-zinc-200 hover:bg-zinc-900"
                data-testid="observatory-drawer-close"
              >
                close
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(100vh-6rem)] custom-scrollbar">
              {props.children}
            </div>
          </TerminalWindow>
        </div>
      </div>
    </div>
  )
}

export default function ObservatoryPage() {
  const [tab, setTab] = useState<ObservatoryTab>('LIVE')

  const stats = useQuery(api.observation.getObservatoryStats, {})
  const liveFeed = useQuery(api.observatoryTerminal.getPublicLiveFeed, { limit: 60 })
  const endpoints = useQuery(api.observation.listEndpoints, { activeOnly: true, limit: 200 })
  const x402 = useQuery(api.observatoryTerminal.getPublicX402Payments, { limit: 30 })

  const [reportsAgentAddress, setReportsAgentAddress] = useState('')
  const [fraudAgentAddress, setFraudAgentAddress] = useState('')

  const normalizedReportsAgent = useMemo(() => reportsAgentAddress.trim(), [reportsAgentAddress])
  const normalizedFraudAgent = useMemo(() => fraudAgentAddress.trim(), [fraudAgentAddress])

  // Convex hooks must be called unconditionally. When no agent filter is provided,
  // query with an empty string (returns an empty result set).
  const reports = useQuery(api.observation.getReportsForAgent, {
    agentAddress: normalizedReportsAgent,
    limit: 30,
  })

  const fraudSignals = useQuery(api.observation.getFraudSignals, {
    agentAddress: normalizedFraudAgent,
    unresolvedOnly: false,
  })

  const [selectedObservationId, setSelectedObservationId] = useState<string | null>(null)
  const selectedObservation = useQuery(api.observatoryTerminal.getPublicObservationDetail, {
    // Convex hooks must be called unconditionally.
    // This query accepts an optional testId and returns null when not provided.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    testId: (selectedObservationId ?? undefined) as any,
  })

  return (
    <div className="min-h-screen px-4 py-10" data-testid="observatory-page">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">Observatory</h1>
          <p className="text-sm text-muted-foreground">
            Public terminal view of endpoint tests, reports, fraud signals, and x402 payments.
          </p>
        </div>

        <TerminalWindow title="/observatory" className="w-full" glow>
          <TerminalTabs active={tab} onChange={setTab} />

          <div
            className="p-4 sm:p-6 font-mono text-sm text-zinc-200"
            data-testid="observatory-terminal"
          >
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-xs"
              data-testid="observatory-stats"
            >
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="text-zinc-400">endpoints</div>
                <div className="text-zinc-100">{stats ? stats.totalEndpoints : '…'}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="text-zinc-400">agents</div>
                <div className="text-zinc-100">{stats ? stats.uniqueAgents : '…'}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="text-zinc-400">tests (24h)</div>
                <div className="text-zinc-100">{stats ? stats.testsLast24h : '…'}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="text-zinc-400">fraud alerts</div>
                <div className="text-zinc-100">{stats ? stats.unresolvedFraudSignals : '…'}</div>
              </div>
            </div>

            {tab === 'LIVE' && (
              <div data-testid="observatory-tabpanel-live" className="space-y-3">
                <div className="text-xs text-zinc-400">$ tail -n 50 /var/log/observations.log</div>

                {!liveFeed ? (
                  <div className="text-zinc-500" data-testid="observatory-live-loading">
                    connecting…
                  </div>
                ) : liveFeed.length === 0 ? (
                  <div className="text-zinc-500" data-testid="observatory-live-empty">
                    no recent observations
                  </div>
                ) : (
                  <div className="space-y-2" data-testid="observatory-live-list">
                    {liveFeed.map((item: any, idx: number) => {
                      if (item?.kind === 'x402') {
                        const t = item.timestamp ?? Date.now()
                        return (
                          <div
                            key={`x402-${String(item.signature ?? idx)}`}
                            className="rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2"
                            data-testid={`observatory-live-row-x402-${String(item.signature ?? idx)}`}
                          >
                            <div className="text-xs text-zinc-200">
                              <span className="text-zinc-500">[{formatTimeAgo(t)}]</span>{' '}
                              <span className="text-orange-300">[402]</span> sig:
                              {safeAddressLabel(item.signature)}
                              {' • '}payer:{item.payer ?? '[redacted]'}
                              {' • '}merchant:{safeAddressLabel(item.merchant)}
                              {' • '}amount:{truncate(String(item.amount ?? '0'), 18)}
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-2">
                              facilitator:{safeAddressLabel(item.facilitator)}
                            </div>
                          </div>
                        )
                      }

                      const testedAt = item.testedAt ?? Date.now()
                      const status = item.responseStatus ?? 'ERR'
                      const statusLabel = String(status).padStart(3, ' ')
                      const method = item.endpoint?.method ?? 'GET'
                      const endpoint = item.endpoint?.endpoint ?? 'unknown'
                      const notesPreview = item.caisperNotes
                        ? truncate(String(item.caisperNotes), 90)
                        : ''
                      const transcriptCount = item.transcriptCount ?? 0

                      return (
                        <button
                          type="button"
                          key={String(item._id)}
                          onClick={() => setSelectedObservationId(String(item._id))}
                          className="w-full text-left rounded-lg border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-950/70 transition-colors px-3 py-2"
                          data-testid={`observatory-live-row-${String(item._id)}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs text-zinc-300">
                                <span
                                  className={`inline-block w-[3.5rem] ${
                                    status === 200
                                      ? 'text-green-400'
                                      : status === 402
                                        ? 'text-orange-400'
                                        : 'text-red-400'
                                  }`}
                                >
                                  [{statusLabel}]
                                </span>{' '}
                                <span className="text-zinc-400">{method}</span>{' '}
                                <span className="text-zinc-100">
                                  {truncate(String(endpoint), 80)}
                                </span>
                              </div>
                              <div className="text-[11px] text-zinc-500 mt-1">
                                {formatTimeAgo(testedAt)} • {item.responseTimeMs ?? '-'}ms • paid{' '}
                                {formatUsdc(item.paymentAmountUsdc)} • Q{item.qualityScore ?? '-'}
                                {transcriptCount > 0 ? ` • transcript:${transcriptCount}` : ''}
                              </div>
                              {notesPreview ? (
                                <div className="text-[11px] text-zinc-400 mt-1">
                                  note: {notesPreview}
                                </div>
                              ) : null}
                            </div>
                            <div className="text-[11px] text-zinc-500 shrink-0">open ▶</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === 'ENDPOINTS' && (
              <div data-testid="observatory-tabpanel-endpoints" className="space-y-3">
                <div className="text-xs text-zinc-400">$ cat /etc/observed_endpoints.json</div>
                {!endpoints ? (
                  <div className="text-zinc-500" data-testid="observatory-endpoints-loading">
                    loading…
                  </div>
                ) : endpoints.length === 0 ? (
                  <div className="text-zinc-500" data-testid="observatory-endpoints-empty">
                    no endpoints
                  </div>
                ) : (
                  <div className="space-y-2" data-testid="observatory-endpoints-list">
                    {endpoints.map((ep: any) => (
                      <div
                        key={String(ep._id)}
                        className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2"
                        data-testid={`observatory-endpoint-row-${String(ep._id)}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs text-zinc-300">
                              <span className="text-zinc-400">{ep.method ?? 'GET'}</span>{' '}
                              <span className="text-zinc-100">
                                {truncate(String(ep.endpoint ?? '-'), 90)}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-1">
                              agent:{' '}
                              <span className="text-zinc-300">
                                {safeAddressLabel(ep.agentAddress)}
                              </span>{' '}
                              • price: {formatUsdc(ep.priceUsdc)} • tests:{ep.totalTests ?? 0} •
                              success:{' '}
                              {ep.totalTests
                                ? Math.round(((ep.successfulTests ?? 0) / ep.totalTests) * 100)
                                : 0}
                              %{ep.lastTestedAt ? ` • last:${formatTimeAgo(ep.lastTestedAt)}` : ''}
                            </div>
                          </div>
                          <div className="text-[11px] text-zinc-500 shrink-0">
                            {ep.category ? `cat:${ep.category}` : 'cat:-'}
                          </div>
                        </div>
                        {ep.description ? (
                          <div className="text-[11px] text-zinc-400 mt-2">
                            desc: {truncate(String(ep.description), 140)}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'REPORTS' && (
              <div data-testid="observatory-tabpanel-reports" className="space-y-3">
                <div className="text-xs text-zinc-400">
                  $ observatory reports --agent &lt;address&gt;
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <input
                    value={reportsAgentAddress}
                    onChange={(e) => setReportsAgentAddress(e.target.value)}
                    placeholder="Agent address (e.g. 9xQe... )"
                    className="w-full font-mono text-xs rounded border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-zinc-100 placeholder:text-zinc-600"
                    data-testid="observatory-reports-agent-input"
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                  />
                  <div
                    className="text-[11px] text-zinc-500 shrink-0"
                    data-testid="observatory-reports-agent-hint"
                  >
                    {normalizedReportsAgent
                      ? `querying: ${safeAddressLabel(normalizedReportsAgent)}`
                      : 'enter an agent to query'}
                  </div>
                </div>

                {!normalizedReportsAgent ? (
                  <div className="text-zinc-500" data-testid="observatory-reports-empty-input">
                    no agent filter set
                  </div>
                ) : !reports ? (
                  <div className="text-zinc-500" data-testid="observatory-reports-loading">
                    loading…
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-zinc-500" data-testid="observatory-reports-empty">
                    no reports for this agent
                  </div>
                ) : (
                  <div className="space-y-2" data-testid="observatory-reports-list">
                    {reports.map((r: any) => (
                      <div
                        key={String(r._id)}
                        className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2"
                        data-testid={`observatory-report-row-${String(r._id)}`}
                      >
                        <div className="text-xs text-zinc-200">
                          <span className="text-zinc-500">[{r.date ?? '-'}]</span> grade:{' '}
                          <span
                            className={
                              r.overallGrade === 'A'
                                ? 'text-green-400'
                                : r.overallGrade === 'B'
                                  ? 'text-emerald-300'
                                  : r.overallGrade === 'C'
                                    ? 'text-yellow-300'
                                    : r.overallGrade === 'D'
                                      ? 'text-orange-300'
                                      : 'text-red-400'
                            }
                          >
                            {r.overallGrade ?? '-'}
                          </span>
                          {' • '}trust:{r.trustworthiness ?? '-'}
                          {' • '}tests:{r.testsRun ?? '-'}
                          {' • '}ok:{r.testsSucceeded ?? '-'}
                          {' • '}avg:{r.avgResponseTimeMs ?? '-'}ms
                          {' • '}quality:{r.avgQualityScore ?? '-'}
                          {' • '}spent:{formatUsdc(r.totalSpentUsdc)}
                        </div>
                        {r.recommendation ? (
                          <div className="text-[11px] text-zinc-400 mt-2">
                            rec: {truncate(String(r.recommendation), 240)}
                          </div>
                        ) : null}
                        {Array.isArray(r.verifiedCapabilities) &&
                        r.verifiedCapabilities.length > 0 ? (
                          <div className="text-[11px] text-zinc-500 mt-2">
                            verified: {truncate(r.verifiedCapabilities.join(', '), 240)}
                          </div>
                        ) : null}
                        {Array.isArray(r.failedCapabilities) && r.failedCapabilities.length > 0 ? (
                          <div className="text-[11px] text-zinc-500 mt-1">
                            failed: {truncate(r.failedCapabilities.join(', '), 240)}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'FRAUD' && (
              <div data-testid="observatory-tabpanel-fraud" className="space-y-3">
                <div className="text-xs text-zinc-400">
                  $ observatory fraud --agent &lt;address&gt;
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <input
                    value={fraudAgentAddress}
                    onChange={(e) => setFraudAgentAddress(e.target.value)}
                    placeholder="Agent address (e.g. 9xQe... )"
                    className="w-full font-mono text-xs rounded border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-zinc-100 placeholder:text-zinc-600"
                    data-testid="observatory-fraud-agent-input"
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                  />
                  <div
                    className="text-[11px] text-zinc-500 shrink-0"
                    data-testid="observatory-fraud-agent-hint"
                  >
                    {normalizedFraudAgent
                      ? `querying: ${safeAddressLabel(normalizedFraudAgent)}`
                      : 'enter an agent to query'}
                  </div>
                </div>

                {!normalizedFraudAgent ? (
                  <div className="text-zinc-500" data-testid="observatory-fraud-empty-input">
                    no agent filter set
                  </div>
                ) : !fraudSignals ? (
                  <div className="text-zinc-500" data-testid="observatory-fraud-loading">
                    loading…
                  </div>
                ) : fraudSignals.length === 0 ? (
                  <div className="text-zinc-500" data-testid="observatory-fraud-empty">
                    no fraud signals for this agent
                  </div>
                ) : (
                  <div className="space-y-2" data-testid="observatory-fraud-list">
                    {fraudSignals.map((s: any) => (
                      <div
                        key={String(s._id)}
                        className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2"
                        data-testid={`observatory-fraud-row-${String(s._id)}`}
                      >
                        <div className="text-xs text-zinc-200">
                          <span className="text-zinc-500">
                            [{formatTimeAgo(s.detectedAt ?? s._creationTime)}]
                          </span>{' '}
                          <span
                            className={
                              s.severity === 'high'
                                ? 'text-red-400'
                                : s.severity === 'medium'
                                  ? 'text-orange-300'
                                  : 'text-yellow-300'
                            }
                          >
                            {String(s.severity ?? 'unknown').toUpperCase()}
                          </span>
                          {' • '}type:{s.signalType ?? '-'}
                          {' • '}status:{s.resolvedAt ? 'resolved' : 'unresolved'}
                        </div>
                        {s.evidence ? (
                          <div className="text-[11px] text-zinc-400 mt-2">
                            evidence: {truncate(String(s.evidence), 320)}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'X402' && (
              <div data-testid="observatory-tabpanel-x402" className="space-y-3">
                <div className="text-xs text-zinc-400">$ tail -n 30 /var/log/x402_payments.log</div>

                {!x402 ? (
                  <div className="text-zinc-500" data-testid="observatory-x402-loading">
                    loading…
                  </div>
                ) : x402.length === 0 ? (
                  <div className="text-zinc-500" data-testid="observatory-x402-empty">
                    no recent payments
                  </div>
                ) : (
                  <div className="space-y-2" data-testid="observatory-x402-list">
                    {x402.map((p: any) => (
                      <div
                        key={String(p.signature)}
                        className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2"
                        data-testid={`observatory-x402-row-${String(p.signature)}`}
                      >
                        <div className="text-xs text-zinc-200">
                          <span className="text-zinc-500">
                            [{formatTimeAgo(p.timestamp ?? Date.now())}]
                          </span>{' '}
                          sig:{safeAddressLabel(p.signature)}
                          {' • '}payer:{p.payer ?? '[redacted]'}
                          {' • '}merchant:{safeAddressLabel(p.merchant)}
                          {' • '}amount:{truncate(String(p.amount ?? '0'), 18)}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-2">
                          facilitator:{safeAddressLabel(p.facilitator)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </TerminalWindow>
      </div>

      <Drawer
        open={!!selectedObservationId}
        title={
          selectedObservationId
            ? `observation_${String(selectedObservationId)}.log`
            : 'observation.log'
        }
        onClose={() => setSelectedObservationId(null)}
        testId="observatory-observation-drawer"
      >
        {!selectedObservationId ? null : !selectedObservation ? (
          <div className="text-zinc-500" data-testid="observatory-observation-loading">
            loading…
          </div>
        ) : (
          <div className="space-y-4" data-testid="observatory-observation-details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="text-zinc-500">agent</div>
                <div className="text-zinc-100">{selectedObservation.agentAddress ?? '-'}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="text-zinc-500">endpoint</div>
                <div className="text-zinc-100">
                  {selectedObservation.endpoint?.method ?? 'GET'}{' '}
                  {selectedObservation.endpoint?.endpoint ?? '-'}
                </div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="text-zinc-500">status</div>
                <div className="text-zinc-100">{selectedObservation.responseStatus ?? 'ERR'}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="text-zinc-500">timing</div>
                <div className="text-zinc-100">{selectedObservation.responseTimeMs ?? '-'}ms</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="text-zinc-500">quality</div>
                <div className="text-zinc-100">Q{selectedObservation.qualityScore ?? '-'}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="text-zinc-500">payment</div>
                <div className="text-zinc-100">
                  {formatUsdc(selectedObservation.paymentAmountUsdc)}
                </div>
              </div>
            </div>

            {selectedObservation.caisperNotes ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-xs">
                <div className="text-zinc-500 mb-1">caisper_notes</div>
                <div className="text-zinc-200 whitespace-pre-wrap">
                  {truncate(String(selectedObservation.caisperNotes), 800)}
                </div>
              </div>
            ) : null}

            {Array.isArray(selectedObservation.issues) && selectedObservation.issues.length > 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-xs">
                <div className="text-zinc-500 mb-1">issues</div>
                <ul className="list-disc list-inside text-zinc-200 space-y-1">
                  {selectedObservation.issues.map((issue: string, idx: number) => (
                    <li key={idx}>{truncate(String(issue), 240)}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
              <div className="text-zinc-500 text-xs mb-2">transcript</div>
              {Array.isArray(selectedObservation.transcript) &&
              selectedObservation.transcript.length > 0 ? (
                <div className="space-y-2 text-xs" data-testid="observatory-observation-transcript">
                  {selectedObservation.transcript.map((entry: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded border border-zinc-800 bg-zinc-950/60 p-3"
                      data-testid={`observatory-observation-transcript-row-${idx}`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2 text-[10px] uppercase text-zinc-500">
                        <span>
                          {String(entry.role ?? 'unknown')}
                          {entry.isToolCall ? ' • tool' : ''}
                          {entry.toolName ? `:${entry.toolName}` : ''}
                        </span>
                        <span>
                          {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '-'}
                        </span>
                      </div>
                      {entry.toolArgs ? (
                        <div className="text-[11px] text-zinc-500 mb-2 whitespace-pre-wrap">
                          args: {truncate(String(entry.toolArgs), 280)}
                        </div>
                      ) : null}
                      <div className="text-zinc-200 whitespace-pre-wrap">
                        {truncate(String(entry.content ?? ''), 2000)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="text-xs text-zinc-500"
                  data-testid="observatory-observation-transcript-empty"
                >
                  no transcript available
                </div>
              )}
              <div className="mt-3 text-[11px] text-zinc-500">
                Note: transcript entries are truncated/redacted server-side for public safety.
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
