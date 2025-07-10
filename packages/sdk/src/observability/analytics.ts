/**
 * Analytics and business metrics tracking system
 */

import { v4 as uuidv4 } from 'uuid';
import type { AnalyticsEvent, BusinessMetric } from './types';
import { MetricsCollector } from './metrics';

export class AnalyticsTracker {
  private events: Map<string, AnalyticsEvent[]> = new Map();
  private sessions: Map<string, AnalyticsSession> = new Map();
  private funnels: Map<string, FunnelDefinition> = new Map();
  private metricsCollector: MetricsCollector;
  private retentionDays: number;

  constructor(metricsCollector: MetricsCollector, retentionDays: number = 90) {
    this.metricsCollector = metricsCollector;
    this.retentionDays = retentionDays;
    this.startCleanupInterval();
  }

  // Track an analytics event
  track(
    type: string,
    action: string,
    properties?: Record<string, unknown>,
    context?: Record<string, unknown>,
    userId?: string,
    sessionId?: string
  ): string {
    const eventId = uuidv4();
    const timestamp = Date.now();

    const event: AnalyticsEvent = {
      id: eventId,
      type,
      timestamp,
      userId,
      sessionId: sessionId || this.getOrCreateSession(userId).id,
      component: context?.component as string || 'unknown',
      action,
      properties,
      context,
    };

    // Store event
    if (!this.events.has(type)) {
      this.events.set(type, []);
    }
    this.events.get(type)!.push(event);

    // Update session
    this.updateSession(event.sessionId, event);

    // Update metrics
    this.metricsCollector.increment('ghostspeak_analytics_events_total', {
      type,
      action,
      component: event.component,
    });

    // Check funnels
    this.processFunnelEvent(event);

    return eventId;
  }

  // Track user action
  trackUserAction(
    action: string,
    target?: string,
    value?: number,
    properties?: Record<string, unknown>,
    userId?: string,
    sessionId?: string
  ): string {
    return this.track(
      'user_action',
      action,
      {
        target,
        value,
        ...properties,
      },
      undefined,
      userId,
      sessionId
    );
  }

  // Track page view
  trackPageView(
    page: string,
    title?: string,
    properties?: Record<string, unknown>,
    userId?: string,
    sessionId?: string
  ): string {
    return this.track(
      'page_view',
      'view',
      {
        page,
        title,
        ...properties,
      },
      undefined,
      userId,
      sessionId
    );
  }

  // Track business event
  trackBusinessEvent(
    event: string,
    value?: number,
    currency?: string,
    properties?: Record<string, unknown>,
    userId?: string,
    sessionId?: string
  ): string {
    return this.track(
      'business',
      event,
      {
        value,
        currency,
        ...properties,
      },
      undefined,
      userId,
      sessionId
    );
  }

  // Track agent interaction
  trackAgentInteraction(
    interactionType: string,
    agentId: string,
    outcome?: string,
    duration?: number,
    properties?: Record<string, unknown>,
    userId?: string,
    sessionId?: string
  ): string {
    return this.track(
      'agent_interaction',
      interactionType,
      {
        agentId,
        outcome,
        duration,
        ...properties,
      },
      undefined,
      userId,
      sessionId
    );
  }

  // Track transaction
  trackTransaction(
    transactionType: string,
    amount: number,
    currency: string = 'SOL',
    status: string,
    properties?: Record<string, unknown>,
    userId?: string,
    sessionId?: string
  ): string {
    return this.track(
      'transaction',
      transactionType,
      {
        amount,
        currency,
        status,
        ...properties,
      },
      undefined,
      userId,
      sessionId
    );
  }

  // Track error occurrence
  trackError(
    errorType: string,
    component: string,
    message: string,
    properties?: Record<string, unknown>,
    userId?: string,
    sessionId?: string
  ): string {
    return this.track(
      'error',
      errorType,
      {
        component,
        message,
        ...properties,
      },
      undefined,
      userId,
      sessionId
    );
  }

  // Get events by type
  getEvents(type: string, limit?: number): AnalyticsEvent[] {
    const events = this.events.get(type) || [];
    return limit ? events.slice(-limit) : events;
  }

  // Get events by user
  getEventsByUser(userId: string, limit?: number): AnalyticsEvent[] {
    const userEvents: AnalyticsEvent[] = [];
    
    for (const events of this.events.values()) {
      userEvents.push(...events.filter(e => e.userId === userId));
    }
    
    userEvents.sort((a, b) => b.timestamp - a.timestamp);
    return limit ? userEvents.slice(0, limit) : userEvents;
  }

  // Get events by session
  getEventsBySession(sessionId: string): AnalyticsEvent[] {
    const sessionEvents: AnalyticsEvent[] = [];
    
    for (const events of this.events.values()) {
      sessionEvents.push(...events.filter(e => e.sessionId === sessionId));
    }
    
    return sessionEvents.sort((a, b) => a.timestamp - b.timestamp);
  }

  // Get events in time range
  getEventsInRange(startTime: number, endTime: number, type?: string): AnalyticsEvent[] {
    const results: AnalyticsEvent[] = [];
    const eventSets = type ? [this.events.get(type) || []] : Array.from(this.events.values());
    
    for (const events of eventSets) {
      results.push(...events.filter(e => e.timestamp >= startTime && e.timestamp <= endTime));
    }
    
    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Get analytics summary
  getAnalyticsSummary(timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'): {
    totalEvents: number;
    uniqueUsers: number;
    uniqueSessions: number;
    topEvents: Array<{ type: string; action: string; count: number }>;
    topComponents: Array<{ component: string; count: number }>;
    eventsByHour: Array<{ hour: number; count: number }>;
  } {
    const now = Date.now();
    const timeRanges = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };
    
    const startTime = now - timeRanges[timeframe];
    const events = this.getEventsInRange(startTime, now);
    
    const uniqueUsers = new Set(events.filter(e => e.userId).map(e => e.userId)).size;
    const uniqueSessions = new Set(events.map(e => e.sessionId)).size;
    
    // Count events by type and action
    const eventCounts = new Map<string, number>();
    const componentCounts = new Map<string, number>();
    
    for (const event of events) {
      const key = `${event.type}:${event.action}`;
      eventCounts.set(key, (eventCounts.get(key) || 0) + 1);
      componentCounts.set(event.component, (componentCounts.get(event.component) || 0) + 1);
    }
    
    const topEvents = Array.from(eventCounts.entries())
      .map(([key, count]) => {
        const [type, action] = key.split(':');
        return { type, action, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    const topComponents = Array.from(componentCounts.entries())
      .map(([component, count]) => ({ component, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Events by hour
    const eventsByHour = this.getEventsByHour(events, timeframe);
    
    return {
      totalEvents: events.length,
      uniqueUsers,
      uniqueSessions,
      topEvents,
      topComponents,
      eventsByHour,
    };
  }

  // Define conversion funnel
  defineFunnel(
    name: string,
    steps: Array<{ type: string; action: string }>,
    timeWindowMs: number = 24 * 60 * 60 * 1000
  ): void {
    this.funnels.set(name, {
      name,
      steps,
      timeWindowMs,
      conversions: new Map(),
    });
  }

  // Get funnel analysis
  getFunnelAnalysis(funnelName: string): FunnelAnalysis | null {
    const funnel = this.funnels.get(funnelName);
    if (!funnel) return null;

    const now = Date.now();
    const startTime = now - (7 * 24 * 60 * 60 * 1000); // Last 7 days
    
    const stepCounts: number[] = new Array(funnel.steps.length).fill(0);
    const userProgressions = new Map<string, number[]>();
    
    // Get all events in timeframe
    const events = this.getEventsInRange(startTime, now);
    const eventsByUser = new Map<string, AnalyticsEvent[]>();
    
    for (const event of events) {
      if (!event.userId) continue;
      
      if (!eventsByUser.has(event.userId)) {
        eventsByUser.set(event.userId, []);
      }
      eventsByUser.get(event.userId)!.push(event);
    }
    
    // Analyze each user's journey
    for (const [userId, userEvents] of eventsByUser.entries()) {
      userEvents.sort((a, b) => a.timestamp - b.timestamp);
      
      let currentStep = 0;
      const progression: number[] = [];
      
      for (const event of userEvents) {
        if (currentStep < funnel.steps.length) {
          const step = funnel.steps[currentStep];
          if (event.type === step.type && event.action === step.action) {
            progression.push(event.timestamp);
            stepCounts[currentStep]++;
            currentStep++;
          }
        }
      }
      
      if (progression.length > 0) {
        userProgressions.set(userId, progression);
      }
    }
    
    // Calculate conversion rates
    const conversionRates: number[] = [];
    for (let i = 1; i < stepCounts.length; i++) {
      const rate = stepCounts[0] > 0 ? stepCounts[i] / stepCounts[0] : 0;
      conversionRates.push(rate);
    }
    
    return {
      funnelName,
      stepCounts,
      conversionRates,
      totalUsers: stepCounts[0],
      completedUsers: stepCounts[stepCounts.length - 1],
      overallConversionRate: stepCounts[0] > 0 ? stepCounts[stepCounts.length - 1] / stepCounts[0] : 0,
    };
  }

  // Session management
  private getOrCreateSession(userId?: string): AnalyticsSession {
    // Find existing session for user or create new one
    if (userId) {
      for (const session of this.sessions.values()) {
        if (session.userId === userId && session.isActive) {
          return session;
        }
      }
    }
    
    const sessionId = uuidv4();
    const session: AnalyticsSession = {
      id: sessionId,
      userId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      isActive: true,
      eventCount: 0,
      pageViews: 0,
      actions: 0,
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }

  private updateSession(sessionId: string, event: AnalyticsEvent): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.lastActivity = event.timestamp;
    session.eventCount++;
    
    if (event.type === 'page_view') {
      session.pageViews++;
    } else if (event.type === 'user_action') {
      session.actions++;
    }
    
    // Mark session as inactive if no activity for 30 minutes
    if (Date.now() - session.lastActivity > 30 * 60 * 1000) {
      session.isActive = false;
    }
  }

  private processFunnelEvent(event: AnalyticsEvent): void {
    for (const funnel of this.funnels.values()) {
      for (const step of funnel.steps) {
        if (event.type === step.type && event.action === step.action) {
          // Process funnel conversion logic here
          break;
        }
      }
    }
  }

  private getEventsByHour(events: AnalyticsEvent[], timeframe: string): Array<{ hour: number; count: number }> {
    const hourCounts = new Map<number, number>();
    const hoursToShow = timeframe === 'hour' ? 1 : timeframe === 'day' ? 24 : 
                      timeframe === 'week' ? 168 : 720;
    
    for (const event of events) {
      const hour = Math.floor(event.timestamp / (60 * 60 * 1000));
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }
    
    const result: Array<{ hour: number; count: number }> = [];
    const currentHour = Math.floor(Date.now() / (60 * 60 * 1000));
    
    for (let i = hoursToShow - 1; i >= 0; i--) {
      const hour = currentHour - i;
      result.push({ hour, count: hourCounts.get(hour) || 0 });
    }
    
    return result;
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const cutoff = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000);
      
      for (const [type, events] of this.events.entries()) {
        const filteredEvents = events.filter(e => e.timestamp > cutoff);
        this.events.set(type, filteredEvents);
      }
      
      // Cleanup sessions
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.lastActivity < cutoff) {
          this.sessions.delete(sessionId);
        }
      }
    }, 60 * 60 * 1000); // Run every hour
  }
}

// User behavior analytics
export class UserBehaviorAnalytics {
  private analyticsTracker: AnalyticsTracker;

  constructor(analyticsTracker: AnalyticsTracker) {
    this.analyticsTracker = analyticsTracker;
  }

  // Analyze user journey
  analyzeUserJourney(userId: string): UserJourney {
    const events = this.analyticsTracker.getEventsByUser(userId, 100);
    const sessions = this.getUserSessions(userId);
    
    const pageViews = events.filter(e => e.type === 'page_view');
    const actions = events.filter(e => e.type === 'user_action');
    const businessEvents = events.filter(e => e.type === 'business');
    
    const journey: UserJourney = {
      userId,
      firstSeen: events.length > 0 ? Math.min(...events.map(e => e.timestamp)) : 0,
      lastSeen: events.length > 0 ? Math.max(...events.map(e => e.timestamp)) : 0,
      totalSessions: sessions.length,
      totalEvents: events.length,
      totalPageViews: pageViews.length,
      totalActions: actions.length,
      averageSessionDuration: this.calculateAverageSessionDuration(sessions),
      topPages: this.getTopPages(pageViews),
      topActions: this.getTopActions(actions),
      conversionEvents: businessEvents,
    };
    
    return journey;
  }

  // Get user segments based on behavior
  getUserSegments(): UserSegment[] {
    const segments: UserSegment[] = [
      {
        name: 'power_users',
        description: 'Users with high activity',
        criteria: { minEvents: 50, minSessions: 10 },
        users: [],
      },
      {
        name: 'engaged_users',
        description: 'Users with moderate activity',
        criteria: { minEvents: 10, minSessions: 3 },
        users: [],
      },
      {
        name: 'new_users',
        description: 'Users with recent first visit',
        criteria: { maxDaysSinceFirst: 7 },
        users: [],
      },
      {
        name: 'churned_users',
        description: 'Users who haven\'t returned',
        criteria: { minDaysSinceLast: 30 },
        users: [],
      },
    ];

    // Implementation would analyze all users and categorize them
    // This is a simplified version
    
    return segments;
  }

  // Analyze feature adoption
  analyzeFeatureAdoption(feature: string): FeatureAdoption {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    const featureEvents = this.analyticsTracker.getEventsInRange(thirtyDaysAgo, now)
      .filter(e => e.action.includes(feature) || e.properties?.feature === feature);
    
    const uniqueUsers = new Set(featureEvents.filter(e => e.userId).map(e => e.userId!)).size;
    const totalUsers = this.getTotalActiveUsers(thirtyDaysAgo, now);
    
    return {
      feature,
      adoptionRate: totalUsers > 0 ? uniqueUsers / totalUsers : 0,
      uniqueUsers,
      totalUsers,
      usageCount: featureEvents.length,
      firstUsed: featureEvents.length > 0 ? Math.min(...featureEvents.map(e => e.timestamp)) : 0,
      lastUsed: featureEvents.length > 0 ? Math.max(...featureEvents.map(e => e.timestamp)) : 0,
    };
  }

  private getUserSessions(userId: string): AnalyticsSession[] {
    // Implementation would get sessions for specific user
    return [];
  }

  private calculateAverageSessionDuration(sessions: AnalyticsSession[]): number {
    if (sessions.length === 0) return 0;
    
    const totalDuration = sessions.reduce((sum, session) => {
      return sum + (session.lastActivity - session.startTime);
    }, 0);
    
    return totalDuration / sessions.length;
  }

  private getTopPages(pageViews: AnalyticsEvent[]): Array<{ page: string; count: number }> {
    const pageCounts = new Map<string, number>();
    
    for (const event of pageViews) {
      const page = event.properties?.page as string || 'unknown';
      pageCounts.set(page, (pageCounts.get(page) || 0) + 1);
    }
    
    return Array.from(pageCounts.entries())
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getTopActions(actions: AnalyticsEvent[]): Array<{ action: string; count: number }> {
    const actionCounts = new Map<string, number>();
    
    for (const event of actions) {
      actionCounts.set(event.action, (actionCounts.get(event.action) || 0) + 1);
    }
    
    return Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getTotalActiveUsers(startTime: number, endTime: number): number {
    const events = this.analyticsTracker.getEventsInRange(startTime, endTime);
    return new Set(events.filter(e => e.userId).map(e => e.userId!)).size;
  }
}

// Business intelligence and reporting
export class BusinessIntelligence {
  private analyticsTracker: AnalyticsTracker;
  private metricsCollector: MetricsCollector;

  constructor(analyticsTracker: AnalyticsTracker, metricsCollector: MetricsCollector) {
    this.analyticsTracker = analyticsTracker;
    this.metricsCollector = metricsCollector;
  }

  // Generate business report
  generateBusinessReport(timeframe: 'day' | 'week' | 'month' = 'week'): BusinessReport {
    const now = Date.now();
    const timeRanges = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };
    
    const startTime = now - timeRanges[timeframe];
    const events = this.analyticsTracker.getEventsInRange(startTime, now);
    
    const transactions = events.filter(e => e.type === 'transaction');
    const agentInteractions = events.filter(e => e.type === 'agent_interaction');
    const businessEvents = events.filter(e => e.type === 'business');
    
    const revenue = transactions
      .filter(e => e.properties?.status === 'completed')
      .reduce((sum, e) => sum + (e.properties?.amount as number || 0), 0);
    
    const activeUsers = new Set(events.filter(e => e.userId).map(e => e.userId!)).size;
    
    return {
      timeframe,
      startTime,
      endTime: now,
      metrics: {
        activeUsers,
        totalTransactions: transactions.length,
        completedTransactions: transactions.filter(e => e.properties?.status === 'completed').length,
        revenue,
        agentInteractions: agentInteractions.length,
        businessEvents: businessEvents.length,
      },
      trends: this.calculateTrends(timeframe),
      topPerformers: this.getTopPerformers(events),
    };
  }

  private calculateTrends(timeframe: string): BusinessTrends {
    // Implementation would calculate period-over-period trends
    return {
      userGrowth: 0,
      revenueGrowth: 0,
      transactionGrowth: 0,
      engagementGrowth: 0,
    };
  }

  private getTopPerformers(events: AnalyticsEvent[]): TopPerformers {
    const agentInteractions = events.filter(e => e.type === 'agent_interaction');
    const agentCounts = new Map<string, number>();
    
    for (const event of agentInteractions) {
      const agentId = event.properties?.agentId as string;
      if (agentId) {
        agentCounts.set(agentId, (agentCounts.get(agentId) || 0) + 1);
      }
    }
    
    const topAgents = Array.from(agentCounts.entries())
      .map(([agentId, interactions]) => ({ agentId, interactions }))
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 10);
    
    return {
      topAgents,
      topUsers: [], // Implementation would analyze top users
      topTransactions: [], // Implementation would analyze top transactions
    };
  }
}

// Type definitions for analytics
interface AnalyticsSession {
  id: string;
  userId?: string;
  startTime: number;
  lastActivity: number;
  isActive: boolean;
  eventCount: number;
  pageViews: number;
  actions: number;
}

interface FunnelDefinition {
  name: string;
  steps: Array<{ type: string; action: string }>;
  timeWindowMs: number;
  conversions: Map<string, number[]>;
}

interface FunnelAnalysis {
  funnelName: string;
  stepCounts: number[];
  conversionRates: number[];
  totalUsers: number;
  completedUsers: number;
  overallConversionRate: number;
}

interface UserJourney {
  userId: string;
  firstSeen: number;
  lastSeen: number;
  totalSessions: number;
  totalEvents: number;
  totalPageViews: number;
  totalActions: number;
  averageSessionDuration: number;
  topPages: Array<{ page: string; count: number }>;
  topActions: Array<{ action: string; count: number }>;
  conversionEvents: AnalyticsEvent[];
}

interface UserSegment {
  name: string;
  description: string;
  criteria: Record<string, any>;
  users: string[];
}

interface FeatureAdoption {
  feature: string;
  adoptionRate: number;
  uniqueUsers: number;
  totalUsers: number;
  usageCount: number;
  firstUsed: number;
  lastUsed: number;
}

interface BusinessReport {
  timeframe: string;
  startTime: number;
  endTime: number;
  metrics: {
    activeUsers: number;
    totalTransactions: number;
    completedTransactions: number;
    revenue: number;
    agentInteractions: number;
    businessEvents: number;
  };
  trends: BusinessTrends;
  topPerformers: TopPerformers;
}

interface BusinessTrends {
  userGrowth: number;
  revenueGrowth: number;
  transactionGrowth: number;
  engagementGrowth: number;
}

interface TopPerformers {
  topAgents: Array<{ agentId: string; interactions: number }>;
  topUsers: Array<{ userId: string; activity: number }>;
  topTransactions: Array<{ transactionId: string; amount: number }>;
}

// Singleton instances
let analyticsTrackerInstance: AnalyticsTracker | null = null;

export const getAnalyticsTracker = (metricsCollector?: MetricsCollector): AnalyticsTracker => {
  if (!analyticsTrackerInstance && metricsCollector) {
    analyticsTrackerInstance = new AnalyticsTracker(metricsCollector);
  }
  if (!analyticsTrackerInstance) {
    throw new Error('AnalyticsTracker not initialized. Provide a MetricsCollector instance.');
  }
  return analyticsTrackerInstance;
};