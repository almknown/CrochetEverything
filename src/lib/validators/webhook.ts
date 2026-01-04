import { z } from 'zod';

// ============================================
// STRIPE WEBHOOK SCHEMAS
// ============================================

export const stripeWebhookEventSchema = z.object({
    id: z.string(),
    type: z.string(),
    data: z.object({
        object: z.record(z.string(), z.unknown()),
    }),
    created: z.number(),
    livemode: z.boolean(),
});

export const stripeSubscriptionSchema = z.object({
    id: z.string(),
    customer: z.string(),
    status: z.enum(['active', 'canceled', 'past_due', 'incomplete', 'trialing', 'incomplete_expired', 'paused', 'unpaid']),
    current_period_start: z.number(),
    current_period_end: z.number(),
    cancel_at_period_end: z.boolean(),
    items: z.object({
        data: z.array(z.object({
            price: z.object({
                id: z.string(),
                product: z.string(),
            }),
        })),
    }),
    metadata: z.record(z.string(), z.string()).optional(),
});

export const stripeCustomerSchema = z.object({
    id: z.string(),
    email: z.string().email().nullable(),
    metadata: z.record(z.string(), z.string()).optional(),
});

// ============================================
// LEMON SQUEEZY WEBHOOK SCHEMAS
// ============================================

export const lemonSqueezyWebhookEventSchema = z.object({
    meta: z.object({
        event_name: z.string(),
        custom_data: z.record(z.string(), z.unknown()).optional(),
    }),
    data: z.object({
        id: z.string(),
        type: z.string(),
        attributes: z.record(z.string(), z.unknown()),
    }),
});

export const lemonSqueezySubscriptionSchema = z.object({
    id: z.string(),
    type: z.literal('subscriptions'),
    attributes: z.object({
        store_id: z.number(),
        customer_id: z.number(),
        order_id: z.number(),
        product_id: z.number(),
        variant_id: z.number(),
        product_name: z.string(),
        variant_name: z.string(),
        user_name: z.string(),
        user_email: z.string().email(),
        status: z.enum(['on_trial', 'active', 'paused', 'past_due', 'unpaid', 'cancelled', 'expired']),
        card_brand: z.string().nullable(),
        card_last_four: z.string().nullable(),
        pause: z.unknown().nullable(),
        cancelled: z.boolean(),
        trial_ends_at: z.string().nullable(),
        billing_anchor: z.number(),
        renews_at: z.string().nullable(),
        ends_at: z.string().nullable(),
        created_at: z.string(),
        updated_at: z.string(),
        test_mode: z.boolean(),
    }),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type StripeWebhookEvent = z.infer<typeof stripeWebhookEventSchema>;
export type StripeSubscription = z.infer<typeof stripeSubscriptionSchema>;
export type StripeCustomer = z.infer<typeof stripeCustomerSchema>;
export type LemonSqueezyWebhookEvent = z.infer<typeof lemonSqueezyWebhookEventSchema>;
export type LemonSqueezySubscription = z.infer<typeof lemonSqueezySubscriptionSchema>;
