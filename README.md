# VIT Bhopal Digital Twin 🏛️✨

> **One VIT Bhopal. One digital experience.**  
> A next-generation smart campus digital twin platform combining interactive GIS maps, indoor cabin navigation, live verified events, faculty directories, real-time broadcasts, role-based workflows, and Gemini AI assistance.

🌐 **Live Application:** [https://vitbhopalcampus.vercel.app](https://vitbhopalcampus.vercel.app)

[![Live Demo](https://img.shields.io/badge/Demo-vitbhopalcampus.vercel.app-000000?style=flat-square&logo=vercel)](https://vitbhopalcampus.vercel.app)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%26_Auth-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com/)
[![Gemini](https://img.shields.io/badge/Gemini_API-2.4-4285f4?style=flat-square&logo=google)](https://ai.google.dev/)

---

## 📖 Table of Contents

- [Live Demo](#-live-demo)
- [Overview](#-overview)
- [Key Features](#-key-features)
- [Permanent Demo & Master Accounts](#-permanent-demo--master-accounts)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Directory Structure](#-directory-structure)
- [Page & Portal Map](#-page--portal-map)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Running the App](#running-the-app)
- [Deployment](#-deployment)
  - [Vercel Deployment (SPA Routing)](#vercel-deployment-spa-routing)
  - [Full-Stack Node / Container Deployment](#full-stack-node--container-deployment)
- [API Overview](#-api-overview)
- [Security & Authorization Model](#-security--authorization-model)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Live Demo

The production application is deployed live on Vercel:

👉 **[https://vitbhopalcampus.vercel.app](https://vitbhopalcampus.vercel.app)**

- **SPA Routing Enabled**: Pre-configured with `vercel.json` rewrites so direct navigation, deep links, and browser refreshes (`/dashboard`, `/faculty/dashboard`, `/publisher`, `/admin`, `/events`, etc.) resolve seamlessly without 404 errors.
- **Interactive Campus Explorer**: High-accuracy GIS mapping with pathfinding and point-of-interest categorization.
- **Indoor Cabin Locator**: Floor-by-floor navigation guide for academic blocks and faculty spaces.
- **Multi-Role Workflows**: Complete portals for Students, Faculty, Publishers, Administrators, and Guests.

---

## 🌟 Overview

The **VIT Bhopal Digital Twin** bridges physical campus infrastructure with a real-time digital layer. Designed for students, faculty, club organizers, campus visitors, and university administrators, it eliminates campus navigation hurdles and streamlines verified information:

- **Locating Faculty Cabins & Classrooms**: Instant search by faculty name, school, designation, or cabin code with floor-by-floor routing instructions.
- **Interactive Campus GIS**: Explore Academic Blocks, Hostels, Food Courts, Sports Complexes, Health Centers, and ATMs with walking path directions.
- **Live Verified Campus Events**: Club hackathons, cultural festivals, technical workshops, and guest lectures with RSVP tracking and automated expiration cleanup.
- **Faculty Portal**: Cabin consultation hours, timetable status, course management, and direct student inquiries.
- **Verified Publisher Hub**: Official channels for authorized student chapters and clubs to broadcast notices and publish events.
- **Administrative Control Center**: Moderation queues, publisher approvals, faculty onboarding verification, and audit trail logs.
- **Campus AI Concierge**: Powered by Google Gemini (`@google/genai`), answering queries on landmarks, office locations, and campus life.

---

## 🔑 Permanent Demo & Master Accounts

The platform includes four fixed, backend-authenticated server accounts designed for evaluation and testing across all five roles. These accounts are intentionally managed external to Supabase Auth, requiring zero registration or external dependencies:

| Account | Email | Password | Allowed Roles | Default Access Portal |
|---|---|---|---|---|
| **Master Admin** 👑 | `admin@vitbhopal.ac.in` | `admin9211` | `STUDENT`, `FACULTY`, `PUBLISHER`, `ADMIN`, `GUEST` | Full Admin Console (`/admin`) + Universal 5-Role Switcher |
| **Demo Faculty** 👨‍🏫 | `faculty.demo@vitbhopal.ac.in` | `faculty9211` | `FACULTY` | Faculty Portal (`/faculty/dashboard`) |
| **Demo Student** 🎓 | `student.demo@vitbhopal.ac.in` | `student9211` | `STUDENT` | Student Dashboard (`/dashboard`) |
| **Demo Publisher** 📢 | `publisher.demo@vitbhopal.ac.in` | `publisher9211` | `PUBLISHER` | Publisher Hub (`/publisher`) |

### Key Capabilities of Fixed Accounts:
1. **Server-Enforced Authorization**: Credential verification is performed server-side with constant-time HMAC-SHA256 (`crypto.timingSafeEqual`) and signed cryptographic tokens.
2. **Master Role Switching**: The Master Admin account can seamlessly toggle between Student, Faculty, Publisher, Admin, and Guest views via the UI role switcher, with backend-validated token reissue (`/api/auth/demo-switch-role`).
3. **Role Boundary Enforcement**: Demo accounts attempting to enter unauthorized roles (e.g., student entering `/admin`) are strictly rejected by the server (HTTP 403 Forbidden).
4. **Production & Dev Ready**: Operates identically in local development, containerized environments, and cloud deployments.

*(Standard users can also sign in or register with their own credentials via the Supabase Auth Email/Password or Google OAuth flow).*

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

### 📅 Live Events, RSVPs & Automatic Expiration Engine
- Curated calendar of verified hackathons, workshops, technical webinars, and cultural events.
- RSVP tracking, calendar integration, and saved event bookmarks.
- **Server-Side Event Cleanup Engine**: Periodic background scheduler (`/api/events/cleanup`) that detects expired events, marks them accordingly, and purges obsolete poster storage assets.

### 🖼️ Secure Poster Upload Pipeline
- Server-side image validator (`/api/events/upload-poster`) enforcing strict binary magic byte inspection (rejecting disguised executables), MIME validation (JPEG, PNG, WebP), and a 5MB size limit before pushing to Supabase Storage.

### 📢 Campus Hub & Verified Announcements
- Official university bulletins and club announcements categorized by urgency (Critical, General, Academic).
- Verified badge verification ensuring official authenticity and anti-misinformation protection.

### 🤖 Gemini AI Campus Concierge
- Integrated Google Gemini 2.5 Flash model answering natural language queries about buildings, faculty schedules, and student FAQs.

---

## 🛠️ Architecture & Tech Stack

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Client (SPA Frontend)                           │
│   React 19 • TypeScript 5.8 • Tailwind CSS v4 • React Router v7        │
│   Leaflet GIS Maps • Motion UI • Lucide Icons • Context State Engine   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST / Realtime
┌───────────────────────────────────▼────────────────────────────────────┐
│                        Express Backend Server                          │
│        Node.js • tsx • esbuild • Cryptographic Auth Engine             │
│        Event Expiration Engine • Binary Poster Validation Pipeline     │
└─────────────────┬──────────────────────────────────────┬───────────────┘
                  │ SQL / Auth / Realtime                │ AI Inferences
┌─────────────────▼─────────────────┐   ┌────────────────▼───────────────┐
│       Supabase PostgreSQL         │   │       Google Gemini API        │
│  Profiles, Events, Locations,     │   │     (@google/genai SDK)        │
│  Announcements, Storage Buckets   │   │  Natural Language AI Assistant │
└───────────────────────────────────┘   └────────────────────────────────┘
```

- **Frontend**: [React 19](https://react.dev/), [TypeScript 5.8](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/), [Vite 6](https://vitejs.dev/), [React Router v7](https://reactrouter.com/), [Leaflet](https://leafletjs.com/), [Motion](https://motion.dev/)
- **Backend**: [Express 4](https://expressjs.com/), [Node.js](https://nodejs.org/), [tsx](https://github.com/privatenumber/tsx), [esbuild](https://esbuild.github.io/)
- **Database & Services**: [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth, Supabase Storage, Supabase Realtime)
- **AI Engine**: [@google/genai](https://www.npmjs.com/package/@google/genai) (Gemini 2.5 Flash)
- **Bundler & Tooling**: Vite 6 + esbuild CJS server bundle (`dist/server.cjs`)

---

## 📂 Directory Structure

```text
├── index.html                   # HTML entry point with metadata & SEO
├── package.json                 # Dependencies and build scripts
├── server.ts                    # Express API server, demo auth & background workers
├── tsconfig.json                # TypeScript project configuration
├── vite.config.ts               # Vite configuration (Tailwind v4 integration)
├── vercel.json                  # Vercel SPA routing & rewrites configuration
├── metadata.json                # Project capabilities & permissions manifest
├── .env.example                 # Environment variable templates
│
├── src/                         # Frontend application source
│   ├── App.tsx                  # React Router definitions & top-level providers
│   ├── main.tsx                 # Application entry point
│   ├── index.css                # Global CSS & Tailwind imports
│   ├── types/                   # Shared TypeScript models (User, Event, Location, etc.)
│   ├── components/              # Modular UI components
│   │   ├── common/              # Buttons, inputs, modals, search, badges
│   │   ├── layout/              # Navbar, Footer, MobileNav, Toast notification
│   │   ├── map/                 # Interactive campus Leaflet map & POI markers
│   │   └── navigation/          # Indoor cabin visualizer & route directions
│   ├── pages/                   # Application views & role portals
│   │   ├── LandingPage.tsx      # Campus hero section & highlights
│   │   ├── ExplorePage.tsx      # Map discovery & category filters
│   │   ├── NavigationPage.tsx   # Campus pathfinding & routing
│   │   ├── FacultyDirectoryPage.tsx # Cabin directory & indoor floor guides
│   │   ├── FacultyDashboard.tsx # Faculty portal & timetable management
│   │   ├── EventsPage.tsx       # Live events calendar & filters
│   │   ├── EventDetailPage.tsx  # Detailed event view with RSVP
│   │   ├── AnnouncementsPage.tsx# Official bulletins & urgent notices
│   │   ├── CampusHubPage.tsx    # Campus guide & knowledge base
│   │   ├── StudentDashboard.tsx # Student bookmarks, RSVPs, profile
│   │   ├── PublisherDashboard.tsx# Club publisher event management
│   │   ├── PublisherCreateEventPage.tsx # Event drafting & poster upload
│   │   ├── AdminDashboard.tsx   # Administrative control & metrics
│   │   ├── AdminVerificationPage.tsx # Publisher & faculty moderation
│   │   ├── LoginPage.tsx        # Multi-role login entry & auth form
│   │   ├── ResetPasswordPage.tsx# Password reset flow
│   │   └── NotFoundPage.tsx     # 404 handler
│   └── services/                # Application state & backend communication
│       ├── api.ts               # REST API fetch client
│       ├── auth.tsx             # Supabase & demo authentication context
│       ├── demoRoleSwitcher.tsx # Demo account role switching provider
│       ├── storage.ts           # Hybrid Supabase / fallback storage layer
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
| `/login` | **Authentication** | Unified login with role selection and demo credentials |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version `20.x` or higher
- **npm** (or `pnpm` / `bun` / `yarn`)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/vit-bhopal-digital-twin.git
   cd vit-bhopal-digital-twin
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

### Environment Configuration

Create a local `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Configure your environment variables:

```env
# Google Gemini API key for campus assistant queries (optional for basic browsing)
GEMINI_API_KEY="your-gemini-api-key"

# Supabase Credentials (optional for local demo mode; enables full PostgreSQL storage)
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Demo Mode Enabled
VITE_DEMO_MODE=true
```

### Running the App

Start the full-stack development server (Express backend + Vite client):

```bash
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

To verify code quality and build for production:

```bash
# Typecheck codebase
npm run lint

# Build client assets and bundle backend server
npm run build

# Start production server
npm run start
```

---

## 🌐 Deployment

### Vercel Deployment (SPA Routing)

The application includes `vercel.json` for client-side routing rewrites:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

1. Import the repository into [Vercel](https://vercel.com).
2. Set Build Command to `npm run build` or `vite build`.
3. Set Output Directory to `dist`.
4. Add environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`).

### Full-Stack Node / Container Deployment

The backend compiles to a standalone Node CommonJS bundle at `dist/server.cjs` via `esbuild`. The server listens on port `3000` (or `process.env.PORT`) and serves both the Express API and production Vite assets.

---

## 📡 API Overview

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/health` | Service health, architecture, and timestamp | No |
| `POST` | `/api/auth/demo-login` | Authenticate fixed demo or master account | No |
| `GET` | `/api/auth/demo-session` | Validate cryptographic demo session token | Bearer Token |
| `POST` | `/api/auth/demo-switch-role` | Switch demo active role with server validation | Bearer Token |
| `POST` | `/api/auth/demo-logout` | Invalidate demo session | Bearer Token |
| `POST` | `/api/events/upload-poster` | Binary magic number & MIME validation for posters | Yes (5MB max) |
| `GET` | `/api/events/cleanup-status` | View last event expiration cleanup statistics | No |
| `POST` | `/api/events/cleanup` | Trigger authoritative event expiration run | Admin / Worker |

---

## 🔒 Security & Authorization Model

1. **Constant-Time Verification**: Server-side demo authentication compares HMAC-SHA256 hashes using `crypto.timingSafeEqual` to eliminate timing attacks.
2. **Strict Server-Side RBAC**: Role selection on the login page is treated merely as an entry request. The backend strictly validates whether the identity holds permission for that role before granting a session token.
3. **Binary Content Inspection**: Image uploads inspect actual file magic bytes (`0xFF 0xD8 0xFF` for JPEG, `0x89 0x50 0x4E 0x47` for PNG, `RIFF...WEBP` for WebP) to prevent disguised executable uploads.
4. **No Plaintext Credential Exposure**: Passwords are never sent in API responses or stored in frontend client storage.

---

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/indoor-floorplan-3d`).
3. Commit your changes (`git commit -m 'feat: add enhanced floorplan view'`).
4. Push to the branch (`git push origin feature/indoor-floorplan-3d`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the MIT License. Developed for the VIT Bhopal University community.

