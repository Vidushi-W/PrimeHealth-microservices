# PrimeHealth Frontend UI

> Testing and demo interface for the Appointment + Payment microservices.
> Dark-mode, glassmorphism design — no framework dependencies.

---

## What This Is

The `Frontend_UI/` is a vanilla HTML/CSS/JS interface built for:
- Manually testing the full booking + payment flow without Postman
- Demonstrating the microservices during the assignment demo
- Providing proof of frontend integration for the report

**Not a production frontend.** That would be built with React/Next.js in a real product.

---

## Files

```
Frontend_UI/
├── index.html    # All sections: booking, appointments, payment, history
├── style.css     # Dark-mode glassmorphism design system
├── app.js        # API calls + state management + UI updates
└── README.md     # This file
```

---

## How to Open

```bash
# Option 1 — Live Server (VS Code)
# Right-click index.html → "Open with Live Server"

# Option 2 — Browser directly
open Frontend_UI/index.html         # macOS
start Frontend_UI/index.html        # Windows
xdg-open Frontend_UI/index.html    # Linux
```

---

## Prerequisites

Both backend services must be running:

```bash
# Terminal 1
cd micro-services/services/appointment-service && npm run dev

# Terminal 2
cd micro-services/services/payment-service && npm run dev
```

---

## Full Demo Flow

The UI supports the complete assignment flow in order:

1. **Book Appointment** — fill doctor ID, date, time, reason → creates appointment
2. **View My Appointments** — lists all appointments with status badges
3. **Pay** — select an appointment → initiate → confirm → appointment auto-confirms
4. **Payment History** — list all payments, download PDF invoice
5. **Queue Status** — check live queue position for pending appointments

---

## API Configuration

Service URLs are set at the top of `app.js`:

```javascript
const API = {
  appointment: 'http://localhost:5003',
  payment: 'http://localhost:5004'
};
```

Adjust if services run on different ports or hosts.

Mock auth headers are included in every request:

```javascript
headers: {
  'x-user-id': 'p-demo-123',
  'x-user-role': 'PATIENT'
}
```

---

## Design Tokens

Follows the design system from `design.md`:

| Theme | Value |
|-------|-------|
| Background | `#060f1e` |
| Cards | glassmorphism `rgba(255,255,255,0.04)` |
| Primary action | `#1e6fd9` |
| Success | `#22c55e` |
| Error | `#ef4444` |
| Font | Inter (Google Fonts) |

---

## Known Limitations

- No real-time updates — page refresh needed to see status changes
- No persistent login — mock user `p-demo-123` hardcoded
- PDF invoice download triggers a GET request streaming the PDF from `payment-service`
- No error recovery UI — if a service is down, check the browser console
