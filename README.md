# FirmFlow

[![CI](https://github.com/sindhu-dev02/Firmflow/actions/workflows/ci.yml/badge.svg)](https://github.com/sindhu-dev02/Firmflow/actions/workflows/ci.yml)

A multi-tenant SaaS for small firms to manage their products, customers, orders and team in one place. Every firm (organization) has its own private data, its own team and its own subscription plan.

- **Live app:** https://firmflow-six.vercel.app
- **API:** https://firmflow.onrender.com (free hosting, so the first request after a quiet period can take about 30 seconds)

## What you can do

| Area | What it does |
| --- | --- |
| **Dashboard** | Revenue, orders, products, team and customer counts, a sales chart and recent orders. |
| **Orders** | Create an order for a customer with live line totals. Confirm, mark fulfilled or cancel (cancelling puts the stock back). Filter by status, with paging. |
| **Products** | Add and edit every field (name, SKU, description, price in ₹, stock, category, active). Search by name or SKU, with paging. |
| **Categories** | Add, rename and delete. Deleting asks first and shows how many products use it. |
| **Customers** | Add, edit, deactivate and delete customers. See how many orders each has placed and how much they spent. |
| **Team** | The owner invites and manages employees. Deactivate, reactivate, edit or delete. |
| **Billing** | Free, Starter, Business and Enterprise plans, checkout with Razorpay, invoices, cancel at period end. |
| **Activity log** | Owner-only history of who did what: team changes, products, categories and orders. |
| **Profile** | Change your name and password. |

Other touches: light and dark mode, a collapsible sidebar, a command palette, confirmation windows instead of browser pop-ups, forms in windows, loading placeholders and empty states on every page.

## Roles and rules

| Role | Can do |
| --- | --- |
| **Owner** (`org_owner`) | Everything: billing, activity log, invite and manage employees, edit customers, products, categories and orders. |
| **Employee** | Day-to-day work: products, categories, orders and customers. Cannot invite employees, manage staff, buy or cancel a plan, or see the activity log. |
| **Customer** | Can browse products and categories and place orders for themselves. Customers do not use up an employee seat. |

Rules the server enforces:

- Only the owner can invite employees.
- Nobody can edit the owner, or themselves, through the member edit route.
- A member must be deactivated before being deleted. The owner and your own account cannot be deleted. A customer who has orders cannot be deleted.
- A deactivated employee still takes up a seat on the plan.
- Prices are stored as whole **paise** (₹499.50 is saved as `49950`) so there are no rounding errors.

### Plan limits

| Plan | Firms | Products | Employees |
| --- | --- | --- | --- |
| Free | 1 | 20 | 2 |
| Starter | 3 | 500 | 10 |
| Business | Unlimited | Unlimited | Unlimited |
| Enterprise | Unlimited | Unlimited | Unlimited |

## Tech stack

**Client** (`client/`): React, Vite, TypeScript, Tailwind CSS v4, TanStack Query, React Hook Form with Zod, Zustand, Framer Motion, Recharts, Sonner toasts, cmdk, Lucide icons. Linted with oxlint.

**Server** (`server/`): Node.js, Express, TypeScript, MongoDB with Mongoose, Zod validation, JWT access and refresh tokens, bcrypt, Helmet, CORS and rate limiting. Payments with Razorpay. Tested with Vitest, Supertest and an in-memory MongoDB.

**Hosting:** client on Vercel, server on Render, database on MongoDB Atlas. GitHub Actions runs the server build and tests and the client build on every push and pull request.

## Project layout

```
firmflow/
├── client/                 React app
│   └── src/
│       ├── api/            one file per API area (axios calls)
│       ├── components/     ui/ (buttons, modal, skeletons...), layout/, auth/, orders/, billing/
│       ├── hooks/          TanStack Query hooks
│       ├── pages/          one folder per page
│       ├── store/          auth and theme state
│       └── index.css       colors, fonts and design tokens
├── server/                 Express API
│   ├── src/
│   │   ├── modules/        auth, users, organizations, products, categories, orders,
│   │   │                   addresses, plans, subscriptions, invoices, payment,
│   │   │                   webhook, activityLog
│   │   ├── middlewares/    authenticate, authorize, tenant, plan limits, rate limiters, errors
│   │   ├── scripts/        seedPlans, seedProducts, backfill scripts
│   │   └── app.ts
│   └── tests/              Vitest + Supertest
└── .github/workflows/ci.yml
```

## Run it on your computer

You need Node.js 24 and a MongoDB database (a free MongoDB Atlas cluster works).

### 1. Get the code

```
git clone https://github.com/sindhu-dev02/Firmflow.git
cd Firmflow
```

### 2. Start the server

```
cd server
npm install
copy .env.example .env
```

(On Mac or Linux use `cp` instead of `copy`.) Open `server/.env` and fill in at least:

| Setting | Meaning |
| --- | --- |
| `MONGO_URI` | Your MongoDB connection string |
| `JWT_ACCESS_SECRET` | A long random text |
| `JWT_REFRESH_SECRET` | A different long random text |
| `CLIENT_URL` | `http://localhost:5173` |

The Razorpay settings are optional. Without them the app runs fine, and only paid checkout is switched off.

Then load the plans and start the server:

```
npx tsx src/scripts/seedPlans.ts
npm run dev
```

The API runs at http://localhost:5000.

### 3. Start the client

In a second terminal:

```
cd client
npm install
copy .env.example .env
npm run dev
```

`client/.env` should contain `VITE_API_URL=http://localhost:5000/api`. Open http://localhost:5173 and register your first firm.

> Never commit your `.env` files or paste real passwords or keys in chats or issues. If a secret is ever exposed, change it straight away.

## Useful commands

| Where | Command | What it does |
| --- | --- | --- |
| `server` | `npm run dev` | Start the API with auto-restart |
| `server` | `npm run build` | Check and compile the TypeScript |
| `server` | `npm test` | Run all server tests |
| `client` | `npm run dev` | Start the app |
| `client` | `npm run build` | Check types and build for production |
| `client` | `npm run lint` | Run the linter |

## API overview

All routes start with `/api`. Everything except login, register and the Razorpay webhook needs a signed-in user, and data is always limited to the user's own firm.

| Route | Purpose |
| --- | --- |
| `/auth` | Register, log in, refresh, log out, change password |
| `/organizations` | Create the firm, dashboard numbers |
| `/users` | Team, customers, invite, edit, deactivate, delete, profile |
| `/products`, `/categories` | Catalog (products support `search`, `page`, `limit`) |
| `/orders` | Create, list (`status`, `page`, `limit`), change status |
| `/addresses` | Customer addresses |
| `/plans`, `/subscriptions`, `/invoices` | Billing |
| `/activity-logs` | Owner-only activity history |
| `/webhooks` | Razorpay events |

## Roadmap

Not built yet:

- Email verification and real email invites, with forgot and reset password
- Docker setup
- Error tracking with Sentry
- API documentation (Swagger)
- Razorpay live payments (test mode only for now)
- Several firms per account
- Order details side panel