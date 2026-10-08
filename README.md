# VIT Bhopal Digital Twin

A digital twin and interactive web portal built for VIT Bhopal University. It unites campus navigation, floor-by-floor faculty cabin lookups, club announcements, verified event publishing, and administrative controls into a single responsive app.

- **Live Site**: [vitcampus-kappa.vercel.app](https://vitcampus-kappa.vercel.app)
- **Source Code**: [github.com/goludheerajm31-arch/VIT-BHOPAL-TWIN](https://github.com/goludheerajm31-arch/VIT-BHOPAL-TWIN)

---

## Why We Built This

Navigating a fast-growing campus like VIT Bhopal comes with daily friction:
- Freshers and visitors often get confused trying to find faculty cabins across different academic blocks and floors.
- Notices, hackathons, and club events are usually scattered across WhatsApp groups, posters, and Instagram stories.
- Students lack a central, reliable place to check consultation hours, route between hostels and labs, or keep track of college events.

This project solves those problems by giving the campus community a practical, single point of reference on web and mobile.

---

## Core Capabilities

### 🗺️ Campus Map & Outdoor Walking Routes
- Interactive map customized with actual VIT Bhopal landmarks (AB-1, AB-2, Lab Complex, Boys & Girls Hostels, MPH, Food Courts, Medical Center).
- Point-to-point walking paths with turn-by-turn guidance across campus roads and walkways.
- Quick filters to locate nearby ATMs, mess halls, sports arenas, and academic buildings.

### 👨‍🏫 Faculty Directory & Indoor Cabin Guide
- Search faculty by name, department (SCSE, SASL, SEEE, SCHEME), or cabin number.
- Floor-level indoor breakdown showing which staircase or elevator to use.
- View office consultation timings, schedule status, and contact emails before walking over.

### 📅 Club Events & Notices
- Centralized feed of hackathons, workshops, guest lectures, and cultural events.
- Poster previews, detailed descriptions, venue details, and one-tap RSVPs.
- Event auto-archival once an event date passes.
- Real-time updates without having to refresh the browser page.

### 👥 Multi-Role Campus Workflows
The platform provides tailored interfaces based on user roles:
- **Students**: Explore map, look up cabins, RSVP to events, save bookmarks, view mess menus and campus guides.
- **Faculty**: Update office hours, manage consultation availability, and answer student inquiries.
- **Club / Chapter Publishers**: Submit upcoming events, upload flyers, and post official club notices.
- **Administrators**: Review faculty claims, approve publisher applications, moderate events, and maintain directory integrity.

---

## Testing & Demo Accounts

For demonstration, evaluation, or grading purposes, you can explore all features using the master account:

| Field | Detail |
| :--- | :--- |
| **Email** | `admin@vitbhopal.ac.in` |
| **Password** | `admin9211` |
| **Active Roles** | Admin, Faculty, Publisher, Student |
| **Role Switcher** | Use the floating role switcher at the bottom to jump between Student, Faculty, Publisher, and Admin views without logging out. |

You can also sign in via **Google Sign-In** using any `@vitbhopal.ac.in` Google account.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7
- **Mapping & Animations**: Leaflet, Framer Motion, Lucide Icons
- **Backend & Database**: Supabase (PostgreSQL with Row Level Security, Realtime channels, GoTrue Auth)
- **Asset Storage**: Supabase Storage buckets for event banners and PDF guides
- **Deployment**: Vercel (Edge CDN with SPA route rewrites)
- **Optional Container / Node Server**: Express 4 (`server.ts` compiled via esbuild)

---

## Project Structure

```text
├── src/
│   ├── components/          # Reusable UI pieces (map, cards, modals, layout)
│   ├── pages/               # Views for map, events, directories, and dashboards
│   ├── services/            # Supabase clients, auth state, and realtime listeners
│   ├── types/               # Shared TypeScript models (Event, Faculty, User, etc.)
│   ├── lib/                 # Utility helpers, timezone formatters, validations
│   └── App.tsx              # Router setup and providers
├── supabase/
│   ├── schema.sql           # Database tables, triggers, and RLS rules
│   ├── storage_policies.sql # File storage security configurations
│   └── seed.sql             # Default campus data, landmarks, and sample records
├── server.ts                # Standalone Express runner for Node / Docker setups
└── vercel.json              # Rewrites and production headers
```

---

## Running Locally

### 1. Prerequisites
- Node.js 20+
- npm (or pnpm / yarn)

### 2. Clone & Install
```bash
git clone https://github.com/goludheerajm31-arch/VIT-BHOPAL-TWIN.git
cd VIT-BHOPAL-TWIN
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the project root:
```env
VITE_SUPABASE_URL=https://cqhgnvxuvsqxrvdgmkpk.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_DEMO_MODE=true
```

### 4. Start the Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

To build the production bundle:
```bash
npm run build
```

---

## Security & Reliability Notes

- **Database-Enforced Access**: User roles are verified in PostgreSQL via Supabase Row-Level Security (`auth.uid()`), ensuring unauthorized users cannot bypass UI guards.
- **Clean Secrets**: The service-role key is never packaged in client bundles.
- **File Validation**: Image posters and documents are inspected for size and MIME types before saving to storage buckets.
- **Direct Link Support**: Full SPA routing rules in `vercel.json` ensure refreshing pages like `/faculty` or `/admin` won't cause 404 errors.

---

## License

Created for the VIT Bhopal University community. Released under the [MIT License](LICENSE).
