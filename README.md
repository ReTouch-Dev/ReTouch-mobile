# ReTouch Mobile

Consumer receipt wallet — photograph receipts, get structured OCR data, track spending.

Built with **Expo 52 + Expo Router v4** (React Native). Companion to [ReTouch-server](../ReTouch-server).

---

## Architecture

```
ReTouch-mobile/
├── app/
│   ├── _layout.tsx          # Root layout: QueryClient, AuthGate, safe-area
│   ├── auth/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── receipts.tsx     # Receipt library — search, paginated FlatList
│   │   ├── capture.tsx      # Camera / gallery → upload → OCR poll
│   │   ├── analytics.tsx    # Spending summary, merchants, categories, AI insights
│   │   └── profile.tsx      # User info, sign out
│   └── receipt/[id].tsx     # Full receipt detail + line items
└── src/
    ├── api/
    │   ├── client.ts        # fetch wrapper with SecureStore JWT, ApiError, UnauthorizedError
    │   ├── auth.ts          # login, register, refresh, me, logout
    │   ├── receipts.ts      # list, detail, upload (FormData)
    │   └── analytics.ts     # summary, topMerchants, categoryBreakdown, insights
    ├── store/
    │   └── authStore.ts     # Zustand — hydrate, login, register, logout, refreshToken
    ├── theme/
    │   └── tokens.ts        # colors, spacing, radius, shadow, fonts
    └── __tests__/
        ├── authStore.test.ts
        ├── login.test.tsx
        ├── receipts.test.tsx
        ├── capture.test.tsx
        └── analytics.test.tsx
```

### Key design decisions

| Concern | Approach |
|---|---|
| Auth | JWT (24h access + refresh) stored in `expo-secure-store` |
| Server state | TanStack Query v5 — queries, invalidation, `refetchInterval` for OCR polling |
| Client state | Zustand v5 — auth only; everything else is server state |
| Forms | react-hook-form + Zod for schema validation |
| File upload | FormData with `expo-image-picker` result URI |
| Images | `expo-image` with `contentFit="contain"` and 200ms transition |
| Analytics | Separate analytics service (`EXPO_PUBLIC_ANALYTICS_BASE_URL`), JWT-authed |
| Storage backend | Server abstracts local vs. R2/S3 — mobile always calls `/api/mobile/receipts` |

### Backend integration

The mobile app talks to two services:

1. **ReTouch-server** (`EXPO_PUBLIC_API_BASE_URL`, default `:5000`) — auth, receipts, uploads
2. **Analytics service** (`EXPO_PUBLIC_ANALYTICS_BASE_URL`, default `:5002/analytics`) — spend data, AI insights

Virtual device: each user gets a virtual device row (`m` + 3 chars) created automatically on first upload. This satisfies the server's `receipts.device_id NOT NULL` constraint without requiring hardware registration.

---

## Getting started

```bash
cp .env.example .env
# Edit .env — set EXPO_PUBLIC_API_BASE_URL to your machine's LAN IP if testing on device
npm install
npm start        # opens Expo Dev Tools — press i (iOS), a (Android), or w (web)
```

### Physical device

Replace `localhost` with your machine's LAN IP in `.env`:

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:5000
EXPO_PUBLIC_ANALYTICS_BASE_URL=http://192.168.x.x:5002/analytics
```

---

## Development

```bash
npm test           # jest (passWithNoTests)
npm run test:watch # watch mode
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

### Running the full stack locally

```bash
# Terminal 1 — ReTouch-server
cd ../ReTouch-server/backend
STORAGE_BACKEND=local flask run -p 5000

# Terminal 2 — Analytics service
cd ../ReTouch-server/analytics
flask run -p 5002

# Terminal 3 — Mobile
cd ../ReTouch-mobile
npm start
```

---

## CI

GitHub Actions runs on every push/PR to `main`:

- **ci.yml** — lint → typecheck → jest → expo export (web dry-run)
- **codeql.yml** — CodeQL `security-extended` on push to `main` + weekly schedule

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:5000` | ReTouch-server base URL |
| `EXPO_PUBLIC_ANALYTICS_BASE_URL` | `http://localhost:5002/analytics` | Analytics service base URL |

All `EXPO_PUBLIC_*` vars are inlined at build time by Expo Metro bundler.

---

## Production build

```bash
# EAS Build (recommended for App Store / Play Store)
npm install -g eas-cli
eas login
eas build --platform all
```

Set `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_ANALYTICS_BASE_URL` to your production URLs in the EAS project environment variables before building.
