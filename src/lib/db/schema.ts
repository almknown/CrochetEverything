import { pgTable, text, timestamp, boolean, pgEnum, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// ENUMS
// ============================================

export const subscriptionStatusEnum = pgEnum('subscription_status', [
    'active',
    'canceled',
    'past_due',
    'incomplete',
    'trialing',
]);

export const shapeTypeEnum = pgEnum('shape_type', [
    'rectangle',
    'circle',
    'triangle',
    'hexagon',
    'oval',
]);

export const patternStatusEnum = pgEnum('pattern_status', [
    'draft',
    'published',
    'private',
]);

// ============================================
// USERS TABLE
// ============================================

export const users = pgTable('users', {
    id: text('id').primaryKey(), // Clerk user ID
    email: text('email').notNull().unique(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    imageUrl: text('image_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================
// SUBSCRIPTIONS TABLE
// ============================================

export const subscriptions = pgTable('subscriptions', {
    id: text('id').primaryKey(), // Stripe/LemonSqueezy subscription ID
    userId: text('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    status: subscriptionStatusEnum('status').notNull().default('incomplete'),
    priceId: text('price_id'),
    productId: text('product_id'),
    provider: text('provider').notNull().default('stripe'), // 'stripe' or 'lemonsqueezy'
    currentPeriodStart: timestamp('current_period_start'),
    currentPeriodEnd: timestamp('current_period_end'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================
// PATTERNS TABLE
// ============================================

export const patterns = pgTable('patterns', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    prompt: text('prompt').notNull(), // Original user prompt
    shapeType: shapeTypeEnum('shape_type').notNull(),
    status: patternStatusEnum('status').default('draft'),
    instructions: text('instructions').notNull(), // Generated pattern text (JSON)
    meshData: text('mesh_data'), // JSON for 3D preview vertices/faces
    thumbnailUrl: text('thumbnail_url'),
    colors: text('colors'), // JSON array of hex colors
    dimensions: text('dimensions'), // JSON { width, height, rows, stitchesPerRow }
    likes: integer('likes').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================
// RELATIONS
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
    subscriptions: many(subscriptions),
    patterns: many(patterns),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
    user: one(users, {
        fields: [subscriptions.userId],
        references: [users.id],
    }),
}));

export const patternsRelations = relations(patterns, ({ one }) => ({
    user: one(users, {
        fields: [patterns.userId],
        references: [users.id],
    }),
}));

// ============================================
// TYPE EXPORTS
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Pattern = typeof patterns.$inferSelect;
export type NewPattern = typeof patterns.$inferInsert;
