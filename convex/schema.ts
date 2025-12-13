import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  restaurants: defineTable({
    name: v.string(),
    slug: v.string(),
    ownerId: v.string(), // clerkId
    currency: v.string(),
    logoUrl: v.optional(v.string()),
    settings: v.object({
      allowSplitBill: v.boolean(),
      autoUpsell: v.boolean(),
    }),
  }).index("by_slug", ["slug"])
    .index("by_owner", ["ownerId"]),

  tables: defineTable({
    // Table status including reserved
    restaurantId: v.id("restaurants"),
    number: v.string(),
    qrCodeUrl: v.optional(v.string()),
    status: v.union(v.literal("free"), v.literal("occupied"), v.literal("payment_pending"), v.literal("dirty")),
  }).index("by_restaurant", ["restaurantId"])
    .index("by_restaurant_and_number", ["restaurantId", "number"]),

  categories: defineTable({
    restaurantId: v.id("restaurants"),
    name: v.string(),
    rank: v.number(),
    deletedAt: v.optional(v.number()),
  }).index("by_restaurant", ["restaurantId"])
    .index("by_restaurant_and_rank", ["restaurantId", "rank"]),

  modifiers: defineTable({
    restaurantId: v.id("restaurants"),
    name: v.string(),
    name_ar: v.optional(v.string()),
    price: v.number(),
    deletedAt: v.optional(v.number()),
  }).index("by_restaurant", ["restaurantId"]),

  menuItems: defineTable({
    restaurantId: v.id("restaurants"),
    categoryId: v.id("categories"),
    name: v.string(),
    description: v.string(),
    description_ar: v.optional(v.string()),
    price: v.number(),
    imageUrl: v.optional(v.string()), // Deprecated in favor of storageId, kept for backward compat if needed
    imageStorageId: v.optional(v.id("_storage")),
    isAvailable: v.boolean(),
    tags: v.array(v.string()),
    isArchived: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
    relatedModifiers: v.optional(v.array(v.id("modifiers"))),
  }).index("by_restaurant", ["restaurantId"])
    .index("by_category", ["categoryId"])
    .index("by_restaurant_and_availability", ["restaurantId", "isAvailable"]),

  orders: defineTable({
    restaurantId: v.id("restaurants"),
    tableId: v.id("tables"),
    status: v.union(
      v.literal("pending"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("served"),
      v.literal("paid"),
      v.literal("cancelled")
    ),
    totalAmount: v.number(),
    customerId: v.optional(v.id("customers")),
    isArchived: v.optional(v.boolean()),
  }).index("by_restaurant", ["restaurantId"])
    .index("by_table", ["tableId"])
    .index("by_restaurant_and_status", ["restaurantId", "status"])
    .index("by_table_and_status", ["tableId", "status"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    menuItemId: v.string(),
    quantity: v.number(),
    notes: v.optional(v.string()),
    modifiers: v.optional(v.array(v.object({
      modifierId: v.string(),
      quantity: v.number()
    }))),
    addedAt: v.number(),
  }).index("by_order", ["orderId"])
    .index("by_menu_item", ["menuItemId"]),

  feedback: defineTable({
    restaurantId: v.id("restaurants"),
    orderId: v.id("orders"),
    rating: v.number(),
    comment: v.optional(v.string()),
    isPrivate: v.boolean(),
  }).index("by_restaurant", ["restaurantId"])
    .index("by_order", ["orderId"])
    .index("by_restaurant_and_private", ["restaurantId", "isPrivate"]),

  customers: defineTable({
    deviceId: v.string(),
    visitCount: v.number(),
    lastVisitAt: v.number(),
  }).index("by_device", ["deviceId"]),

  waiterCalls: defineTable({
    restaurantId: v.id("restaurants"),
    tableId: v.id("tables"),
    type: v.union(v.literal("water"), v.literal("bill"), v.literal("help")),
    status: v.union(v.literal("pending"), v.literal("resolved")),
    resolvedAt: v.optional(v.number()),
  }).index("by_restaurant", ["restaurantId"])
    .index("by_table", ["tableId"])
    .index("by_restaurant_and_status", ["restaurantId", "status"]),

  managers: defineTable({
    restaurantId: v.id("restaurants"),
    email: v.string(),
    isOnline: v.boolean(),
    lastHeartbeat: v.optional(v.number()),
    lastSeenAt: v.number(),
    sessionExpiresAt: v.number(),
  }).index("by_restaurant", ["restaurantId"])
    .index("by_email", ["email"]),

  qrcodes: defineTable({
    restaurantId: v.id("restaurants"),
    tableId: v.optional(v.id("tables")),
    code: v.string(), // Unique token
    type: v.union(v.literal("menu"), v.literal("payment")),
    expiresAt: v.number(),
    isActive: v.boolean(),
  }).index("by_code", ["code"])
    .index("by_restaurant", ["restaurantId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
