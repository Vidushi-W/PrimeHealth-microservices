# PayHere sandbox (development)

**Default for local development:** the stack uses **`PAYMENT_PROVIDER=SIMULATED`** (no PayHere, no merchant signup). Use this document when you switch to **`PAYMENT_PROVIDER=PAYHERE`** and the PayHere **sandbox**. No live merchant account or real charges are required in sandbox.

Official references:

- [PayHere Support](https://support.payhere.lk/)
- Sandbox merchant area: [https://sandbox.payhere.lk/](https://sandbox.payhere.lk/)

---

## 1. Create a sandbox merchant account

1. Open **[https://sandbox.payhere.lk/](https://sandbox.payhere.lk/)** and sign up or log in. **Do not use [www.payhere.lk](https://www.payhere.lk/) for local testing** — that is the **live** merchant area. Sandbox Merchant IDs are only valid with **sandbox** checkout (`https://sandbox.payhere.lk/pay/checkout`). If PayHere says you are testing **live** payments on localhost, you are almost certainly logged into the wrong portal or have `PAYHERE_USE_SANDBOX=false`.
2. In the merchant dashboard, open the integration / API section and copy:
   - **Merchant ID** (this is an account identifier — **not** an IP address)
   - **Merchant Secret** (keep private; never commit it to git, and **do not paste it into chat or email**)

Use **only** these sandbox values while `PAYHERE_USE_SANDBOX` is not set to `false`.

**Who provides what:** PayHere (and only PayHere) issues your **Merchant ID** and **Merchant Secret** after you register. No third party can “create” those for you. A **public hostname** for webhooks (below) comes from **your** tunnel or hosting — not from this repo.

---

## 2. Public hostname for `notify_url` (IPN)

PayHere’s servers must be able to **POST** to your payment service. `http://localhost:5004` is not reachable from the internet, so you need a **temporary public URL** while developing.

This project **does not** assign you a domain. You choose one of these:

### Option A — ngrok (common on Windows)

1. Install: [https://ngrok.com/download](https://ngrok.com/download) (or `winget install ngrok.ngrok`).
2. Sign up at ngrok, run `ngrok config add-authtoken <token>` once.
3. Start your stack so **payment-service** listens on **5004** (host port).
4. In a separate terminal:

   ```powershell
   ngrok http 5004
   ```

5. Copy the **HTTPS** forwarding URL ngrok prints (for example `https://abcd-12-34-56-78.ngrok-free.app`).
6. Set in your repo root `.env`:

   ```env
   PAYHERE_NOTIFY_URL=https://abcd-12-34-56-78.ngrok-free.app/api/payments/payhere/notify
   ```

7. Restart `payment-service`. If you restart ngrok, the hostname may change (free tier); update `.env` again.

### Option B — Cloudflare Tunnel (`cloudflared`)

Similar idea: expose local port 5004 and use the `https://....trycloudflare.com` (or your own hostname) URL + `/api/payments/payhere/notify`. See [Cloudflare Tunnel docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/).

### Option C — deployed API

When you host the payment service on a real server, set `PAYHERE_NOTIFY_URL` to `https://your-production-domain/api/payments/payhere/notify`.

---

## 3. Configure the payment service

### Docker (recommended)

At the **repository root**, create or edit `.env` (same level as `README.md`) so Docker Compose can pass variables into `payment-service`:

```env
# PayHere — development uses SANDBOX only
PAYMENT_PROVIDER=PAYHERE
PAYHERE_USE_SANDBOX=true
PAYHERE_MERCHANT_ID=your_sandbox_merchant_id
PAYHERE_MERCHANT_SECRET=your_sandbox_merchant_secret

# Browser app (Vite default). Return/cancel URLs use this + /appointments
PAYHERE_FRONTEND_BASE_URL=http://localhost:5173

# IPN: use your public tunnel URL + path (see section 2), or localhost only if you skip IPN testing
PAYHERE_NOTIFY_URL=https://YOUR-NGROK-SUBDOMAIN.ngrok-free.app/api/payments/payhere/notify
```

Then from `micro-services/docker`:

```bash
docker compose up -d --build payment-service
```

### Local Node (no Docker)

Copy `micro-services/services/payment-service/.env.example` to `.env` in that folder, set the same variables, and run the payment service on port **5004**.

---

## 4. Configure the frontend

Point the UI at the payment API (defaults match the Docker stack):

**`Frontend_UI/.env.local`** (optional if defaults work):

```env
VITE_PAYMENT_API_URL=http://localhost:5004
```

Run the app (typically **http://localhost:5173**).

---

## 5. Verify the service is in sandbox mode

After the payment service starts, open:

```text
GET http://localhost:5004/health
```

You should see JSON similar to:

```json
{
  "status": "UP",
  "service": "payment-service",
  "payhere": {
    "provider": "PAYHERE",
    "mode": "sandbox",
    "checkoutUrl": "https://sandbox.payhere.lk/pay/checkout",
    "merchantConfigured": true
  }
}
```

- **`merchantConfigured`: `false`** → set `PAYHERE_MERCHANT_ID` and `PAYHERE_MERCHANT_SECRET` and restart.
- **`mode`: `live`** → you set `PAYHERE_USE_SANDBOX=false`; use only when you intentionally switch to production credentials.

---

## 6. Test a payment in the app

Checkout is **not embedded** in PrimeHealth: the app POSTs to **PayHere’s hosted page** (sandbox: `https://sandbox.payhere.lk/pay/checkout`). By default the UI opens that page in a **new browser tab** (`VITE_PAYHERE_CHECKOUT_TARGET` defaults to `_blank` in `platformApi.js`).

1. Log in as a **patient**.
2. Use **Book & pay now** (Find a doctor), **Book appointment** flow, or **Pay online** on the Appointments hub.
3. Complete card details on PayHere’s site using **sandbox test cards** from [PayHere Support](https://support.payhere.lk/).
4. After success, PayHere sends the browser to **`/appointments`** on your app. The hub reloads the list and shows the booking under **Active (paid)** when payment is **SUCCESS** (via return URL + payment lookup, and/or **notify** IPN updating the appointment service).

To use the **same tab** instead of a new tab, set `VITE_PAYHERE_CHECKOUT_TARGET=_self` in `Frontend_UI/.env.local`.

---

## 7. “Unauthorized payment request” on checkout

Usually the **MD5 hash** does not match what PayHere expects:

- The hash uses the **merchant secret exactly as stored in `.env`** (same as PayHere’s own samples: [Next.js example](https://github.com/charith-codex/payhere-nextjs15-integration/blob/main/app/api/payment/route.js)). If your portal value is Base64 and PayHere still fails, set **`PAYHERE_MERCHANT_SECRET_DECODE_BASE64=true`** in `.env`, restart the payment service, and try again (that hashes the decoded numeric string).
- Hosted sandbox posts also send **`testMode=on`** (see PayHere’s WHMCS module) so the gateway treats the request as sandbox.
- Confirm **Merchant ID** and **secret** are copied from **https://sandbox.payhere.lk/** (not the live site).

---

## 8. Notify URL recap

- **`http://localhost:5004/...`** is fine for local debugging of the route itself; PayHere’s **production/sandbox cloud** usually **cannot** call it. Use **section 2** for a public `PAYHERE_NOTIFY_URL`.
- You can still open the **PayHere checkout** and use **return URL** in the browser without IPN; marking appointments **paid** in your DB normally needs a successful **notify** (or your own manual/admin step).

---

## 9. Going live later

When you move to production:

1. Use **live** credentials from [https://www.payhere.lk/](https://www.payhere.lk/) (not sandbox).
2. Set `PAYHERE_USE_SANDBOX=false`.
3. Set `PAYHERE_MERCHANT_ID` and `PAYHERE_MERCHANT_SECRET` to the **live** values.
4. Set `PAYHERE_NOTIFY_URL` and `PAYHERE_FRONTEND_BASE_URL` to your **HTTPS** production URLs.

---

## 10. Optional: simulated gateway (no PayHere)

For automated tests without hitting PayHere at all, you can set `PAYMENT_PROVIDER=SIMULATED` (no merchant credentials). That path does not open the PayHere checkout; it is separate from sandbox testing.
