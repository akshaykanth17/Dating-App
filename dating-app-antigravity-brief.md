# Dating App MVP — Tech Stack & Antigravity Build Brief

## 1. Tech Stack (Web-only, Custom Node.js Backend)

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | React 18 + TypeScript + Vite | Fast dev server, strong typing, huge ecosystem |
| Styling | Tailwind CSS | Rapid UI iteration, matches Antigravity's agent workflow well |
| State/data fetching | TanStack Query + Zustand | Server cache + lightweight client state |
| Routing | React Router v6 | Standard for SPA web apps |
| Backend framework | Node.js + Express (or Fastify) + TypeScript | Full control, matches your preference |
| ORM / DB | PostgreSQL + Prisma | Relational integrity for users/matches/messages; Prisma migrations are agent-friendly |
| Geolocation | PostGIS extension or Haversine query in Postgres | For "nearby" matching without extra services |
| Auth | JWT (access + refresh tokens) + bcrypt | Simple, stateless, no vendor lock-in |
| Real-time chat | Socket.IO (over the Express server) | Simplest reliable WebSocket layer for 1:1 chat |
| Image storage | Cloudflare R2 or AWS S3 (S3-compatible) | Cheap object storage for profile photos |
| Image handling | Sharp (server-side resize/compress) | Keep uploads small, strip EXIF/location data |
| Email | Resend or Nodemailer + SMTP | Verification & password reset emails |
| Background jobs | BullMQ + Redis | Match cleanup, email queue, moderation queue |
| Hosting | Backend: Render/Railway/Fly.io · Frontend: Vercel/Netlify · DB: Neon/Supabase Postgres or Railway Postgres | Cheap, simple CI/CD, no DevOps overhead for an MVP |
| Containerization | Docker + docker-compose (local dev) | So Antigravity's agent can spin up Postgres/Redis locally |

### Core MVP feature set
- Email/password signup + login (JWT), email verification, **mandatory 18+ age check**
- Profile creation: photos (multi-upload), bio, name, age, gender, "interested in", location
- Swipe deck (like/pass) with geolocation-based filtering (distance radius)
- Mutual-like → match creation
- Real-time 1:1 chat per match (Socket.IO)
- Block & report user (required for any dating app, including MVPs)
- Basic account settings (edit profile, delete account, change password)

### Deliberately out of scope for MVP (call out in the prompt)
- Payments/subscriptions
- Video calls
- ML-based match recommendations
- Push notifications (email only for MVP)

---

## 2. Master Prompt for Google Antigravity

Paste the block below as your initial task/instruction to the Antigravity agent. It's written the way agent-first tools expect: goal, constraints, stack, explicit step order, and verification criteria.

```
GOAL
Build a web-only dating app MVP called "[APP_NAME]" — a swipe-based matching
app with real-time chat. Target: a working, locally runnable full-stack app
with a Postgres database, ready to deploy.

TECH STACK (do not substitute without asking me first)
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS, React Router,
  TanStack Query, Zustand
- Backend: Node.js + TypeScript + Express, Prisma ORM, PostgreSQL
- Real-time: Socket.IO for 1:1 chat
- Auth: JWT (access + refresh tokens), bcrypt password hashing
- Image storage: S3-compatible bucket (use env vars for credentials/bucket
  name; abstract behind a storage service so provider can be swapped)
- Background jobs: BullMQ + Redis (used for email sending + moderation queue)
- Dev environment: Docker Compose for Postgres + Redis locally

CORE FEATURES (build in this order, verify each before moving on)
1. Project scaffolding: monorepo with /frontend and /backend, shared
   TypeScript types, Docker Compose for Postgres + Redis, .env.example files
2. Database schema (Prisma): User, Profile, Photo, Swipe, Match, Message,
   Report/Block. Include indexes for geolocation queries and match lookups.
3. Auth: register, login, JWT refresh, email verification flow, password
   reset. Enforce a hard 18+ age gate at signup (reject under-18 birthdates).
4. Profile management: create/edit profile, upload multiple photos
   (resize + strip EXIF via Sharp before storing), set preferences
   (age range, distance radius, gender interested in).
5. Discovery/swipe feed: return candidate profiles filtered by distance
   (PostGIS or Haversine formula), age range, and preference match;
   exclude already-swiped users; like/pass endpoints.
6. Matching: on mutual like, create a Match record and notify both users.
7. Chat: Socket.IO namespace scoped per match; persist messages to Postgres;
   REST endpoint to load chat history; basic online/offline presence.
8. Safety: block user, report user (with reason + optional note), and
   ensure blocked users never appear in each other's feed or matches.
9. Account settings: edit profile, change password, delete account
   (hard-delete or soft-delete — ask me which before implementing).

NON-GOALS FOR THIS BUILD
Do not implement payments, video calling, push notifications, or any
ML-based recommendation system. Stub these as clearly marked TODOs only
if it's trivial to leave a hook — otherwise skip entirely.

VERIFICATION REQUIREMENTS
After each numbered feature, use the browser subagent to manually test the
flow end-to-end (e.g., register two test users, swipe-match them, send a
chat message) and produce a screenshot/recording Artifact before moving to
the next feature. Do not proceed to the next feature until the current one
is verified working against a running Postgres instance.

SECURITY & COMPLIANCE NOTES
- Rate-limit auth and swipe endpoints.
- Never expose password hashes or JWT secrets in responses/logs.
- Validate and sanitize all user input (esp. profile bio, chat messages).
- Store only the minimum location data needed (avoid storing precise GPS
  history — store last-known lat/long only, overwritten each update).

DELIVERABLE
A README.md with setup instructions (docker-compose up, prisma migrate,
env vars needed, how to run frontend + backend locally), plus the working
code for everything above.
```

---

## 3. Notes before you run this

- **Replace `[APP_NAME]`** with your actual app name before pasting.
- Antigravity lets you pick the model per agent — Gemini 3 Pro is a solid default for this kind of multi-file scaffolding task; you can swap to Claude Sonnet/Opus for the backend logic if you want stronger reasoning on the matching/geolocation queries.
- Start Antigravity in **Agent-assisted** mode (not full Autopilot) for the first pass on auth and payments-adjacent code (even though payments are out of scope, auth security is worth reviewing manually).
- Age verification and reporting/blocking are non-negotiable for a dating app in most app-store/legal contexts — they're included above as MVP requirements, not extras.
- If you later add native mobile, the backend above (Express + Prisma + Postgres) doesn't need to change — only a new frontend client would.
