import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  const existing = await stripe.products.search({ query: "name:'Founding Member Pass'" });
  if (existing.data.length > 0) {
    console.log('Founding Member Pass already exists:', existing.data[0].id);
    const prices = await stripe.prices.list({ product: existing.data[0].id, active: true });
    console.log('Price:', prices.data[0]?.id, '- $' + (prices.data[0]?.unit_amount || 0) / 100);
    return;
  }

  const product = await stripe.products.create({
    name: 'Founding Member Pass',
    description: 'Lifetime access to Arya Pro — unlimited AI chat, voice responses, lead capture, WhatsApp & Instagram integration, and Founder badge.',
    metadata: {
      type: 'lifetime',
      tier: 'founder',
      maxSpots: '1000',
    },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 9900,
    currency: 'usd',
  });

  console.log('Created product:', product.id);
  console.log('Created price:', price.id, '- $99.00 one-time');
  console.log('\nSave this price ID for checkout: ', price.id);
}

createProducts().catch(console.error);
