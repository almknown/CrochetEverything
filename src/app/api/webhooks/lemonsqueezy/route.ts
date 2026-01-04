import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { subscriptions, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { lemonSqueezyWebhookEventSchema, lemonSqueezySubscriptionSchema } from '@/lib/validators/webhook';

const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get('x-signature');

    if (!signature) {
        return NextResponse.json(
            { error: 'Missing x-signature header' },
            { status: 401 }
        );
    }

    // Verify HMAC signature
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(body);
    const expectedSignature = hmac.digest('hex');

    if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 401 }
        );
    }

    try {
        const payload = JSON.parse(body);
        const eventResult = lemonSqueezyWebhookEventSchema.safeParse(payload);

        if (!eventResult.success) {
            console.error('Invalid webhook payload:', eventResult.error);
            return NextResponse.json(
                { error: 'Invalid payload' },
                { status: 400 }
            );
        }

        const event = eventResult.data;
        const eventName = event.meta.event_name;

        switch (eventName) {
            case 'subscription_created':
            case 'subscription_updated':
            case 'subscription_resumed': {
                await handleSubscriptionUpsert(event);
                break;
            }

            case 'subscription_cancelled':
            case 'subscription_expired': {
                await handleSubscriptionCanceled(event);
                break;
            }

            case 'subscription_payment_success': {
                console.log('Payment successful for subscription');
                break;
            }

            case 'subscription_payment_failed': {
                await handlePaymentFailed(event);
                break;
            }

            default:
                console.log(`Unhandled event type: ${eventName}`);
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

async function handleSubscriptionUpsert(event: { meta: { custom_data?: Record<string, unknown> }; data: { id: string; attributes: Record<string, unknown> } }) {
    const subscriptionResult = lemonSqueezySubscriptionSchema.safeParse(event.data);

    if (!subscriptionResult.success) {
        console.error('Invalid subscription data:', subscriptionResult.error);
        return;
    }

    const subscription = subscriptionResult.data;
    const userId = event.meta.custom_data?.userId as string | undefined;

    if (!userId) {
        console.error('No userId in custom_data');
        return;
    }

    // Ensure user exists
    await db
        .insert(users)
        .values({
            id: userId,
            email: subscription.attributes.user_email,
            firstName: subscription.attributes.user_name.split(' ')[0] || null,
            lastName: subscription.attributes.user_name.split(' ').slice(1).join(' ') || null,
        })
        .onConflictDoNothing();

    // Map Lemon Squeezy status to our schema status
    const statusMap: Record<string, 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing'> = {
        'active': 'active',
        'on_trial': 'trialing',
        'paused': 'canceled',
        'past_due': 'past_due',
        'unpaid': 'past_due',
        'cancelled': 'canceled',
        'expired': 'canceled',
    };

    const status = statusMap[subscription.attributes.status] || 'incomplete';

    // Upsert subscription
    await db
        .insert(subscriptions)
        .values({
            id: subscription.id,
            userId,
            status,
            priceId: String(subscription.attributes.variant_id),
            productId: String(subscription.attributes.product_id),
            provider: 'lemonsqueezy',
            currentPeriodEnd: subscription.attributes.renews_at
                ? new Date(subscription.attributes.renews_at)
                : null,
            cancelAtPeriodEnd: subscription.attributes.cancelled,
        })
        .onConflictDoUpdate({
            target: subscriptions.id,
            set: {
                status,
                priceId: String(subscription.attributes.variant_id),
                productId: String(subscription.attributes.product_id),
                currentPeriodEnd: subscription.attributes.renews_at
                    ? new Date(subscription.attributes.renews_at)
                    : null,
                cancelAtPeriodEnd: subscription.attributes.cancelled,
                updatedAt: new Date(),
            },
        });

    console.log(`Subscription ${subscription.id} upserted for user ${userId}`);
}

async function handleSubscriptionCanceled(event: { data: { id: string } }) {
    await db
        .update(subscriptions)
        .set({
            status: 'canceled',
            updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, event.data.id));

    console.log(`Subscription ${event.data.id} marked as canceled`);
}

async function handlePaymentFailed(event: { data: { id: string } }) {
    await db
        .update(subscriptions)
        .set({
            status: 'past_due',
            updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, event.data.id));

    console.log(`Subscription ${event.data.id} marked as past_due due to payment failure`);
}
