import { getStripeClient } from './stripeClient';

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

    if (!webhookSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET not set, skipping signature verification');
      const event = JSON.parse(payload.toString());
      console.log('Webhook event:', event.type);
      return;
    }

    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    console.log('Stripe webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed':
        console.log('Checkout completed:', event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        console.log('Subscription update:', event.data.object);
        break;
      default:
        console.log('Unhandled event type:', event.type);
    }
  }
}
