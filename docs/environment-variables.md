# Project Pulse — Environment Variables Reference

This document details the configuration variables used across Project Pulse, including the Pulse Community module.

## Core Configuration

| Variable | Type | Default | Description |
|---|---|---|---|
| `APP_NAME` | string | `Pulse Health` | Application display name |
| `NEXT_PUBLIC_APP_URL` | string | `http://localhost:3000` | Public URL for links and redirects |
| `NODE_ENV` | string | `development` | Environment mode (`development`, `test`, `production`) |
| `DATABASE_URL` | string | `file:./dev.db` | SQLite URL (dev) or PostgreSQL connection string (prod) |
| `AUTH_SECRET` | string | *(required in prod)* | 32+ character JWT signing key |
| `AUTH_SESSION_MAX_AGE` | number | `2592000` | Session lifetime in seconds (30 days) |
| `DEMO_MODE` | enum | `"true"` | Enables seeded demo users, sample discussions, and mock devices |

## Pulse Community & Moderation Engine

| Variable | Type | Default | Description |
|---|---|---|---|
| `COMMUNITY_MODERATION_PROVIDER` | enum | `"rules_fallback"` | `"groq"`, `"gemini"`, or `"rules_fallback"` |
| `COMMUNITY_MODERATION_API_KEY` | string | `""` | Server-side API key for LLM content screening (optional) |
| `COMMUNITY_MODERATION_API_BASE_URL` | string | `"https://api.groq.com/openai/v1"` | OpenAI-compatible endpoint base URL |
| `COMMUNITY_MODERATION_MODEL` | string | `"llama-3.3-70b-versatile"` | Model used for text safety screening |

### Safe Fallback Behavior
If `COMMUNITY_MODERATION_API_KEY` is not provided or if the remote API encounters an error/rate limit, the system gracefully and immediately defaults to the deterministic clinical rules-based screening engine. The community remains 100% functional with zero downtime.

## AI & Groq Engine

| Variable | Type | Default | Description |
|---|---|---|---|
| `GROQ_API_KEY` | string | `""` | Groq high-speed inference API key |
| `AI_API_KEY` | string | `""` | Metabolic AI insights API key |
| `AI_API_BASE_URL` | string | `"https://api.groq.com/openai/v1"` | Base URL for LLM inferences |
| `AI_MODEL` | string | `"openai/gpt-oss-120b"` | Default model ID |

## Pulse Food AI & Nutrition

| Variable | Type | Default | Description |
|---|---|---|---|
| `FOOD_AI_PROVIDER` | enum | `"groq"` | `"groq"`, `"gemini"`, `"openai"`, or `"demo"` |
| `FOOD_AI_API_KEY` | string | `""` | Food recognition vision model key |
| `FOOD_AI_MODEL` | string | `"qwen/qwen3.8-27b"` | Food vision recognition model |
| `NUTRITION_PROVIDER` | enum | `"demo"` | `"usda"` or `"demo"` |
| `NUTRITION_API_KEY` | string | `""` | USDA FoodData Central API key |
| `FOOD_IMAGE_MAX_SIZE_MB` | string | `"8"` | Maximum meal photograph upload size in MB |

## Pulse Proactive Care Engine

| Variable | Type | Default | Description |
|---|---|---|---|
| `PROACTIVE_AI_PROVIDER` | enum | `"rules_fallback"` | `"groq"`, `"gemini"`, or `"rules_fallback"` |
| `PROACTIVE_AI_API_KEY` | string | `""` | Optional API key for compassionate AI phrasing |
| `PROACTIVE_AI_MODEL` | string | `"llama-3.3-70b-versatile"` | Model used for suggestion phrasing |
| `PROACTIVE_MAX_DAILY_INTERVENTIONS` | number | `2` | Configurable daily frequency cap |
| `PROACTIVE_COOLDOWN_HOURS` | number | `4` | Cooldown period between proactive contacts |
| `NOTIFICATION_PROVIDER` | enum | `"in_app"` | `"in_app"`, `"email"`, or `"push"` |
| `SCHEDULER_SECRET` | string | `""` | Optional shared secret for background cron runner |

### Safe Fallback Behavior
The Proactive Care engine operates with 100% fidelity using deterministic behavioral rules and clinical safety filters when external AI credentials are not provided.

## Payment & Subscription Gateway (Razorpay Recurring INR ₹499/mo)

| Variable | Type | Default | Description |
|---|---|---|---|
| `PAYMENT_PROVIDER` | enum | `"razorpay"` | `"razorpay"` or `"mock"` |
| `RAZORPAY_KEY_ID` | string | `""` | Razorpay public key ID for standard checkout modal |
| `RAZORPAY_KEY_SECRET` | string | `""` | Razorpay private secret key (Server-side HMAC verification only) |
| `RAZORPAY_WEBHOOK_SECRET` | string | `""` | Secret used to verify webhook signatures (`x-razorpay-signature`) |
| `RAZORPAY_PLAN_ID` | string | `"plan_pulse_premium_499"` | Razorpay recurring subscription plan ID for ₹499/month |

### Payment Security & Fallback
1. Secret keys (`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) are never exposed via `NEXT_PUBLIC_` and never transmitted to the browser.
2. Webhook signatures and payment authorizations are verified server-side with HMAC SHA-256 before any subscription status is activated.
3. In test/development mode, if keys are not configured, a safe, isolated simulation mode handles checkout and signature validation without failing the application or risking accidental live charges.

## Security Best Practices
1. Never commit `.env` into git. Keep `.env.example` updated with safe placeholders.
2. Never prefix server keys with `NEXT_PUBLIC_`.
3. All inputs to the engine are validated server-side using Zod and XSS sanitization.
