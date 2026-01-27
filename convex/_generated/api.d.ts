/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accessControl from "../accessControl.js";
import type * as adminAuth from "../adminAuth.js";
import type * as analytics from "../analytics.js";
import type * as approvals from "../approvals.js";
import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as crons from "../crons.js";
import type * as customers from "../customers.js";
import type * as debug from "../debug.js";
import type * as feedback from "../feedback.js";
import type * as files from "../files.js";
import type * as fixes from "../fixes.js";
import type * as http from "../http.js";
import type * as managers from "../managers.js";
import type * as menuItems from "../menuItems.js";
import type * as migrations from "../migrations.js";
import type * as modifiers from "../modifiers.js";
import type * as orders from "../orders.js";
import type * as qrcodes from "../qrcodes.js";
import type * as restaurants from "../restaurants.js";
import type * as router from "../router.js";
import type * as security from "../security.js";
import type * as seedData from "../seedData.js";
import type * as seedExpandedMenu from "../seedExpandedMenu.js";
import type * as seedFullMenu from "../seedFullMenu.js";
import type * as seedGroupVerification from "../seedGroupVerification.js";
import type * as sessions from "../sessions.js";
import type * as staff from "../staff.js";
import type * as staffList from "../staffList.js";
import type * as subscriptions from "../subscriptions.js";
import type * as superAdmin from "../superAdmin.js";
import type * as superAdminAuth from "../superAdminAuth.js";
import type * as tables from "../tables.js";
import type * as updateBurgerBistroCategories from "../updateBurgerBistroCategories.js";
import type * as updateCurrency from "../updateCurrency.js";
import type * as utils from "../utils.js";
import type * as waiterCalls from "../waiterCalls.js";
import type * as waiters from "../waiters.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accessControl: typeof accessControl;
  adminAuth: typeof adminAuth;
  analytics: typeof analytics;
  approvals: typeof approvals;
  auth: typeof auth;
  categories: typeof categories;
  crons: typeof crons;
  customers: typeof customers;
  debug: typeof debug;
  feedback: typeof feedback;
  files: typeof files;
  fixes: typeof fixes;
  http: typeof http;
  managers: typeof managers;
  menuItems: typeof menuItems;
  migrations: typeof migrations;
  modifiers: typeof modifiers;
  orders: typeof orders;
  qrcodes: typeof qrcodes;
  restaurants: typeof restaurants;
  router: typeof router;
  security: typeof security;
  seedData: typeof seedData;
  seedExpandedMenu: typeof seedExpandedMenu;
  seedFullMenu: typeof seedFullMenu;
  seedGroupVerification: typeof seedGroupVerification;
  sessions: typeof sessions;
  staff: typeof staff;
  staffList: typeof staffList;
  subscriptions: typeof subscriptions;
  superAdmin: typeof superAdmin;
  superAdminAuth: typeof superAdminAuth;
  tables: typeof tables;
  updateBurgerBistroCategories: typeof updateBurgerBistroCategories;
  updateCurrency: typeof updateCurrency;
  utils: typeof utils;
  waiterCalls: typeof waiterCalls;
  waiters: typeof waiters;
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
