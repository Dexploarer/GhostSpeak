/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent from "../agent.js";
import type * as credentials from "../credentials.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as ghostDiscovery from "../ghostDiscovery.js";
import type * as ghostScoreCalculator from "../ghostScoreCalculator.js";
import type * as lib_networkMetadata from "../lib/networkMetadata.js";
import type * as observation from "../observation.js";
import type * as onboarding from "../onboarding.js";
import type * as solanaAuth from "../solanaAuth.js";
import type * as x402Indexer from "../x402Indexer.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agent: typeof agent;
  credentials: typeof credentials;
  crons: typeof crons;
  dashboard: typeof dashboard;
  ghostDiscovery: typeof ghostDiscovery;
  ghostScoreCalculator: typeof ghostScoreCalculator;
  "lib/networkMetadata": typeof lib_networkMetadata;
  observation: typeof observation;
  onboarding: typeof onboarding;
  solanaAuth: typeof solanaAuth;
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
