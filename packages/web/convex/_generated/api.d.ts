/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agentReputationCache from "../agentReputationCache.js";
import type * as apiKeys from "../apiKeys.js";
import type * as apiUsage from "../apiUsage.js";
import type * as conversations from "../conversations.js";
import type * as credentialsAction from "../credentialsAction.js";
import type * as credentialsAnalytics from "../credentialsAnalytics.js";
import type * as credentialsOrchestrator from "../credentialsOrchestrator.js";
import type * as credentialsRetry from "../credentialsRetry.js";
import type * as crons from "../crons.js";
import type * as favorites from "../favorites.js";
import type * as fraudDetection from "../fraudDetection.js";
import type * as ghostProtect from "../ghostProtect.js";
import type * as ghostScore from "../ghostScore.js";
import type * as payaiReputation from "../payaiReputation.js";
import type * as payaiRetries from "../payaiRetries.js";
import type * as payments from "../payments.js";
import type * as revenue from "../revenue.js";
import type * as reviews from "../reviews.js";
import type * as staking from "../staking.js";
import type * as teamBilling from "../teamBilling.js";
import type * as teamBillingEnhanced from "../teamBillingEnhanced.js";
import type * as teamMembers from "../teamMembers.js";
import type * as teams from "../teams.js";
import type * as transparency from "../transparency.js";
import type * as userBilling from "../userBilling.js";
import type * as userBillingEnhanced from "../userBillingEnhanced.js";
import type * as users from "../users.js";
import type * as verifications from "../verifications.js";
import type * as webhookDelivery from "../webhookDelivery.js";
import type * as webhookProcessor from "../webhookProcessor.js";
import type * as webhooks from "../webhooks.js";
import type * as x402Actions from "../x402Actions.js";
import type * as x402Indexer from "../x402Indexer.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agentReputationCache: typeof agentReputationCache;
  apiKeys: typeof apiKeys;
  apiUsage: typeof apiUsage;
  conversations: typeof conversations;
  credentialsAction: typeof credentialsAction;
  credentialsAnalytics: typeof credentialsAnalytics;
  credentialsOrchestrator: typeof credentialsOrchestrator;
  credentialsRetry: typeof credentialsRetry;
  crons: typeof crons;
  favorites: typeof favorites;
  fraudDetection: typeof fraudDetection;
  ghostProtect: typeof ghostProtect;
  ghostScore: typeof ghostScore;
  payaiReputation: typeof payaiReputation;
  payaiRetries: typeof payaiRetries;
  payments: typeof payments;
  revenue: typeof revenue;
  reviews: typeof reviews;
  staking: typeof staking;
  teamBilling: typeof teamBilling;
  teamBillingEnhanced: typeof teamBillingEnhanced;
  teamMembers: typeof teamMembers;
  teams: typeof teams;
  transparency: typeof transparency;
  userBilling: typeof userBilling;
  userBillingEnhanced: typeof userBillingEnhanced;
  users: typeof users;
  verifications: typeof verifications;
  webhookDelivery: typeof webhookDelivery;
  webhookProcessor: typeof webhookProcessor;
  webhooks: typeof webhooks;
  x402Actions: typeof x402Actions;
  x402Indexer: typeof x402Indexer;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
