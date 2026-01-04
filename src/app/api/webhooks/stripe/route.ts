import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { subscriptions, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Lazy-initialize Stripe to avoid build-time errors
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
    if (_stripe) return _stripe;

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY is required');
    }

    _stripe = new Stripe(secretKey);
    return _stripe;
}

function getWebhookSecret(): string {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
        throw new Error('STRIPE_WEBHOOK_SECRET is required');
    }
    return secret;
}

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
        return NextResponse.json(
            { error: 'Missing stripe-signature header' },
            { status: 401 }
        );
    }

    let event: Stripe.Event;

    try {
        const stripe = getStripe();
        const webhookSecret = getWebhookSecret();
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Webhook signature verification failed: ${message}`);
        return NextResponse.json(
            { error: `Webhook Error: ${message}` },
            { status: 400 }
        );
    }

    try {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionUpsert(subscription);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionDeleted(subscription);
                break;
            }

            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await handleCheckoutCompleted(session);
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Error processing webhook:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}

// ============================================
// HANDLER FUNCTIONS
// ============================================

async function handleSubscriptionUpsert(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.userId;

    if (!userId) {
        console.error('No userId in subscription metadata');
        return;
    }

    const priceId = subscription.items.data[0]?.price.id;
    const productId = typeof subscription.items.data[0]?.price.product === 'string'
        ? subscription.items.data[0].price.product
        : subscription.items.data[0]?.price.product?.id;

    // Map Stripe status to our schema status
    const statusMap: Record<string, 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing'> = {
        'active': 'active',
        'canceled': 'canceled',
        'past_due': 'past_due',
        'incomplete': 'incomplete',
        'trialing': 'trialing',
        'incomplete_expired': 'incomplete',
        'paused': 'canceled',
        'unpaid': 'past_due',
    };

    const status = statusMap[subscription.status] || 'incomplete';

    // Get period dates from the subscription object
    const currentPeriodStart = getDateFromSubscription(subscription, 'start');
    const currentPeriodEnd = getDateFromSubscription(subscription, 'end');

    // Upsert subscription
    await db
        .insert(subscriptions)
        .values({
            id: subscription.id,
            userId,
            status,
            priceId,
            productId,
            provider: 'stripe',
            currentPeriodStart,
            currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
        })
        .onConflictDoUpdate({
            target: subscriptions.id,
            set: {
                status,
                priceId,
                productId,
                currentPeriodStart,
                currentPeriodEnd,
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                updatedAt: new Date(),
            },
        });

    console.log(`Subscription ${subscription.id} upserted for user ${userId}`);
}

// Helper to extract date from subscription object (handles API version differences)
function getDateFromSubscription(
    subscription: Stripe.Subscription,
    period: 'start' | 'end'
): Date | null {
    // Access the raw subscription data to handle different API versions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = subscription as any;

    // Try new API format first (current_period object)
    if (sub.current_period) {
        const value = period === 'start' ? sub.current_period.start : sub.current_period.end;
        if (typeof value === 'number') return new Date(value * 1000);
        if (value instanceof Date) return value;
    }

    // Try legacy format (current_period_start / current_period_end)
    const legacyKey = period === 'start' ? 'current_period_start' : 'current_period_end';
    const legacyValue = sub[legacyKey];
    if (typeof legacyValue === 'number') return new Date(legacyValue * 1000);
    if (legacyValue instanceof Date) return legacyValue;

    return null;
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    await db
        .update(subscriptions)
        .set({
            status: 'canceled',
            updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id));

    console.log(`Subscription ${subscription.id} marked as canceled`);
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    console.log(`Checkout completed: ${session.id}`);

    const userId = session.metadata?.userId;
    const customerEmail = session.customer_email;

    if (userId && customerEmail) {
        await db
            .insert(users)
            .values({
                id: userId,
                email: customerEmail,
            })
            .onConflictDoNothing();
    }
}
