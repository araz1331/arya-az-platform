import { getStripeClient } from './stripeClient';
import { db } from './db';
import { sql } from 'drizzle-orm';

const BUNDLE_PRICE_IDS: Record<string, { has_chat: boolean; has_voice: boolean; has_sales: boolean }> = {
  // Bundle A ($169/mo) — Chat + Voice
  // Replace with actual Stripe Price IDs when created
  "price_bundle_a_monthly": { has_chat: true, has_voice: true, has_sales: false },
  "price_bundle_a_yearly": { has_chat: true, has_voice: true, has_sales: false },
  // Ultimate Bundle ($599/mo) — Chat + Voice + Sales
  "price_ultimate_monthly": { has_chat: true, has_voice: true, has_sales: true },
  "price_ultimate_yearly": { has_chat: true, has_voice: true, has_sales: true },
};

async function syncProductFlags(email: string, flags: { has_chat: boolean; has_voice: boolean; has_sales: boolean }) {
  const apiKey = process.env.UNIFIED_API_KEY;
  if (!apiKey) {
    console.log('[stripe] UNIFIED_API_KEY not set, skipping cross-service product flag sync');
    return;
  }

  try {
    const res = await fetch('https://sales.hirearya.com/api/subscription/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ email, ...flags }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      console.log(`[stripe] Product flags synced for ${email}:`, flags);
    } else {
      console.error(`[stripe] Failed to sync product flags for ${email}: ${res.status}`);
    }
  } catch (err: any) {
    console.error(`[stripe] Cross-service sync error for ${email}:`, err?.message);
  }
}

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
    const { userId, type, priceId } = metadata;
    const customerEmail = session.customer_email || session.customer_details?.email;

    console.log(`[stripe] Checkout completed — type: ${type}, userId: ${userId}, mode: ${session.mode}, priceId: ${priceId}`);

    if (!userId) {
      console.log('[stripe] No userId in metadata, skipping auto-activation');
      return;
    }

    const lineItems = session.line_items?.data || [];
    const actualPriceId = priceId || lineItems[0]?.price?.id;

    if (actualPriceId && BUNDLE_PRICE_IDS[actualPriceId]) {
      const flags = BUNDLE_PRICE_IDS[actualPriceId];
      console.log(`[stripe] Bundle price detected: ${actualPriceId}, flags:`, flags);

      try {
        const result = await db.execute(sql`
          UPDATE smart_profiles 
          SET is_pro = true, pro_expires_at = ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
          WHERE user_id = ${userId}
        `);
        console.log(`[stripe] Local PRO activated for user ${userId}, rows: ${result.rowCount}`);
      } catch (err: any) {
        console.error(`[stripe] Failed to activate local PRO for user ${userId}:`, err?.message);
      }

      if (customerEmail) {
        await syncProductFlags(customerEmail, flags);
      } else {
        try {
          const [user] = await db.execute(sql`SELECT email FROM users WHERE id = ${userId}`);
          if ((user as any)?.email) {
            await syncProductFlags((user as any).email, flags);
          }
        } catch (err: any) {
          console.error(`[stripe] Failed to lookup user email for ${userId}:`, err?.message);
        }
      }

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
