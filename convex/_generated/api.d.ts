/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as cleanup from "../cleanup.js";
import type * as crons from "../crons.js";
import type * as customers from "../customers.js";
import type * as feedback from "../feedback.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as menuItems from "../menuItems.js";
import type * as modifiers from "../modifiers.js";
import type * as orders from "../orders.js";
import type * as restaurants from "../restaurants.js";
import type * as router from "../router.js";
import type * as seedData from "../seedData.js";
import type * as tables from "../tables.js";
import type * as updateCurrency from "../updateCurrency.js";
import type * as waiterCalls from "../waiterCalls.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  auth: typeof auth;
  categories: typeof categories;
  cleanup: typeof cleanup;
  crons: typeof crons;
  customers: typeof customers;
  feedback: typeof feedback;
  files: typeof files;
  http: typeof http;
  menuItems: typeof menuItems;
  modifiers: typeof modifiers;
  orders: typeof orders;
  restaurants: typeof restaurants;
  router: typeof router;
  seedData: typeof seedData;
  tables: typeof tables;
  updateCurrency: typeof updateCurrency;
  waiterCalls: typeof waiterCalls;
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
