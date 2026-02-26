# Arya.az — Milli Səs AI Layihəsi

## Overview
Arya.az is a "National Voice AI" platform for Azerbaijan focused on collecting voice donations to train the first Azerbaijani AI. Users contribute their voice recordings in exchange for future service tokens (A-Coins). The platform also features a global SaaS homepage for AI services, smart profiles, and an embeddable chat widget for businesses. The project aims to develop advanced AI capabilities for the Azerbaijani language, including AI-powered secretaries, translators, assistants, and readers, while also offering a comprehensive suite of tools for businesses to integrate AI into their operations.

## User Preferences
I want iterative development. Ask before making major changes.

## System Architecture
The platform is built with a **React + Vite (TypeScript)** frontend, leveraging **Tailwind CSS, Shadcn UI, and Framer Motion** for a modern UI/UX. The backend is powered by **Express.js** with a custom email/password authentication system. Data is managed using **PostgreSQL** via **Drizzle ORM**.

**Key Architectural Decisions:**
- **Modular Frontend:** Separate landing pages and dashboards for global SaaS (`/`) and Azerbaijani voice donation (`/az`).
- **Dual Authentication:** The `/az` voice donation section uses custom email/password auth (bcrypt + express-session). The global dashboard (`/dashboard`) uses **Supabase Auth** — login/signup happens via Supabase, then the Supabase token is exchanged for a local session via `POST /api/auth/supabase-login`. Both auth systems share the same local `users` table and express-session for downstream API access.
- **Subscription Gating:** After login, `GET /api/subscription/check` verifies `has_chat` via the cross-service API at `sales.hirearya.com`. If `has_chat` is false, the dashboard shows a "Product Locked" overlay linking to `sales.hirearya.com/#pricing`.
- **S3 Storage:** Utilizes AWS S3 for all file uploads (profile images, voice donations) with signed-URL access controls.
- **Multi-language Support:** Global homepage supports EN/ES/RU/FR/TR, while the Azerbaijani section is localized. Smart Profiles support multilingual knowledge bases (Az/Ru/En).
- **Voice Recording System:** Browser-based audio recording using WebM/Opus codec with iOS MP4 fallback, integrated with a milestone and token reward system.
- **AI Integration:** Uses Gemini AI for smart profile chat, knowledge base translation, and AI classification for privacy.
- **Smart Profile System:** Publicly accessible profiles (`/u/:slug`) with integrated AI chat, knowledge base management (public vs. private), and dynamic content updating.
- **Embeddable Widget:** A lightweight, vanilla JavaScript widget (`/embed/:slug`) for easy integration of the AI chat into external websites via an iframe.
- **Privacy Firewall:** Distinct `knowledgeBase` (public) and `privateVault` (owner-only) data separation, enforced by AI access controls for customer vs. owner bots.
- **Stripe Integration:** Seamless payment processing for subscriptions (Pro, Agency) and one-time payments (Founding Member Pass) using Replit's managed Stripe connection.

**Core Features:**
- **Voice Donation Platform:** User registration, consent, voice recording, token economy, and a shop for future AI services.
- **Global SaaS Homepage:** Marketing pages, pricing plans, and "Get Started" CTAs.
- **Global Dashboard:** AI setup, lead management, widget embed code, and analytics.
- **Smart Profile Management (Arya Widget):** Industry templates, OCR scanning for price lists, 2GIS location integration, profile image upload, and knowledge base translation. For users who already have a profile, the widget shows management options. For new users without a profile, a welcome card directs them to the chat bubble.
- **Conversational Onboarding (Discovery Interview):** New users are onboarded via a conversational discovery interview instead of a step-by-step wizard. The OwnerAssistant chat auto-opens (`autoOpen` prop) when no profile exists. The AI asks business vs personal use first, then drills into specifics (industry, services, pricing, hours for Business; profession, inquiries, bio for Personal). No assumptions — AI asks and clarifies. Supports both paths without any forms.
- **Auto-Profile Creation:** After 4+ messages in the discovery conversation, a background AI process analyzes the chat and auto-extracts profile data (businessName, profession, slug, initial KB). The smart profile is created automatically — no manual setup needed. Includes duplicate-prevention guards (re-checks for existing profile before creating, handles slug collisions by appending a suffix).
- **Continuous KB Learning:** After every owner message, a background AI process analyzes the conversation and auto-extracts new factual information to update the knowledge base. Creates initial KB from conversations, merges updates into existing KB. Owner can update Arya ad-hoc just by talking ("we moved to a new address", "prices changed", etc.) — no forms needed. Gate: triggers when message >10 chars OR files attached.
- **Multi-File Upload:** Owner-assistant chat supports uploading up to 10 files at once (images, PDFs). Preview grid with individual remove buttons. All images are sent to Gemini for visual analysis (menus, price lists, etc.).
- **API Endpoints:** Comprehensive set of RESTful APIs for user management, voice donations, transactions, smart profiles, and AI interactions.

- **Master Agent System:** Hierarchical agent management where one smart profile (currently `aryaai`) is designated as the platform-wide "King" agent via `isMaster=true` flag. The master agent can:
  - Update the **Global Knowledge Base** (`global_knowledge_base` table) — shared info about Arya AI that ALL agents reference in their prompts
  - Command format: "Update global knowledge base: [content]" via owner chat
  - Global KB is injected into all AI prompts (widget chat, owner chat, WhatsApp chat)
  - Only the master profile can write to the global KB; all others can only read
  - **Database:** `smart_profiles.is_master` (boolean), `global_knowledge_base` table (single-row, stores content + updatedBy + timestamps)
  - **IMPORTANT:** App uses `SUPABASE_DB_URL` (not `DATABASE_URL`) for the production database. Schema changes must be pushed to Supabase directly, not via `npm run db:push` which targets the Replit built-in DB.

## External Dependencies
- **AWS S3:** For object storage of profile images and voice donations.
- **Stripe:** For payment processing, subscriptions (Arya Pro, Arya Agency), and one-time purchases (Founding Member Pass). Integrated via `stripe-replit-sync`.
- **Google Gemini AI:** Used for AI chat functionality, knowledge base translation, and data classification (public vs. private).
- **2GIS Places API:** For location search and auto-filling business addresses and working hours in the smart profile onboarding.
- **hirearya.com API:** Proxied API for industry templates, OCR scanning services, and fetching demo profiles.
- **Altegio (YCLIENTS) API:** CRM integration for smart profiles. Leads collected by the AI chat can be automatically or manually sent to Altegio as new client records. Settings stored per smart profile (partner_token, user_token, company_id, auto_send flag). API: `https://api.alteg.io/api/v1/client/{company_id}`.
- **Universal Webhook:** Generic webhook integration for any CRM (Bitrix24, AmoCRM, HubSpot, Zapier, Make, etc.). Sends lead data as JSON POST to a user-configured URL. Supports HMAC-SHA256 signing via optional secret key (X-Arya-Signature header). Settings stored per smart profile (webhook_url, webhook_secret, webhook_auto_send). Includes test webhook endpoint and both manual and auto-send capabilities. Duplicate sends prevented via `[webhook-sent]` message markers.
- **Twilio WhatsApp Platform:** Comprehensive WhatsApp integration with 7 features:
  1. **Lead Notifications:** Instant WhatsApp alerts when new leads detected. Auto-send on contact info detection + manual send from lead detail view. Duplicate prevention via `[whatsapp-sent]` markers.
  2. **Daily/Weekly Summary Reports:** Automated business stats (conversations, messages, leads) sent on schedule. Configurable frequency (daily/weekly). Scheduler runs every 30 minutes via setInterval.
  3. **Two-Way Owner Replies:** Business owners reply to lead notification via WhatsApp, response is routed back into the chat session as `[owner-reply]` message.
  4. **Missed Lead Alerts:** When AI responds with "I don't have that information" or similar fallback phrases, owner gets a WhatsApp alert with the unanswered question. Duplicate prevention via `[missed-alert]` markers.
  5. **WhatsApp AI Chat Channel:** Customers can chat with the AI receptionist directly via WhatsApp. Messages are processed through the same Gemini AI pipeline with knowledge base context. Requires Twilio webhook URL configuration: `POST /api/whatsapp/webhook`. Conversations tracked in `whatsapp_conversations` table.
  6. **Appointment Confirmations:** When AI detects a booking request with customer phone number, sends WhatsApp confirmation to the customer. Triggered by booking-related keywords (book, appointment, schedule, reserve, randevu, etc.). Duplicate prevention via `[appointment-confirmed]` markers.
  7. **Follow-Up Reminders:** Automated reminders for unconverted leads. Configurable delay (6h-72h). Only targets leads with phone numbers who didn't convert. Duplicate prevention via `[followup-sent]` markers.
  - **Recording Reminders (Voice Donation):** /az users can opt-in for WhatsApp reminders to record more sentences. Sent every 72h max. Settings: `profiles.whatsapp_number`, `profiles.whatsapp_reminder_enabled`.
  - Uses Twilio WhatsApp API with sender number +12792030206 ("Hire Arya"). All settings stored per smart profile. Scheduler (`server/whatsapp-service.ts`) runs summaries, follow-ups, and reminders every 30 minutes. Endpoints: GET/PATCH `/api/smart-profile/whatsapp-settings`, POST `/api/smart-profile/whatsapp-test`, POST `/api/smart-profile/leads/:sessionId/send-to-whatsapp`, POST `/api/whatsapp/webhook`, GET `/api/smart-profile/whatsapp-conversations`, GET/POST `/api/profiles/whatsapp-reminder`.
- **Telegram Bot Channel:** AI receptionist available via Telegram using Telegraf library. Customers can chat with any business's AI assistant by starting the bot with `/start <slug>`. Features: same Gemini AI pipeline as WhatsApp/widget, prompt injection defense, PII redaction on stored messages, lead auto-notification via WhatsApp. Webhook mode in production (`PUBLIC_APP_URL` set), polling mode in development. Secret webhook path: `/api/telegram/webhook/{sha256(token)}` (anti-scanning). Conversations tracked in `telegram_conversations` table. Settings: `smart_profiles.telegram_chat_enabled`. Requires `TELEGRAM_BOT_TOKEN` secret from @BotFather. Optional: `OWNER_TELEGRAM_ID` secret for admin commands (/stats). Service: `server/telegram-service.ts`. **Fortress Security:** (1) SHA-256 hashed webhook path, (2) Aggressive rate limiting: 5 msg/60s per user, 10-min ban on exceed, silent drop after ban notice, (3) Media/file filtering: text-only, rejects photos/voice/docs/stickers, (4) Owner ID whitelisting: `/stats` command protected by numerical Telegram User ID via `isOwnerTelegram()` guard.
- **PII Redaction:** Customer chat messages (widget + Telegram) are automatically scrubbed of phone numbers, emails, credit card numbers, and AZ national IDs before database storage using `server/pii-redact.ts`. AI sees raw messages for conversation quality but stored data is protected.
- **Security Logging:** Daily-rotated log files (`logs/security-YYYY-MM-DD.log`, 5MB limit) track prompt injection attempts, Twilio signature failures, rate limit hits, and host blocks. WhatsApp alerts sent to admin on critical events (5-min cooldown per attack type/IP). Admin endpoint: `GET /api/admin/security-logs`.