/**
 * PayHere gateway configuration.
 *
 * Development should use the PayHere **sandbox** only:
 * - Merchant portal: https://sandbox.payhere.lk/
 * - Checkout POST URL: https://sandbox.payhere.lk/pay/checkout
 *
 * Set `PAYHERE_USE_SANDBOX=false` only when moving to production with live credentials.
 *
 * @see https://support.payhere.lk/
 */

const PAYHERE_SANDBOX_CHECKOUT_URL = 'https://sandbox.payhere.lk/pay/checkout';
const PAYHERE_LIVE_CHECKOUT_URL = 'https://www.payhere.lk/pay/checkout';

/**
 * @returns {boolean} true unless PAYHERE_USE_SANDBOX is explicitly the string "false"
 */
function isPayHereSandbox() {
  return String(process.env.PAYHERE_USE_SANDBOX ?? 'true').toLowerCase() !== 'false';
}

function getPayHereCheckoutUrl() {
  return isPayHereSandbox() ? PAYHERE_SANDBOX_CHECKOUT_URL : PAYHERE_LIVE_CHECKOUT_URL;
}

/**
 * Browser origin for return/cancel URLs when the client does not pass returnUrl.
 * Defaults to Vite dev server; override with PAYHERE_FRONTEND_BASE_URL.
 */
function resolveFrontendBase() {
  const fromEnv = String(process.env.PAYHERE_FRONTEND_BASE_URL || '').trim();
  const base = fromEnv || 'http://localhost:5173';
  return base.replace(/\/+$/, '');
}

/**
 * PayHere's MD5 uses the merchant secret exactly as in the merchant portal (see official samples).
 * If your secret is Base64 and PayHere still rejects the hash, set PAYHERE_MERCHANT_SECRET_DECODE_BASE64=true
 * to hash the decoded numeric string instead.
 */
function normalizeMerchantSecretForHash(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  const decodeFlag = String(process.env.PAYHERE_MERCHANT_SECRET_DECODE_BASE64 || '').toLowerCase();
  if (decodeFlag !== 'true' && decodeFlag !== '1') {
    return trimmed;
  }
  const looksB64 = /^[A-Za-z0-9+/]+=*$/.test(trimmed) && trimmed.length % 4 === 0;
  if (!looksB64) {
    return trimmed;
  }
  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8').trim();
    if (decoded && /^\d+$/.test(decoded)) {
      return decoded;
    }
  } catch (_e) {
    /* use raw */
  }
  return trimmed;
}

/**
 * Safe summary for /health (no secrets).
 */
function getPayHereStatus() {
  const provider = String(process.env.PAYMENT_PROVIDER || 'SIMULATED').toUpperCase();
  const sandbox = isPayHereSandbox();
  const merchantIdSet = Boolean(String(process.env.PAYHERE_MERCHANT_ID || '').trim());
  const merchantSecretSet = Boolean(String(process.env.PAYHERE_MERCHANT_SECRET || '').trim());

  let mode = 'off';
  if (provider === 'PAYHERE') {
    mode = sandbox ? 'sandbox' : 'live';
  }

  return {
    provider,
    mode,
    checkoutUrl: provider === 'PAYHERE' ? getPayHereCheckoutUrl() : null,
    merchantConfigured: merchantIdSet && merchantSecretSet
  };
}

module.exports = {
  isPayHereSandbox,
  getPayHereCheckoutUrl,
  resolveFrontendBase,
  normalizeMerchantSecretForHash,
  getPayHereStatus,
  PAYHERE_SANDBOX_CHECKOUT_URL,
  PAYHERE_LIVE_CHECKOUT_URL
};
