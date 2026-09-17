# VIT Bhopal Digital Twin 🏛️✨

> **One VIT Bhopal. One digital experience.**  
> A next-generation smart campus digital twin platform combining interactive maps, indoor cabin navigation, live verified events, faculty directories, real-time broadcasts, and Gemini AI assistance.

🌐 **Live Application:** [https://vitbhopalcampus.vercel.app](https://vitbhopalcampus.vercel.app)

[![Live Demo](https://img.shields.io/badge/Demo-vitbhopalcampus.vercel.app-000000?style=flat-square&logo=vercel)](https://vitbhopalcampus.vercel.app)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003b57?style=flat-square&logo=sqlite)](https://github.com/WiseLibs/better-sqlite3)
[![Gemini](https://img.shields.io/badge/Gemini_API-2.4-4285f4?style=flat-square&logo=google)](https://ai.google.dev/)

---

## 📖 Table of Contents

- [Live Demo](#-live-demo)
- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Directory Structure](#-directory-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Running the App](#running-the-app)
- [Deployment](#-deployment)
  - [Vercel Deployment (SPA Routing)](#vercel-deployment-spa-routing)
  - [Container / Cloud Run](#container--cloud-run)
- [API Overview](#-api-overview)
- [User Roles & Demo Logins](#-user-roles--demo-logins)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Live Demo

The production application is deployed live on Vercel:

👉 **[https://vitbhopalcampus.vercel.app](https://vitbhopalcampus.vercel.app)**

- **SPA Routing Enabled**: Fully configured with `vercel.json` rewrites so direct navigation, deep links, and page refreshes (`/dashboard`, `/login`, `/events`, `/faculty`, etc.) work without 404 errors.
- **Interactive Campus Explorer**: Interactive GIS map, pathfinding, and points of interest.
- **Indoor Cabin Locator**: Floor-by-floor navigation and faculty directory.
- **Role-Based Workflows**: Student, publisher, and administrator dashboards ready to test using the [demo logins](#-user-roles--demo-logins).

---

## 🌟 Overview

The **VIT Bhopal Digital Twin** bridges physical campus infrastructure with a real-time digital layer. Designed for students, visitors, faculty, club organizers, and campus administrators, it solves everyday campus navigation and communication bottlenecks:

- Locating hard-to-find faculty cabins and classrooms with floor-by-floor indoor route guides.
- Exploring academic blocks, hostels, sports complexes, libraries, and food joints on an interactive GIS map.
- Staying in sync with verified club events, hackathons, guest lectures, and official academic notices.
- Querying campus details in natural language powered by Google's Gemini AI.

---

## ✨ Key Features

### 🗺️ Interactive Campus Map & Outdoor Navigation
- Accurate geolocation mapping powered by Leaflet and OpenStreetMap.
- Categorized points of interest: Academic Blocks, Hostels, Canteens/Food Courts, Sports Arenas, ATM & Medical Centers.
- Pathfinding engine providing turn-by-turn walking directions between campus landmarks.

### 🏢 Faculty Cabin Directory & Indoor Locator
- Search faculty members by name, cabin number, school (SCSE, SASL, SEEE, etc.), or designation.
- Step-by-step indoor routing instructions (entry points, staircases, elevators, and floor pathways).
- Office hours, email contacts, and cabin availability status.

### 📅 Live Events & Campus Happenings
- Curated calendar of workshops, hackathons, cultural festivals, and technical sessions.
- Filter by category, target audience, and event date.
- One-click registration, RSVP status tracking, and bookmarking.

### 📢 Verified Publisher Network & Broadcasts
- Official channels for approved student clubs, technical chapters, and administrative departments.
- Strict verification badges preventing misinformation and spam.
- Real-time urgent alerts and campus notices.

### ⚡ Real-Time Push Engine (Server-Sent Events)
- Built-in SSE (`/api/realtime/events`) pushing instant updates to all connected browser clients.
- Automated client sync for new events, schedule modifications, and critical announcements.

### 🤖 Gemini AI Campus Concierge
- Integrated Google Gemini AI assistant configured to answer campus-specific questions.
- Understands campus terminology, landmark nicknames, and academic calendars.

### 🔐 Role-Based Access Control (RBAC) & Audit Logs
- Three discrete personas: **Student**, **Publisher (Club/Chapter)**, and **Administrator**.
- Session tokens with password salting and hashing.
- Complete audit trails tracking publisher actions and administrative approvals.

---

## 🛠️ Architecture & Tech Stack

```text
┌────────────────────────────────────────────────────────────┐
│                    Client (SPA Frontend)                   │
│   React 19 • TypeScript • Tailwind CSS v4 • React Router   │
│   Leaflet GIS Maps • Motion UI • Lucide Icons             │
└────────────────────────────┬───────────────────────────────┘
                             │ HTTP / SSE / WebSocket
┌────────────────────────────▼───────────────────────────────┐
│                    Express Backend Server                  │
│       Node.js • tsx • esbuild • REST API Controllers       │
│      Server-Sent Events (SSE) Real-Time Hub                │
└───────────────┬────────────────────────────┬───────────────┘
                │ SQLite Queries             │ AI Inferences
┌───────────────▼──────────────┐  ┌──────────▼───────────────┐
│  SQLite (better-sqlite3)     │  │  Google Gemini API       │
│  Users, Locations, Events,   │  │  Natural Language        │
│  Announcements, Audit Logs   │  │  Campus Assistant        │
└──────────────────────────────┘  └──────────────────────────┘
```

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/), [Vite 6](https://vitejs.dev/), [React Router v7](https://reactrouter.com/), [Leaflet](https://leafletjs.com/), [Motion](https://motion.dev/)
- **Backend**: [Express 4](https://expressjs.com/), [Node.js](https://nodejs.org/), [better-sqlite3](https://github.com/WiseLibs/better-sqlite3), [tsx](https://github.com/privatenumber/tsx)
- **AI Engine**: [@google/genai](https://www.npmjs.com/package/@google/genai) (Gemini 2.5 Flash)
- **Deployment & Bundler**: `esbuild` for Node CommonJS bundling + Vite production build + `vercel.json` for edge SPA rewrites.

---

## 📂 Directory Structure

```text
├── index.html                   # HTML entry point with metadata
├── package.json                 # Dependencies and build scripts
├── server.ts                    # Express API server & Vite middleware
├── tsconfig.json                # TypeScript project configuration
├── vite.config.ts               # Vite configuration (Tailwind v4 integration)
├── vercel.json                  # Vercel SPA routing & rewrites configuration
├── metadata.json                # Project capabilities & permissions manifest
├── .env.example                 # Environment variable templates
│
├── server/                      # Backend services & database
│   ├── auth/                    # Cryptography, tokens, RBAC middleware
│   ├── db/                      # SQLite connection, schema & audit logger
│   └── realtime/                # Server-Sent Events (SSE) push manager
│
├── src/                         # Frontend application
│   ├── App.tsx                  # React Router definitions & providers
│   ├── main.tsx                 # Application entry mount
│   ├── index.css                # Global CSS & Tailwind imports
│   ├── types.ts                 # Shared TypeScript interfaces & models
│   ├── components/              # Reusable UI components
│   │   ├── common/              # Buttons, inputs, modal dialogs, badges
│   │   ├── layout/              # Navbar, Footer, MobileNav, Toast notification
│   │   ├── map/                 # Campus interactive Leaflet map & markers
│   │   └── navigation/          # Turn-by-turn route visualizer
│   ├── pages/                   # Application views
│   │   ├── LandingPage.tsx      # Overview & campus hero section
│   │   ├── ExplorePage.tsx      # Map discovery & POI filter explorer
│   │   ├── NavigationPage.tsx   # Campus pathfinding & directions
│   │   ├── FacultyDirectoryPage.tsx # Cabin directory & indoor floor guides
│   │   ├── EventsPage.tsx       # Live events calendar & filters
│   │   ├── AnnouncementsPage.tsx# Official notices & bulletin board
│   │   ├── StudentDashboard.tsx # Student bookmarks, RSVPs, profile
│   │   ├── PublisherDashboard.tsx# Club publisher event management
│   │   ├── AdminDashboard.tsx   # Verification queue & audit log console
│   │   └── NotFoundPage.tsx     # 404 handler
│   └── services/                # Client state, API clients & seed datasets
│       ├── api.ts               # REST API fetch client
│       ├── auth.tsx             # React Auth context & session hooks
│       ├── realtime.ts          # SSE subscription listener
│       └── data/seeds.ts        # Pre-populated campus locations & demo data
│
└── public/                      # Static icons, map markers, and assets
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version `20.x` or higher
- **npm** or **bun** / **pnpm** / **yarn**

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

Copy the example environment configuration:

```bash
cp .env.example .env
```

Edit `.env` with your preferred settings:

```env
# Google Gemini API key for campus assistant queries (optional for basic browsing)
GEMINI_API_KEY="your-gemini-api-key"

# Host application URL (used for links and absolute references)
APP_URL="http://localhost:3000"
```

### Running the App

Start the full-stack development server (Express + Vite with HMR):

```bash
npm run dev
```

Visit **`http://localhost:3000`** in your browser. The SQLite database `campus_twin.db` will automatically initialize with sample campus locations, faculty cabins, events, and test accounts.

To build and run in production:

```bash
# Build frontend and compile backend bundle
npm run build

# Start production server
npm run start
```

---

## 🌐 Deployment

### Vercel Deployment (SPA Routing)

The live project is hosted at:  
👉 **[https://vitbhopalcampus.vercel.app](https://vitbhopalcampus.vercel.app)**

This repository includes a pre-configured `vercel.json` file in the root directory:

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

**Why this matters**:
- When deployed on Vercel as a client-side Single Page Application, refreshing or directly bookmarking paths like `/dashboard`, `/events`, `/faculty`, or `/locations` will route to `/index.html` without returning `404 NOT_FOUND`.
- Static files and assets in `/assets/*` or `/public` are served directly with optimal caching.

To deploy on Vercel:
1. Connect your repository to [Vercel](https://vercel.com).
2. Set Framework Preset to **Vite**.
3. Set Build Command to `npm run build` or `vite build`.
4. Set Output Directory to `dist`.
5. Add any environment variables (e.g., `GEMINI_API_KEY`) in the Vercel project settings.

### Container / Cloud Run

The app is container-ready. It exposes port `3000` by default and compiles to `dist/server.cjs` via `esbuild`.

---

## 📡 API Overview

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/login` | Authenticate student, publisher, or admin | No |
| `POST` | `/api/auth/logout` | Invalidate current session | Yes |
| `GET` | `/api/auth/me` | Retrieve active user profile | Yes |
| `GET` | `/api/locations` | List campus buildings, facilities, and POIs | No |
| `GET` | `/api/locations/:id` | Location details, indoor floors, coordinates | No |
| `GET` | `/api/faculty` | Faculty directory and cabin numbers | No |
| `GET` | `/api/events` | List campus events, workshops, hackathons | No |
| `POST` | `/api/events` | Create new event submission | Publisher / Admin |
| `GET` | `/api/announcements` | Official campus broadcasts and alerts | No |
| `GET` | `/api/realtime/events` | Real-time Server-Sent Events stream | No |
| `POST` | `/api/ai/chat` | Query the Gemini campus assistant | No |

---

## 👥 User Roles & Demo Logins

The application includes built-in demo credentials for testing role-specific features:

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Student** | `student@vitbhopal.ac.in` | `Campus@123` | Interactive map, cabin search, RSVP to events, save bookmarks |
| **Publisher** | `club@vitbhopal.ac.in` | `Campus@123` | Create event drafts, post announcements, manage attendees |
| **Administrator** | `admin@vitbhopal.ac.in` | `Campus@123` | Verify publishers, approve events, view system audit logs |

*(You can also sign in or register with any valid email on the `/login` page; roles are automatically assigned based on email domain or selection).*

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/campus-indoor-3d`).
3. Commit your changes (`git commit -m 'feat: add 3D block view'`).
4. Push to the branch (`git push origin feature/campus-indoor-3d`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
