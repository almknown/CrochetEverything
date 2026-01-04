# NGine 🚀

**Production-ready Next.js starter template for building SaaS applications with $0 infrastructure costs.**

Built for hobby developers, students, and indie hackers who want to ship fast without spending money during the testing phase.

---

## ⚡ Stack Overview

| Layer | Technology | Free Tier |
|-------|------------|-----------|
| **Framework** | Next.js 14+ (App Router) | ✅ Unlimited |
| **Hosting** | Vercel Hobby | ✅ Unlimited deploys |
| **Auth** | Clerk | ✅ 10,000 MAU |
| **Database** | Neon PostgreSQL + Drizzle ORM | ✅ 0.5 GB |
| **Payments** | Stripe / Lemon Squeezy | ✅ Test mode |
| **UI** | Shadcn/ui + Tailwind CSS | ✅ Open source |
| **Validation** | Zod | ✅ Open source |

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/almknown/NGine.git my-app
cd my-app
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

1. **Clerk** → [dashboard.clerk.com](https://dashboard.clerk.com)
2. **Neon** → [console.neon.tech](https://console.neon.tech)
3. **Stripe** (optional) → [dashboard.stripe.com](https://dashboard.stripe.com)

### 3. Set Up Database

```bash
# Push schema to database (development)
npm run db:push

# Or generate and run migrations (production)
npm run db:generate
npm run db:migrate
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx    # Clerk sign-in
│   │   └── sign-up/[[...sign-up]]/page.tsx    # Clerk sign-up
│   ├── api/
│   │   └── webhooks/
│   │       ├── stripe/route.ts                 # Stripe webhooks
│   │       └── lemonsqueezy/route.ts           # Lemon Squeezy webhooks
│   ├── layout.tsx                              # Root layout with providers
│   └── page.tsx                                # Landing page
├── components/
│   └── ui/                                     # Shadcn components
├── lib/
│   ├── config/
│   │   └── url.ts                              # URL utilities
│   ├── db/
│   │   ├── index.ts                            # Database connection
│   │   └── schema.ts                           # Drizzle schema
│   ├── utils.ts                                # General utilities
│   └── validators/
│       └── webhook.ts                          # Zod schemas
└── middleware.ts                               # Clerk auth middleware
```

---

## 🔐 Authentication (Clerk)

### Protected Routes

Edit `middleware.ts` to protect additional routes:

```typescript
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/settings(.*)',
  '/api/user(.*)',
  // Add your routes here
]);
```

### Get Current User

```typescript
import { currentUser } from '@clerk/nextjs/server';

export default async function Page() {
  const user = await currentUser();
  return <div>Hello, {user?.firstName}!</div>;
}
```

### Alternatives to Clerk

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| [NextAuth.js](https://next-auth.js.org) | Unlimited (self-hosted) | More control, more setup |
| [Supabase Auth](https://supabase.com/auth) | 50,000 MAU | Includes database |
| [Lucia](https://lucia-auth.com) | Unlimited (self-hosted) | Lightweight, flexible |
| [Kinde](https://kinde.com) | 7,500 MAU | Similar DX to Clerk |

---

## 🗄️ Database (Drizzle + Neon)

### Schema Location

Edit `src/lib/db/schema.ts` to add tables:

```typescript
export const posts = pgTable('posts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  userId: text('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Common Commands

```bash
npm run db:generate   # Generate migration files
npm run db:migrate    # Apply migrations
npm run db:push      # Push schema directly (dev only)
npm run db:studio    # Open Drizzle Studio GUI
```

### Query Examples

```typescript
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Select
const user = await db.query.users.findFirst({
  where: eq(users.id, 'user_123'),
});

// Insert
await db.insert(users).values({ id: 'user_123', email: 'test@example.com' });

// Update
await db.update(users).set({ firstName: 'John' }).where(eq(users.id, 'user_123'));
```

### Alternatives to Neon + Drizzle

| Database | ORM | Free Tier | Notes |
|----------|-----|-----------|-------|
| [Supabase](https://supabase.com) | Prisma/Drizzle | 500 MB | Includes auth, storage, realtime |
| [PlanetScale](https://planetscale.com) | Prisma/Drizzle | 5 GB | MySQL, great branching |
| [Turso](https://turso.tech) | Drizzle | 9 GB | SQLite at the edge |
| [Railway](https://railway.app) | Any | $5/month credits | PostgreSQL, easy deploy |

---

## 💳 Payments

### Stripe Setup

1. Create products/prices in [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. Set up webhook endpoint:
   - URL: `https://your-app.vercel.app/api/webhooks/stripe`
   - Events: `customer.subscription.*`, `checkout.session.completed`
3. Add `STRIPE_WEBHOOK_SECRET` to environment

### Lemon Squeezy Setup

1. Create store at [Lemon Squeezy](https://lemonsqueezy.com)
2. Set up webhook:
   - URL: `https://your-app.vercel.app/api/webhooks/lemonsqueezy`
   - Events: `subscription_*`
3. Add `LEMONSQUEEZY_WEBHOOK_SECRET` to environment

### Creating Checkout Sessions

```typescript
// Stripe
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  payment_method_types: ['card'],
  line_items: [{ price: 'price_xxx', quantity: 1 }],
  success_url: `${baseUrl}/success`,
  cancel_url: `${baseUrl}/cancel`,
  metadata: { userId: user.id },
});
```

### Alternatives

| Provider | Fee | Best For |
|----------|-----|----------|
| [Stripe](https://stripe.com) | 2.9% + $0.30 | General payments |
| [Lemon Squeezy](https://lemonsqueezy.com) | 5% + $0.50 | Digital products, handles taxes |
| [Paddle](https://paddle.com) | 5% + $0.50 | SaaS, merchant of record |
| [Gumroad](https://gumroad.com) | 10% | Simple digital sales |

---

## 🌐 Domain Strategy

### Development

Uses `http://localhost:3000` automatically.

### Vercel Preview/Production

Automatically uses `https://your-project.vercel.app` via `VERCEL_URL`.

### Custom Domain

When ready for production:

1. Add domain in Vercel dashboard
2. Set `CUSTOM_DOMAIN=your-domain.com` in Vercel Environment Variables
3. Update Clerk allowed origins

---

## 📦 Adding Features

### Email (Resend)

```bash
npm install resend
```

```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'you@your-domain.com',
  to: 'user@example.com',
  subject: 'Hello!',
  html: '<p>Welcome!</p>',
});
```

### Analytics (PostHog)

```bash
npm install posthog-js
```

```typescript
// In client component
import posthog from 'posthog-js';
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: 'https://app.posthog.com',
});
```

### File Uploads (Uploadthing)

```bash
npm install uploadthing @uploadthing/react
```

See [Uploadthing docs](https://docs.uploadthing.com/getting-started/appdir) for setup.

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy!

### Environment Variables for Vercel

Copy all variables from `.env.example` to Vercel's Environment Variables section, replacing with production values.

---

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Drizzle Documentation](https://orm.drizzle.team)
- [Neon Documentation](https://neon.tech/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Shadcn/ui Components](https://ui.shadcn.com)

---

## 📄 License

MIT - Use freely for personal and commercial projects.

---

**Built with ❤️ for indie hackers and hobbyist developers.**
