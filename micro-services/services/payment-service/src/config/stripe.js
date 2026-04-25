const Stripe = require('stripe');

function resolveFrontendBase() {
  const fromEnv = String(process.env.STRIPE_FRONTEND_BASE_URL || '').trim();
  const base = fromEnv || 'http://localhost:5173';
  return base.replace(/\/+$/, '');
}

function getStripeClient() {
  const key = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!key) return null;
  return new Stripe(key);
}

function getStripeStatus() {
  const provider = String(process.env.PAYMENT_PROVIDER || 'SIMULATED').toUpperCase();
  const secretKeySet = Boolean(String(process.env.STRIPE_SECRET_KEY || '').trim());
  const publishableKeySet = Boolean(String(process.env.STRIPE_PUBLISHABLE_KEY || '').trim());
  const webhookSecretSet = Boolean(String(process.env.STRIPE_WEBHOOK_SECRET || '').trim());
  const mode = provider === 'STRIPE' ? 'checkout' : 'off';

  return {
    provider,
    mode,
    secretKeyConfigured: secretKeySet,
    publishableKeyConfigured: publishableKeySet,
    webhookSecretConfigured: webhookSecretSet
  };
}

module.exports = {
  getStripeClient,
  getStripeStatus,
  resolveFrontendBase
};
