claude --resume "price-drop-alert"
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Single command (runs backend + frontend together)
```bash
npm run dev
```
Requires `concurrently` — installed via `npm install` at the repo root. Backend on `:5000`, frontend on `:5173`.

### First-time setup
```bash
npm install                  # Install concurrently (root)
npm run install:all          # Install backend + frontend deps
cp backend/.env.example backend/.env   # Then fill in .env values
```

### Individual apps
```bash
npm run dev --prefix backend    # Backend only (nodemon)
npm run dev --prefix frontend   # Frontend only (Vite)
npm run build --prefix frontend # Production build
```

### Docker (full stack including MongoDB)
```bash
docker-compose up --build    # Start all services
docker-compose down          # Stop all services
```

Backend requires a `.env` file in `backend/` — copy from `backend/.env.example`. Gmail requires an App Password (not regular password); generate at https://myaccount.google.com/apppasswords.

## Architecture Overview

**Backend** (`backend/`) — Node.js + Express + MongoDB (Mongoose)

- `server.js` bootstraps: DB connection → email verification → Express app → cron scheduler
- `app.js` configures Express: Helmet, CORS, rate limiting (100 req/15min on `/api`), routes
- All price-checking logic flows: `cron/priceCron.js` → `services/priceService.js` → `services/scraperService.js` → `services/emailService.js`
- Manual checks (`POST /api/products/:id/check`) use the same `priceService.checkProductPrice()` path
- Email alerts fire only when `newPrice <= targetPrice` AND (`lastNotifiedPrice` is null OR `newPrice < lastNotifiedPrice`) — this prevents duplicate alerts at the same price

**Frontend** (`frontend/`) — React 18 + Vite + Tailwind CSS

- `App.jsx` persists user email in `localStorage`; all API calls pass email as a query/body param
- No auth tokens — identity is purely email-based
- Vite dev server proxies `/api` → `http://localhost:5000`, so no CORS issues in development
- `src/api/index.js` is the single Axios wrapper; all components import from here, never use `fetch` directly

## Key Data Flow

1. User registers with email → `POST /api/users` upserts the User document
2. Adding a product → `POST /api/products` scrapes initial price immediately and stores in PriceHistory
3. Cron runs on `CRON_SCHEDULE` (default `0 0 * * *`) → checks all `isActive: true` products with 2s delay between each to avoid rate-limiting
4. Deletion is a soft-delete (`isActive: false`); products are never removed from MongoDB

## Scraper Notes

The scraper (`backend/services/scraperService.js`) uses `puppeteer-extra` with the stealth plugin to avoid bot detection. Key behaviors:
- Blocks fonts and media resources to speed up page loads
- Rotates user-agents from a pool in `utils/helpers.js`
- Uses multiple CSS selector fallbacks for price extraction (Amazon and Flipkart both change their DOM frequently)
- Retries up to 3 times with exponential backoff via `withRetry()` in `utils/helpers.js`

When adding support for new platforms, implement a new scraper function in `scraperService.js` and update `detectPlatform()` in `utils/helpers.js`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/users` | Upsert user by email |
| GET | `/api/users/:email` | Get user |
| POST | `/api/products` | Add product (scrapes immediately) |
| GET | `/api/products?email=` | List user's active products |
| GET | `/api/products/:id` | Product + last 100 price history |
| GET | `/api/products/:id/history?limit=` | Price history |
| PUT | `/api/products/:id/target` | Update target price |
| PUT | `/api/products/:id/wishlist` | Toggle wishlist status |
| POST | `/api/products/:id/check` | Manual price check |
| DELETE | `/api/products/:id` | Soft-delete product |
| GET | `/api/notifications?email=&limit=` | List recent notifications + unread count |
| PUT | `/api/notifications/read-all` | Mark all of a user's notifications as read |
| PUT | `/api/notifications/:id/read` | Mark a single notification as read |
| GET | `/health` | Health check |

## Models

- **User**: `email` (unique), `name`, `isActive`
- **Product**: `userId`, `url`, `platform` (amazon|flipkart), `title`, `imageUrl`, `currentPrice`, `previousPrice`, `targetPrice`, `lastNotifiedPrice`, `category`, `brand`, `isWishlisted`, `lastCheckedAt`, `isActive`, `scrapeError`
- **PriceHistory**: `productId`, `price`, `timestamp` — compound index on `(productId, timestamp DESC)`
- **Notification**: `userId`, `productId`, `productTitle`, `type` (price_drop|price_increase), `oldPrice`, `newPrice`, `isRead` — compound index on `(userId, createdAt DESC)`

`lastNotifiedPrice` on Product is critical — it tracks the lowest price for which an alert was sent, preventing repeated emails if price stays at the same dropped value.

## In-App Notifications

Every price check (`priceService.checkProductPrice()`) compares `newPrice` to the product's prior `currentPrice`. If they differ, a `Notification` document is created with `type: 'price_drop'` or `'price_increase'` — independent of the email alert logic, so increases are surfaced too even though they never trigger emails. `category` and `brand` on Product are auto-detected from the scraped title via `detectCategory()`/`detectBrand()` in `utils/helpers.js`; users don't set them manually.

The frontend `NotificationBell` component polls `/api/notifications` every 60s and renders a dropdown with unread badges; clicking a notification marks it read and links to `/products/:id`.
