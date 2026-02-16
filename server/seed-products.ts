import { getUncachableStripeClient } from './stripeClient';

async function ensureProduct(stripe: any, config: {
  name: string;
  description: string;
  metadata: Record<string, string>;
  priceAmount: number;
  currency: string;
  recurring?: { interval: string };
}) {
  const existing = await stripe.products.search({ query: `name:'${config.name}'` });
  if (existing.data.length > 0) {
    const prices = await stripe.prices.list({ product: existing.data[0].id, active: true });
    console.log(`${config.name} already exists: ${existing.data[0].id}`);
    console.log(`  Price: ${prices.data[0]?.id} - $${(prices.data[0]?.unit_amount || 0) / 100}${config.recurring ? '/mo' : ' one-time'}`);
    return;
  }

  const product = await stripe.products.create({
    name: config.name,
    description: config.description,
    metadata: config.metadata,
  });

  const priceData: any = {
    product: product.id,
    unit_amount: config.priceAmount,
    currency: config.currency,
  };
  if (config.recurring) {
    priceData.recurring = config.recurring;
  }

  const price = await stripe.prices.create(priceData);
  console.log(`Created ${config.name}: ${product.id}`);
  console.log(`  Price: ${price.id} - $${config.priceAmount / 100}${config.recurring ? '/mo' : ' one-time'}`);
}

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  await ensureProduct(stripe, {
    name: 'Founding Member Pass',
    description: 'Lifetime access to Arya Pro — unlimited AI chat, voice responses, lead capture, WhatsApp & Instagram integration, and Founder badge.',
    metadata: { type: 'lifetime', tier: 'founder', maxSpots: '1000' },
    priceAmount: 9900,
    currency: 'usd',
  });

  await ensureProduct(stripe, {
    name: 'Arya Pro',
    description: 'AI receptionist with unlimited chat, voice responses, lead capture, and analytics.',
    metadata: { type: 'subscription', tier: 'pro' },
    priceAmount: 2900,
    currency: 'usd',
    recurring: { interval: 'month' },
  });

  await ensureProduct(stripe, {
    name: 'Arya Agency',
    description: 'Multi-location AI receptionist with priority support, API access, custom branding, and team management.',
    metadata: { type: 'subscription', tier: 'agency' },
    priceAmount: 19900,
    currency: 'usd',
    recurring: { interval: 'month' },
  });

  console.log('\nAll products ready.');
}

createProducts().catch(console.error);
