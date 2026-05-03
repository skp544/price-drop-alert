# Price Drop Alert System

Track Amazon India and Flipkart product prices. Get email notifications when prices drop below your target.

## Stack

- **Backend:** Node.js + Express + Puppeteer + node-cron
- **Database:** MongoDB + Mongoose
- **Frontend:** React + Vite + Tailwind CSS + Recharts
- **Email:** Nodemailer (Gmail SMTP)

---

## Quick Start (Local Dev)

### Prerequisites
- Node.js 18+
- MongoDB running locally (or MongoDB Atlas URI)
- Gmail App Password ([how to get one](https://support.google.com/accounts/answer/185833))

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/price-drop-alert
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-char-app-password
EMAIL_FROM="Price Drop Alert <your-gmail@gmail.com>"
FRONTEND_URL=http://localhost:5173
CRON_SCHEDULE=0 * * * *
```

### 3. Run

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

Open http://localhost:5173

---

## Docker Setup

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials

docker-compose up --build
```

Open http://localhost

---

## API Reference

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/users` | Register/get user `{ email, name? }` |
| `GET` | `/api/users/:email` | Get user by email |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/products` | Add product `{ email, url, targetPrice }` |
| `GET` | `/api/products?email=` | List user's products |
| `GET` | `/api/products/:id` | Get product + history |
| `GET` | `/api/products/:id/history` | Get price history |
| `PUT` | `/api/products/:id/target` | Update target `{ targetPrice }` |
| `POST` | `/api/products/:id/check` | Trigger manual price check |
| `DELETE` | `/api/products/:id` | Stop tracking |

---

## Sample Test URLs

**Amazon India:**
```
https://www.amazon.in/dp/B0CHX3QBCH
https://www.amazon.in/Apple-iPhone-15-128-GB/dp/B0CHX3QBCH
https://www.amazon.in/dp/B0BDJH6J1D
```

**Flipkart:**
```
https://www.flipkart.com/apple-iphone-15-blue-128-gb/p/itm6ac6485515ae4
https://www.flipkart.com/samsung-galaxy-s24-marble-gray-256-gb/p/itmbc1e420eadb48
```

---

## How It Works

1. User enters their email + a product URL + target price
2. The system **scrapes the product** (Puppeteer) to get title and current price
3. A **cron job runs every hour** checking all active products
4. When `currentPrice ≤ targetPrice` **and** not already notified: → email is sent
5. `lastNotifiedPrice` prevents duplicate emails for the same price drop
6. Price history is stored for charting

---

## Scraping Architecture

- Puppeteer launches headless Chromium
- Rotates user-agent strings per request
- Waits for DOM to load (handles dynamic JS content)
- Retries up to 3× with exponential backoff on failure
- 2-second delay between consecutive product checks
- Supports Amazon India and Flipkart selector fallbacks

---

## Email Setup (Gmail)

1. Enable 2-Factor Authentication on your Google account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate a password for "Mail" → "Windows Computer"
4. Use that 16-character password as `EMAIL_PASS` in `.env`

---

## Project Structure

```
price-drop-alert/
├── backend/
│   ├── config/db.js
│   ├── controllers/
│   │   ├── productController.js
│   │   └── userController.js
│   ├── cron/priceCron.js
│   ├── middleware/errorHandler.js
│   ├── models/
│   │   ├── PriceHistory.js
│   │   ├── Product.js
│   │   └── User.js
│   ├── routes/
│   │   ├── productRoutes.js
│   │   └── userRoutes.js
│   ├── services/
│   │   ├── emailService.js
│   │   ├── priceService.js
│   │   └── scraperService.js
│   ├── utils/
│   │   ├── helpers.js
│   │   └── logger.js
│   ├── app.js
│   ├── server.js
│   └── .env.example
├── frontend/
│   └── src/
│       ├── api/index.js
│       ├── components/
│       │   ├── AddProductModal.jsx
│       │   ├── LoadingSpinner.jsx
│       │   ├── Navbar.jsx
│       │   ├── PriceHistoryChart.jsx
│       │   └── ProductCard.jsx
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── EmailSetup.jsx
│       │   └── ProductDetail.jsx
│       ├── App.jsx
│       └── main.jsx
├── docker-compose.yml
├── Dockerfile.backend
└── Dockerfile.frontend
```
