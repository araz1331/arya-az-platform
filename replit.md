# Arya.az — Milli Səs AI Layihəsi

## Overview
Arya.az is a "National Voice AI" platform for Azerbaijan where users donate their voice recordings to train the first Azerbaijani AI in exchange for future service tokens (A-Coins).

## Architecture
- **Frontend**: React + Vite (TypeScript), Tailwind CSS, Shadcn UI, Framer Motion
- **Backend**: Express.js with custom email/password authentication
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: Custom email/password auth with bcrypt, express-session + connect-pg-simple
- **Storage**: Audio recordings tracked in DB (metadata), file uploads via multer

## URL Structure
- `/` → Global SaaS homepage (English default, multi-language: EN/ES/RU/FR/TR)
- `/az` → Azerbaijani voice donation landing page
- `/az/admin` → Admin dashboard
- `/dashboard` → Global user dashboard (AI Setup, Leads, Widget, Analytics — no voice collection)
- `/u/:slug` → Smart Profile pages (language-independent, not under /az)
- `/embed/:slug` → Embeddable chat widget (language-independent)

## Global Homepage (`/`)
- Component: `client/src/pages/global-home.tsx`
- Translations: `client/src/lib/global-i18n.ts` (separate from /az i18n)
- Sections: Navigation, Hero, Use Cases (3 cards), Language Engine animation, How It Works (3 steps), Pricing (Free/$29 Pro/$199 Agency), CTA, Footer
- Language selector: Globe dropdown with EN/ES/RU/FR/TR, stored in localStorage
- Footer links to regional pages including `/az` for Azerbaijan
- "Get Started" buttons navigate to `/dashboard`

## Global Dashboard (`/dashboard`)
- Component: `client/src/pages/global-dashboard.tsx`
- Auth: `client/src/pages/global-auth.tsx` (English-only, no /az language dependency)
- Tabs: AI Setup (AryaWidget), Leads, Widget (embed code), Analytics (coming soon)
- No voice collection, tokens, or shop — those are /az only
- Uses same backend auth system (email/password, express-session)

## Key Features
1. **Landing Page**: Patriotic hero with deep blue theme, intro video, stats, call-to-action (at `/az`)
2. **Authentication**: Custom email/password with register/login forms (Azerbaijani UI)
3. **Voice Recorder**: Browser-based audio recording with WebM/Opus codec (iOS mp4 fallback)
4. **Consent Modal**: Volunteer consent required before first recording (sessionStorage)
5. **5+15 Milestone System**: 5 sentences = 200 tokens, 20 sentences = 1,000 tokens total
6. **Token Economy (A-Coins)**: Dynamic halving - <1000 users get full rewards, >1000 get half
7. **Shop/Voucher System**: Pre-order future AI services (Secretary, Translator, Assistant, Reader)
8. **Audio Validation**: Duration check based on word count (min 0.3s per word)

## Database Schema
- `users`: id, email, passwordHash, firstName, lastName, profileImageUrl
- `sessions`: sid, sess, expire (express-session via connect-pg-simple)
- `profiles`: id, displayName, age, gender, tokens, recordingsCount, milestone1Claimed, milestone2Claimed
- `recordings`: id, userId, sentenceId, sentenceText, category, duration, fileSize
- `transactions`: id, userId, amount, type, description
- `vouchers`: id, userId, itemName, tokenCost, activationDate, status
- `voice_donations`: id, userId, speakerName, age, gender, sentenceId, transcription, audioUrl, category, duration, fileSize, wordCount
- `widget_messages`: id, profileId, sessionId, role, content, contentType, audioUrl
- `master_voice_dataset`: SQL VIEW unioning voice_donations (source='donation') + widget_messages where contentType='voice' (source='widget')

## Auth Flow
- Landing page is public, clicking "Könüllü Ol" or "Daxil Ol" shows custom auth page
- Auth page has login/register tabs with email/password fields (all Azerbaijani)
- After auth, consent modal shown, then user enters recorder
- User's profile (tokens, recordings) linked by user.id from users table
- Session-based auth using express-session stored in PostgreSQL
- Passwords hashed with bcrypt (12 salt rounds)
- Auth module: server/auth.ts (setupSession, registerAuthRoutes, isAuthenticated, getUserId)

## API Routes
- `GET /api/auth/user` - Get authenticated user info (session-based)
- `POST /api/auth/register` - Register new user with email/password
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout and destroy session
- `GET /api/user` - Get/create user profile (protected)
- `PATCH /api/user/profile` - Update profile info (age, gender) (protected)
- `GET /api/stats` - Global platform statistics (public)
- `POST /api/recordings` - Submit a voice recording (protected, internal milestone/token logic)
- `POST /api/donate-voice` - Voice donation endpoint (CORS-enabled, accepts speaker_name, age, gender, audio.webm); saves to voice_donations table
- `POST /api/widget-messages` - Log widget chat messages (profileId, sessionId, role, content, contentType)
- `GET /api/transactions` - User's token transaction history (protected)
- `GET /api/vouchers` - User's purchased vouchers (protected)
- `POST /api/vouchers` - Purchase a shop item with tokens (protected)

## Sentences
- 503 Azerbaijani sentences in `client/src/data/sentences_az.json` (3 anchors + 500 pool)
- 20 categories: anchor, chat, news, question, numbers, hard_words, commands, emotions, daily, tech, culture, travel, food, sports, weather, health, education, business, nature, family
- Session system: 3 anchor phrases shown first (if unrecorded), then random pool picks to total 20 per session
- Emotion support (angry, happy, sad) with contextual prompts

## Voice Upload Flow
- After local `/api/recordings` saves recording + handles milestones/tokens, also sends to `/api/donate-voice` via CORS
- Audio sent as `recording.webm` (WebM format, not forced to MP3)
- FormData includes: audio file, speaker_name, age, gender, sentenceId, sentenceText, category, duration, wordCount
- Full server response logged to console for debugging
- Profile info form (age, gender) shown before first recording session

## Smart Profile (Public Chat Pages)
- Route: `/u/:slug` — public page, no auth required
- Fetches profile from local DB first (`/api/smart-profile/by-slug/:slug`), fallback to hirearya API then demo profiles
- Chat interface (text + voice input) powered by local Gemini AI (`/api/smart-profile/chat`)
- Chat uses Gemini 2.5 Flash with knowledge base from arya.az DB as system instruction
- Supports chat history context (last 6 messages) for conversational continuity
- Component: `client/src/pages/smart-profile.tsx`
- Stable sessionId via sessionStorage, cleanup on unmount, pointer leave recording guard
- Multilingual knowledge base: knowledgeBase (Az), knowledgeBaseRu, knowledgeBaseEn
- Language-aware chat replies: uses translated KB when available for Ru/En
- Display name inline editing (pencil icon, owner-only)
- Stripe PRO upgrade button ("3 Gun Pulsuz") → calls `/api/proxy/payment/create-checkout` → redirects to Stripe checkout

## Smart Profile Editing & Management (Arya Widget)
- Component: `client/src/components/arya-widget.tsx`
- **Enhanced Onboarding Wizard** with hirearya.com integrations:
  - Step 0: Business name (text input)
  - Step 1: Profession → then **Industry Template Selection** (fetched from `/api/proxy/templates/list`), auto-fills services/pricing if selected
  - Step 2: Services/prices → **OCR Scan option** (upload price list photo via `/api/proxy/scan`), auto-fills from detected text
  - Step 3: Pricing policy (text input)
  - Step 4: Location → **2GIS Location Search** (via `/api/proxy/location/search`), auto-fills address + work hours
  - Step 5: Work hours (text input, may be skipped if filled by 2GIS)
  - Step 6: FAQ (text input)
  - Step 7: Slug (URL link)
- After onboarding complete, shows 3 action buttons:
  - **Edit Info**: Re-enter business details (7 fields), skip with "-", updates knowledge base
  - **Upload Photo**: Profile image upload via `/api/smart-profile/upload-image`, stored in `uploads/profile-images/`
  - **Translate Ru/En**: Auto-translates knowledge base to Russian & English via Gemini AI (`/api/smart-profile/translate`)
- Static files served from `/uploads/` directory

## Stripe Integration — Replit Managed Connection
- Uses `stripe-replit-sync` with Replit Stripe connection (auto-managed keys)
- Stripe client: `server/stripeClient.ts` (fetches credentials from Replit connection API)
- Webhook handler: `server/webhookHandlers.ts` (processes via stripe-replit-sync)
- Webhook route registered BEFORE `express.json()` in `server/index.ts`
- On startup: `runMigrations()` → `getStripeSync()` → webhook setup → `syncBackfill()`
- Stripe data synced to `stripe.*` schema tables (products, prices, customers, etc.)
- **Founding Member Pass**: $99 one-time payment, lifetime Arya Pro access
  - Product seeded via `server/seed-products.ts`
  - Checkout: `POST /api/founding-member/checkout` (protected, one-time payment mode)
  - Homepage CTA checks auth → creates checkout session → redirects to Stripe
  - Success redirects to `/dashboard?checkout=founder-success`
- **PRO plan** (/az): 20 AZN/month subscription with 3-day free trial
  - Checkout: `POST /api/proxy/payment/create-checkout` (protected, subscription mode)
  - Creates Stripe customer if not exists, saves stripeCustomerId to smart_profiles
  - On checkout success (`?checkout=success`), marks user as PRO locally
  - PRO status checked via `GET /api/smart-profile/pro-status`

## 2GIS Integration — DIRECT
- 2GIS Places API called directly from arya.az backend
- TWOGIS_API_KEY env var for authentication
- Endpoint: `POST /api/proxy/location/search` → queries `https://catalog.api.2gis.com/3.0/items`
- Returns first 5 results with name, address, phone, working hours, coordinates

## hirearya.com Integration (Remaining Proxy APIs)
- Base URL: `https://api.hirearya.com` (configured as HIREARYA_API in server/routes.ts)
- All proxy requests include `x-api-key` header from HIREARYA_SECRET_KEY env var
- **Templates**: `GET /api/proxy/templates/list` → industry templates for auto-setup
- **OCR Scan**: `POST /api/proxy/scan` → multipart file upload, returns detected text/prices
- **Profile Fetch**: `GET /api/proxy/widget/profile/:slug` → fetch demo profiles from hirearya

## Smart Profile DB Schema
- `smart_profiles`: id, userId, slug, businessName, displayName, profession, themeColor, profileImageUrl, knowledgeBase, knowledgeBaseRu, knowledgeBaseEn, professionRu, professionEn, onboardingComplete, isActive, isPro, proExpiresAt, stripeCustomerId

## API Routes (Smart Profile)
- `GET /api/smart-profile` - Get current user's smart profile (protected)
- `POST /api/smart-profile` - Create smart profile (protected)
- `PATCH /api/smart-profile` - Update smart profile fields (protected, whitelisted fields only)
- `GET /api/smart-profile/by-slug/:slug` - Public profile lookup (returns translated KB fields, user_id for owner check)
- `POST /api/smart-profile/upload-image` - Upload profile photo (protected, multer)
- `POST /api/smart-profile/chat` - AI chat using Gemini with knowledge base from DB (public, accepts slug/message/language/history)
- `POST /api/smart-profile/activate-pro` - Mark user as PRO after Stripe checkout success (protected)
- `GET /api/smart-profile/pro-status` - Check PRO subscription status, verify with hirearya if expired (protected)
- `GET /api/proxy/leads/:slug` - Fetch leads from hirearya for PRO users (protected)
- `POST /api/smart-profile/translate` - Auto-translate knowledge base Az→Ru/En via Gemini (protected)
- `GET /api/smart-profile/leads` - Get leads (chat sessions) grouped by sessionId (protected)
- `GET /api/smart-profile/leads/:sessionId` - Get individual lead conversation messages (protected)

## Embeddable Widget System
- Route: `/embed/:slug` — lightweight chat page designed for iframe embedding, no auth required
- Script: `client/public/widget.js` — standalone vanilla JS, creates floating chat button + iframe overlay
- Usage: Add `<script src="https://arya.az/widget.js" data-slug="YOUR_SLUG" data-color="#2563EB"></script>` to any website
- Widget creates a fixed-position chat bubble (bottom-right), clicking opens iframe to `/embed/:slug`
- Same-origin architecture: iframe loads from arya.az, so all API calls work without CORS issues
- Embed code shown in Arya widget dashboard with copy-to-clipboard functionality
- Multilingual support: Az/Ru/En in embed chat interface
- Component: `client/src/pages/embed-chat.tsx`

## Running
- `npm run dev` starts the Express + Vite dev server on port 5000
- `npm run db:push` syncs database schema
