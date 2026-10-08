# VIT Bhopal Digital Twin 🏛️✨

> **One VIT Bhopal. One digital experience.**  
> A next-generation smart campus digital twin platform combining interactive GIS maps, indoor cabin navigation, live verified events, faculty directories, real-time broadcasts, multi-role workflows, Supabase backend infrastructure, and Google OAuth integration.

🌐 **Live Application:** [https://vitcampus-kappa.vercel.app](https://vitcampus-kappa.vercel.app)  
📦 **Repository:** [https://github.com/goludheerajm31-arch/VIT-BHOPAL-TWIN](https://github.com/goludheerajm31-arch/VIT-BHOPAL-TWIN)

[![Live Demo](https://img.shields.io/badge/Vercel-vitcampus--kappa.vercel.app-000000?style=flat-square&logo=vercel)](https://vitcampus-kappa.vercel.app)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_%26_PostgreSQL_%26_Realtime-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com/)
[![Google Auth](https://img.shields.io/badge/Google-OAuth_2.0-4285f4?style=flat-square&logo=google)](https://cloud.google.com/)

---

## 📖 Table of Contents

- [Live Deployment](#-live-deployment)
- [Overview](#-overview)
- [Authentication & Role-Based Access Control](#-authentication--role-based-access-control)
- [Key Features](#-key-features)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Database & Storage Infrastructure](#-database--storage-infrastructure)
- [Directory Structure](#-directory-structure)
- [Page & Portal Map](#-page--portal-map)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Running the App](#running-the-app)
- [Production Deployment](#-production-deployment)
  - [Vercel Deployment (Edge CDN SPA)](#vercel-deployment-edge-cdn-spa)
  - [Docker / Node.js Container Deployment](#docker--nodejs-container-deployment)
- [Security & Infrastructure Hardening](#-security--infrastructure-hardening)
- [License](#-license)

---

## 🚀 Live Deployment

The production application is live and hosted on Vercel:

👉 **[https://vitcampus-kappa.vercel.app](https://vitcampus-kappa.vercel.app)**

- **Production Security Headers**: Configured with strict Content Security Policy (CSP), Strict-Transport-Security (HSTS), X-Content-Type-Options, Referrer-Policy, and X-Frame-Options.
- **Client-Side SPA Routing**: Pre-configured with `vercel.json` rewrites so direct navigation, deep links, and browser refreshes (`/dashboard`, `/faculty/dashboard`, `/publisher`, `/admin`, `/events`, etc.) resolve seamlessly without 404 errors.
- **Realtime WebSocket Synchronization**: Powered by Supabase Realtime across `campus_public_stream` and authenticated private channels.

---

## 🌟 Overview

The **VIT Bhopal Digital Twin** bridges physical campus infrastructure with a real-time digital layer. Designed for students, faculty, club organizers, campus visitors, and university administrators, it eliminates campus navigation hurdles and streamlines verified information:

- **Locating Faculty Cabins & Classrooms**: Instant search by faculty name, school, designation, or cabin code with floor-by-floor indoor routing instructions.
- **Interactive Campus GIS**: Explore Academic Blocks (AB-1, AB-2, LC), Boy's & Girl's Hostels, Food Courts, Sports Arenas, ATM & Medical Centers with turn-by-turn walking directions.
- **Live Verified Campus Events**: Club hackathons, cultural festivals, technical workshops, and guest lectures with poster uploads and RSVP tracking.
- **Faculty Portal**: Cabin consultation hours, timetable status, course management, and direct student inquiries.
- **Verified Publisher Hub**: Official channels for authorized student chapters and clubs to broadcast notices and publish events.
- **Administrative Control Center**: Moderation queues, publisher approvals, faculty onboarding verification, and audit logs.
- **Campus AI Concierge**: Powered by Google Gemini (`@google/genai`), answering queries on landmarks, office locations, and campus life.

---

## 🔑 Authentication & Role-Based Access Control

The platform features an authoritative, multi-tier authentication system powered by **Supabase Auth** with full **Google OAuth 2.0** support and database-enforced **Row-Level Security (RLS)**:

### 1. Evaluator / Multi-Role Administrator Account
For evaluation and testing across all five application roles:
- **Email**: `admin@vitbhopal.ac.in`
- **Password**: `admin9211`
- **Assigned Database Roles**: `ADMIN`, `FACULTY`, `PUBLISHER`, `STUDENT`
- **Special Capability**: Can access the Administrative Control Center (`/admin`) and toggle between all views via the UI role switcher to test each user experience.

### 2. Google OAuth 2.0 (Continue with Google)
- One-click authentication with Google.
- Automatically claims institutional profiles or grants default student privileges upon sign-in.

### 3. Institutional Email / Password Registration
- Students and faculty can register directly with their institutional email address (`@vitbhopal.ac.in`).

---

## ✨ Key Features

### 🗺️ Interactive Campus Map & Outdoor Pathfinding
- Leaflet-powered GIS map with high-contrast cartography customized for VIT Bhopal campus grounds.
- Categorized points of interest: Academic Blocks (AB-1, AB-2, LC), Boy's & Girl's Hostels, Food Courts, Sports Arenas, ATM & Medical Centers.
- Turn-by-turn walking route visualizer between campus landmarks.

### 🏢 Faculty Cabin Directory & Indoor Locator
- Search faculty members across schools: SCSE, SASL, SEEE, SCHEME, and Management.
- Detailed cabin profiles with floor location, elevator/staircase entry points, office hours, and consultation availability.
- Interactive indoor map visualization for complex academic floorplans.

### 📅 Live Events, RSVPs & Automatic Expiration
- Curated calendar of verified hackathons, workshops, technical webinars, and cultural events.
- RSVP tracking, calendar integration, and saved event bookmarks.
- Automatic event expiration worker that detects elapsed dates and archives past events.

### 🖼️ Supabase Storage File Pipeline
- Dedicated public storage buckets for **event posters** (`event-posters`) and **campus guides** (`campus-guides`).
- Validates file size (max 5MB for posters, 15MB for guides), strict MIME types (JPEG, PNG, WebP, PDF), and sanitizes object paths.
- Uploads and deletions are protected by storage RLS policies (`is_admin() OR is_publisher()`).

### ⚡ Live Supabase Realtime Streams
- Zero browser reloads required: updates broadcast instantly via WebSockets (`wss://`).
- `campus_public_stream`: Synchronizes `events`, `announcements`, `campus_guides`, `faculty`, `locations`, and `publishers`.
- Private user channel: Synchronizes user-scoped bookmarks (`saved_items`).

---

## 🛠️ Architecture & Tech Stack

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Client (Vite React SPA)                         │
│   React 19 • TypeScript 5.8 • Tailwind CSS v4 • React Router v7        │
│   Leaflet GIS Maps • Motion UI • Lucide Icons • Context State Engine   │
└──────────────────┬─────────────────┬─────────────────┬─────────────────┘
                   │ HTTPS           │ PostgREST + RLS │ WebSockets
┌──────────────────▼──────┐   ┌──────▼──────┐   ┌──────▼────────┐
│   Supabase Auth (JWT)   │   │ PostgreSQL  │   │ Realtime      │
│   Email/Password +      │   │ RLS Tables  │   │ Channels      │
│   Google OAuth 2.0      │   │ & Triggers  │   │ (Live Events) │
└─────────────────────────┘   └─────────────┘   └───────────────┘
```

- **Frontend**: [React 19](https://react.dev/), [TypeScript 5.8](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/), [Vite 6](https://vitejs.dev/), [React Router v7](https://reactrouter.com/), [Leaflet](https://leafletjs.com/), [Motion](https://motion.dev/)
- **Authoritative Backend**: [Supabase](https://supabase.com/)
  - **Auth**: GoTrue JWT authentication with session persistence
  - **Database**: PostgreSQL with Row-Level Security (RLS)
  - **Storage**: S3-compatible asset buckets (`event-posters`, `campus-guides`)
  - **Realtime**: Elixir-backed WebSocket multiplexer
- **Server Runner**: [Express 4](https://expressjs.com/) (`server.ts` bundled with `esbuild` for Node/Docker hosting)
- **Deployment**: [Vercel Edge CDN](https://vercel.com/)

---

## 💾 Database & Storage Infrastructure

All database migrations and policies are documented under `/supabase`:

| File | Description |
| :--- | :--- |
| [`supabase/schema.sql`](./supabase/schema.sql) | Canonical DDL for tables, constraints, indexes, RLS policies, helper functions (`is_admin()`, `is_publisher()`, `is_faculty()`), and publications. |
| [`supabase/storage_policies.sql`](./supabase/storage_policies.sql) | Bucket definitions (`event-posters`, `campus-guides`) and storage RLS policies. |
| [`supabase/seed.sql`](./supabase/seed.sql) | Initial dataset for campus locations, faculty directory, clubs, and sample events. |

---

## 📂 Directory Structure

```text
├── index.html                   # HTML entry point with metadata & SEO
├── package.json                 # Dependencies and build scripts
├── server.ts                    # Hardened Express server for Node/Docker environments
├── tsconfig.json                # TypeScript project configuration
├── vite.config.ts               # Vite configuration (Tailwind v4 integration)
├── vercel.json                  # Vercel security headers & SPA rewrite rules
├── .env.example                 # Environment variable templates
│
├── supabase/                    # Canonical database migrations & policies
│   ├── schema.sql               # PostgreSQL tables, functions, & RLS policies
│   ├── storage_policies.sql     # Supabase Storage bucket policies
│   └── seed.sql                 # Campus initial seed data
│
├── src/                         # Frontend application source
│   ├── App.tsx                  # React Router definitions & providers
│   ├── main.tsx                 # Application entry point
│   ├── index.css                # Global styles & Tailwind v4
│   ├── types/                   # TypeScript interfaces (User, Event, Location, etc.)
│   ├── lib/
│   │   ├── supabase.ts          # Singleton Supabase client, storage helpers & validation
│   │   ├── dateUtils.ts         # Asia/Kolkata (IST) timezone formatting helpers
│   │   └── facultyAuthUtils.ts  # Faculty profile resolution helpers
│   ├── components/              # Modular UI components
│   │   ├── common/              # Modals, verified badges, confirm dialogs
│   │   ├── layout/              # Navbar, Footer, MobileNav, Toast system
│   │   ├── map/                 # Interactive campus Leaflet map & POI markers
│   │   ├── events/              # Event cards, poster uploaders, filter sheets
│   │   ├── faculty/             # Cabin cards, faculty directory modals
│   │   ├── announcements/       # Notice cards & announcement modals
│   │   ├── guides/              # Campus guides & document viewer modals
│   │   └── navigation/          # Indoor cabin visualizer & route directions
│   ├── pages/                   # Application views & role portals
│   │   ├── LandingPage.tsx      # Campus hero section & shortcuts
│   │   ├── ExplorePage.tsx      # Map discovery & category filters
│   │   ├── NavigationPage.tsx   # Campus pathfinding & routing
│   │   ├── FacultyDirectoryPage.tsx # Cabin directory & floor plans
│   │   ├── FacultyDashboard.tsx # Faculty portal & schedule manager
│   │   ├── EventsPage.tsx       # Live events calendar & filters
│   │   ├── EventDetailPage.tsx  # Detailed event view with RSVP
│   │   ├── AnnouncementsPage.tsx# Official bulletins & urgent notices
│   │   ├── CampusHubPage.tsx    # Campus guide & knowledge base
│   │   ├── StudentDashboard.tsx # Student bookmarks, RSVPs, profile
│   │   ├── PublisherDashboard.tsx# Club publisher event management
│   │   ├── PublisherCreateEventPage.tsx # Event drafting & poster upload
│   │   ├── AdminDashboard.tsx   # Administrative control & metrics
│   │   ├── AdminVerificationPage.tsx # Publisher & faculty moderation
│   │   ├── LoginPage.tsx        # Multi-role login entry & Google OAuth button
│   │   ├── ResetPasswordPage.tsx# Password reset flow
│   │   └── NotFoundPage.tsx     # 404 handler
│   └── services/                # Application state & backend communication
│       ├── auth.tsx             # Supabase & Google OAuth authentication context
│       ├── demoRoleSwitcher.tsx # Multi-role switcher for presentation testing
│       ├── realtime.ts          # Resilient Supabase Realtime WebSocket manager
│       ├── storage.ts           # Authoritative state manager & local cache
│       └── data/seeds.ts        # Initial campus seed dataset
│
└── public/                      # Static assets, map markers, and icons
```

---

## 🗺️ Page & Portal Map

| Path | Name | Description |
|---|---|---|
| `/` | **Landing Page** | Campus hero, quick navigation shortcuts, live highlights |
| `/explore` | **Campus Explorer** | Interactive Leaflet GIS map with landmark discovery |
| `/navigation` | **Wayfinder** | Outdoor turn-by-turn routing between campus points |
| `/faculty` | **Faculty Directory** | Searchable directory with cabin numbers and floor plans |
| `/faculty/dashboard` | **Faculty Portal** | Dedicated faculty dashboard for schedule & inquiries |
| `/events` | **Events Calendar** | Filterable list of campus workshops, fests, and hackathons |
| `/events/:id` | **Event Details** | Comprehensive event information and RSVP booking |
| `/announcements` | **Notices** | Official university broadcasts with urgency badges |
| `/hub` | **Campus Hub** | Practical guides: hostels, mess menus, medical, transit |
| `/dashboard` | **Student Dashboard** | Personalized student center with saved items & RSVPs |
| `/publisher` | **Publisher Hub** | Event publishing center for authorized student chapters |
| `/publisher/events/create` | **Create Event** | Form with image upload validation & schedule selector |
| `/admin` | **Admin Dashboard** | High-level campus metrics, audit logs, and controls |
| `/admin/verification` | **Verification Queue** | Moderation for new publisher & faculty applications |
| `/login` | **Authentication** | Unified login with email/password and Google OAuth |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version `20.x` or higher
- **npm** (or `pnpm` / `bun` / `yarn`)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/goludheerajm31-arch/VIT-BHOPAL-TWIN.git
   cd VIT-BHOPAL-TWIN
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

### Environment Configuration

Create a local `.env.local` file:

```env
# Supabase Configuration
VITE_SUPABASE_URL="https://cqhgnvxuvsqxrvdgmkpk.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-publishable-key"

# Optional: Demo Mode Role Switcher (true by default)
VITE_DEMO_MODE=true

# Server-side background worker secret (only needed for server.ts)
# SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### Running the App

Start the development server:

```bash
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

To verify code quality and build for production:

```bash
# Typecheck codebase
npm run lint

# Build production assets
npm run build

# Start production server (Node.js)
npm run start
```

---

## 🌐 Production Deployment

### Vercel Deployment (Edge CDN SPA)

1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Set Build Command to `npm run build`.
3. Set Output Directory to `dist`.
4. Add the required Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_DEMO_MODE=true`
5. In **Supabase Dashboard** $\rightarrow$ **Authentication** $\rightarrow$ **URL Configuration**:
   - Set **Site URL** to your Vercel URL (e.g., `https://vitcampus-kappa.vercel.app`).
   - Add `https://vitcampus-kappa.vercel.app/**` to **Redirect URLs**.

### Docker / Node.js Container Deployment

The backend compiles to a standalone Node CommonJS bundle at `dist/server.cjs` via `esbuild`. The server listens on `0.0.0.0:3000` (or `process.env.PORT`) and serves both the static production SPA and health endpoints (`/health`).

---

## 🔒 Security & Infrastructure Hardening

1. **Zero Secret Leaks**: The Supabase service role key is strictly absent from all client bundles and git commits.
2. **PostgreSQL Row-Level Security (RLS)**: Access control is enforced authoritatively inside the database via `auth.uid()`, preventing any frontend role manipulation.
3. **Hardened Security Headers**: Enforces strict CSP, HSTS (`max-age=31536000`), `X-Frame-Options: SAMEORIGIN`, and `X-Content-Type-Options: nosniff`.
4. **File Upload Hardening**: Dual-layer MIME and size validation on posters (5MB max) and documents (15MB max) with sanitized S3 object keys.
5. **Fail-Closed Worker**: Privileged background workers strictly fail closed if the required credentials are not supplied.

---

## 📄 License

This project is licensed under the MIT License. Developed for the VIT Bhopal University community.
