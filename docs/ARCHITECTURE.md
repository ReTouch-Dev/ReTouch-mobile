# ReTouch Mobile — Architecture

## System Context

ReTouch Mobile is a standalone React Native / Expo app. It communicates with two backend services over HTTP but has zero code imports from the server repositories.

```mermaid
C4Context
  title System Context — ReTouch

  Person(user, "User", "Scans receipts, tracks spend")

  System(mobile, "ReTouch Mobile", "Expo 52 · React Native 0.76")

  System_Ext(api, "ReTouch API", "Flask · port 5000\nAuth, receipts, OCR")
  System_Ext(analytics, "Analytics Service", "Flask · port 5002\nSpend analytics, AI insights")

  Rel(user, mobile, "Uses")
  Rel(mobile, api, "REST/JWT", "EXPO_PUBLIC_API_BASE_URL")
  Rel(mobile, analytics, "REST/JWT", "EXPO_PUBLIC_ANALYTICS_BASE_URL")
```

> **Standalone guarantee**: The mobile app contains no `import` or file-path references to the server repositories. All integration is via HTTP calls to configurable base URLs.

---

## App Architecture

The app follows a strict layered architecture. Each layer only imports from layers below it.

```mermaid
graph TD
  subgraph "Presentation layer"
    Screens["app/\nExpo Router screens"]
    UIKit["src/components/ui/\nButton · Input · Card · Avatar · Badge · EmptyState · Skeleton"]
    Logo["src/components/Logo"]
  end

  subgraph "State layer"
    TQ["TanStack Query v5\nServer state cache"]
    Zustand["Zustand\nAuth state only"]
  end

  subgraph "API layer  (adapters)"
    AuthAPI["src/api/auth.ts"]
    ReceiptsAPI["src/api/receipts.ts"]
    AnalyticsAPI["src/api/analytics.ts"]
    Client["src/api/client.ts\nHTTP client · JWT injection"]
  end

  subgraph "Domain / support"
    Types["src/types/index.ts\nSingle-source-of-truth interfaces"]
    Utils["src/utils/format.ts\nPure formatters"]
    Store["src/store/authStore.ts"]
    Session["src/lib/sessionStorage.ts\nSecureStore / localStorage"]
    Demo["src/lib/demo.ts\nDEMO_MODE flag"]
    Fixtures["src/constants/fixtures.ts\nOffline demo data"]
    Theme["src/theme/tokens.ts\nDesign system"]
  end

  Screens --> UIKit
  Screens --> TQ
  Screens --> Zustand
  TQ --> AuthAPI
  TQ --> ReceiptsAPI
  TQ --> AnalyticsAPI
  Zustand --> Store
  Store --> AuthAPI
  Store --> Session
  AuthAPI --> Client
  ReceiptsAPI --> Client
  AnalyticsAPI --> Session
  AuthAPI --> Demo
  ReceiptsAPI --> Demo
  AnalyticsAPI --> Demo
  Demo --> Fixtures
  Fixtures --> Types
  AuthAPI --> Types
  ReceiptsAPI --> Types
  AnalyticsAPI --> Types
```

---

## Directory Structure

```
ReTouch-mobile/
├── app/                        # Expo Router — file-based routes
│   ├── _layout.tsx             # Root layout: QueryClient, auth guard, safe area
│   ├── auth/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx         # Tab bar configuration
│   │   ├── receipts.tsx        # Receipt list with skeleton loading
│   │   ├── capture.tsx         # Camera / gallery upload
│   │   ├── analytics.tsx       # Spend analytics
│   │   └── profile.tsx         # User profile + sign-out
│   └── receipt/[id].tsx        # Receipt detail (dynamic route)
│
├── src/
│   ├── types/index.ts          # All shared TypeScript interfaces
│   ├── api/
│   │   ├── client.ts           # Base HTTP client
│   │   ├── auth.ts             # Auth endpoints
│   │   ├── receipts.ts         # Receipt endpoints
│   │   └── analytics.ts        # Analytics endpoints
│   ├── store/
│   │   └── authStore.ts        # Zustand: auth state
│   ├── components/
│   │   ├── ui/                 # Atomic reusable components
│   │   │   ├── Avatar.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── index.ts
│   │   └── Logo.tsx
│   ├── constants/
│   │   └── fixtures.ts         # Demo data (20 HK receipts + analytics)
│   ├── hooks/                  # (reserved for future domain hooks)
│   ├── lib/
│   │   ├── demo.ts             # DEMO_MODE env flag
│   │   └── sessionStorage.ts   # Platform-aware token storage
│   ├── theme/
│   │   └── tokens.ts           # Colors, spacing, radius, shadows, fonts
│   ├── utils/
│   │   └── format.ts           # Pure formatters (currency, date, time)
│   └── __tests__/              # Jest unit + integration tests
│
├── docs/                       # Architecture documentation
│   └── ARCHITECTURE.md
├── .env.example                # Environment variable reference
└── README.md
```

---

## Authentication Flow

```mermaid
sequenceDiagram
  participant App as App (_layout.tsx)
  participant Store as authStore (Zustand)
  participant Session as SecureStore
  participant API as Auth API

  App->>Store: hydrate()
  Store->>Session: getItem("access_token")
  alt token exists
    Store->>API: GET /api/auth/me
    API-->>Store: User object
    Store-->>App: isAuthenticated = true
  else no token
    Store-->>App: isAuthenticated = false → Redirect /auth/login
  end

  note over App: User submits login form
  App->>Store: login(email, password)
  Store->>API: POST /api/auth/login
  API-->>Store: { access_token, refresh_token, user }
  Store->>Session: setItem("access_token")
  Store->>Session: setItem("refresh_token")
  Store-->>App: isAuthenticated = true → Redirect /(tabs)/receipts
```

---

## Receipt Upload Flow

```mermaid
sequenceDiagram
  participant User
  participant Capture as CaptureScreen
  participant API as Receipts API
  participant Server as ReTouch API

  User->>Capture: pick image (camera / gallery)
  Capture->>User: preview image
  User->>Capture: press "Upload receipt"
  Capture->>API: receiptsApi.upload(uri, mimeType)
  API->>Server: POST /api/mobile/receipts (FormData)
  Server-->>API: { receipt_id, upload_status: "pending" }
  API-->>Capture: UploadResponse
  Capture->>Capture: invalidate "receipts" query
  Capture->>User: success state (800ms)
  Capture->>User: navigate to /receipt/{id}
  note over User: OCR runs server-side; screen polls every 5s
```

---

## Demo Mode

Set `EXPO_PUBLIC_DEMO_MODE=true` in your `.env` to run the app fully offline. All API modules check the `DEMO_MODE` flag and return computed data from `src/constants/fixtures.ts` instead of making network requests.

```mermaid
flowchart LR
  Screen --> Query["TanStack Query"]
  Query --> API["API module"]
  API -->|"DEMO_MODE=false"| Network["HTTP → Backend"]
  API -->|"DEMO_MODE=true"| Fixtures["src/constants/fixtures.ts\n20 HK receipts · computed analytics"]
```

The demo user is `iamsaleh.furqan@gmail.com`. Any password is accepted in demo mode.

---

## Design System

All design tokens live in `src/theme/tokens.ts`:

| Token group | Purpose |
|-------------|---------|
| `colors`    | Brand (cyan `#1BC5E3`), backgrounds, text hierarchy, semantic states |
| `spacing`   | 8-point scale: `xs/sm/md/lg/xl/2xl/3xl/4xl` |
| `radius`    | `sm/md/lg/xl/2xl/full` |
| `shadow`    | `sm/md/glow` (with cyan glow for primary CTAs) |
| `fonts`     | Space Grotesk (headings), Manrope (body), IBM Plex Mono (numbers) |

---

## Testing Strategy

| Layer | Tool | What it tests |
|-------|------|---------------|
| Auth store | Jest + `@testing-library/react-native` | Hydration, login, register, logout, token refresh |
| Auth screens | RNTL + mocked authStore | Form validation, API errors, navigation |
| Receipt screens | RNTL + mocked receiptsApi | List rendering, search, pagination, error states |
| Analytics screen | RNTL + mocked analyticsApi | Summary cards, merchants, categories, insights |
| Capture screen | RNTL + mocked ImagePicker | Picker, upload states, retry |
| Profile screen | RNTL + mocked authStore | Avatar, sign-out confirmation dialog |
| Receipt detail | RNTL + mocked receiptsApi | Merchant info, line items, OCR confidence, polling |

Run: `npm test` (62 tests, ~5 s)
