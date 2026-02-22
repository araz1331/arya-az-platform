import { getStripeClient } from './stripeClient';
import { db } from './db';
import { sql } from 'drizzle-orm';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const stripe = getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: any;

    if (!webhookSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET not set, skipping signature verification');
      event = JSON.parse(payload.toString());
    } else {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    }

    console.log('Stripe webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed':
        await WebhookHandlers.handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        console.log('Subscription update:', event.data.object);
        break;
      default:
        console.log('Unhandled event type:', event.type);
    }
  }

  static async handleCheckoutCompleted(session: any): Promise<void> {
    const metadata = session.metadata || {};
    const { userId, type } = metadata;

    console.log(`[stripe] Checkout completed — type: ${type}, userId: ${userId}, mode: ${session.mode}`);

    if (!userId) {
      console.log('[stripe] No userId in metadata, skipping auto-activation');
      return;
    }

    if (type === 'founding_member' && session.mode === 'payment' && session.payment_status === 'paid') {
      try {
        const result = await db.execute(sql`
          UPDATE smart_profiles 
          SET is_pro = true, pro_expires_at = NULL
          WHERE user_id = ${userId}
        `);
        console.log(`[stripe] Founding Member Pass activated (lifetime PRO) for user ${userId}, rows: ${result.rowCount}`);
      } catch (err: any) {
        console.error(`[stripe] Failed to activate Founding Member for user ${userId}:`, err?.message);
      }
    } else if ((type === 'pro' || type === 'agency') && session.mode === 'subscription') {
      try {
        const days = type === 'agency' ? 30 : 30;
        const proExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        const result = await db.execute(sql`
          UPDATE smart_profiles 
          SET is_pro = true, pro_expires_at = ${proExpiresAt}
          WHERE user_id = ${userId}
        `);
        console.log(`[stripe] ${type} subscription activated for user ${userId}, expires: ${proExpiresAt.toISOString()}, rows: ${result.rowCount}`);
      } catch (err: any) {
        console.error(`[stripe] Failed to activate ${type} for user ${userId}:`, err?.message);
      }
    } else {
      console.log(`[stripe] Checkout completed but no matching activation rule — type: ${type}, mode: ${session.mode}`);
    }
  }
}
