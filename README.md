# ReTouch Mobile

Consumer receipt wallet — photograph receipts, get structured OCR data, track spending analytics.

Built with **Expo 52 + Expo Router v4** (React Native 0.76). Standalone app with no code imports from the server repositories.

> **Full architecture docs:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Quick Start

```bash
cp .env.example .env          # copy env template
# edit .env if needed (see Environment Variables below)
npm install
npm start                      # Expo Dev Tools — press i / a / w
```

### Demo mode (no backend required)

Set `EXPO_PUBLIC_DEMO_MODE=true` in `.env` to run the app fully offline with 20 realistic Hong Kong receipts and computed analytics. Any credentials are accepted.

```bash
EXPO_PUBLIC_DEMO_MODE=true npm start
```

---

## Project Structure

```
ReTouch-mobile/
├── app/                    # Expo Router — file-based routes
│   ├── _layout.tsx         # Root: QueryClient, auth guard (<Redirect>), safe area
│   ├── auth/               # Login + register screens
│   ├── (tabs)/             # Tab navigation (Receipts, Scan, Analytics, Profile)
│   └── receipt/[id].tsx    # Dynamic receipt detail
│
├── src/
│   ├── types/index.ts      # Centralised TypeScript interfaces (single source of truth)
│   ├── api/                # HTTP adapters — check DEMO_MODE, else call server
│   │   ├── client.ts       # JWT-injecting fetch wrapper
│   │   ├── auth.ts
│   │   ├── receipts.ts
│   │   └── analytics.ts
│   ├── store/
│   │   └── authStore.ts    # Zustand: auth-only global state
│   ├── components/
│   │   ├── ui/             # Atomic reusable components (Button, Input, Card, Avatar, Badge, EmptyState, Skeleton)
│   │   └── Logo.tsx
│   ├── constants/
│   │   └── fixtures.ts     # 20 HK demo receipts + computed analytics
│   ├── lib/
│   │   ├── demo.ts         # DEMO_MODE env flag
│   │   └── sessionStorage.ts  # SecureStore (native) / localStorage (web)
│   ├── theme/
│   │   └── tokens.ts       # Colors, spacing, radius, shadows, typography
│   ├── utils/
│   │   └── format.ts       # Pure formatters: currency, date, time, initials
│   └── __tests__/          # 62 Jest unit + integration tests
│
└── docs/
    └── ARCHITECTURE.md     # System diagrams (C4, layers, flows)
```

---

## Key Design Decisions

| Concern | Approach |
|---------|---------|
| **Standalone** | Zero code imports from server repos; HTTP base URLs via env vars |
| **Demo mode** | `EXPO_PUBLIC_DEMO_MODE=true` → all API calls return fixtures, fully offline |
| **Auth guard** | Declarative `<Redirect>` in root `_layout.tsx` (Expo Router v4 best practice) |
| **Server state** | TanStack Query v5 — queries, invalidation, polling for OCR status |
| **Client state** | Zustand v5 — auth only; all server data lives in TQ cache |
| **Forms** | react-hook-form + Zod schema validation |
| **Types** | All shared interfaces in `src/types/index.ts`; API modules re-export for backward compat |
| **Formatting** | Pure functions in `src/utils/format.ts` (HK$, dates, initials) |
| **UI components** | Atomic design: `Button`, `Input`, `Card`, `Avatar`, `Badge`, `EmptyState`, `Skeleton` |
| **Token storage** | `expo-secure-store` (native) / `localStorage` (web), abstracted in `lib/sessionStorage.ts` |

---

## Development Scripts

```bash
npm test              # run all 62 Jest tests
npm run test:watch    # watch mode
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:5000` | Flask API base URL |
| `EXPO_PUBLIC_ANALYTICS_BASE_URL` | `http://localhost:5000/analytics` | Analytics endpoint (same server as main API) |
| `EXPO_PUBLIC_DEMO_MODE` | `false` | Set to `true` for offline demo with fixture data |

All `EXPO_PUBLIC_*` vars are inlined at build time by Metro bundler.

**Physical device testing:** Replace `localhost` with your machine's LAN IP:
```
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:5000
```

---

## Running with the Full Stack

The backend lives in the `server/` directory of this repo — no external `ReTouch-server` needed.

```bash
# Terminal 1 — Backend (auth + receipts + analytics on port 5000)
cd server
python -m venv .venv && source .venv/bin/activate   # first time only
pip install -r requirements.txt                       # first time only
cp .env.example .env                                  # first time only — edit to add GEMINI_API_KEY
python app.py

# Terminal 2 — Mobile app
cp .env.example .env   # first time only (already points to localhost:5000)
npm start
```

> **OCR without a Gemini key:** Uploads still work. The receipt will show `ocr_status: processing`
> indefinitely rather than extracting fields. Analytics and search work once totals are present.

---

## Production Build

```bash
npm install -g eas-cli
eas login
eas build --platform all
```

Configure `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_ANALYTICS_BASE_URL` in EAS project environment variables before building.
