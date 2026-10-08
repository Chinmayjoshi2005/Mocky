# Mocky Frontend

Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 frontend for Mocky, an AI-powered mock technical interview platform.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
# Get these from: Supabase Dashboard > Settings > API

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   │   ├── signup/        # Sign up page
│   │   ├── login/         # Login page
│   │   ├── forgot-password/ # Password reset request
│   │   └── callback/      # Email verification callback
│   ├── dashboard/         # Protected account and interview dashboard
│   ├── progress/          # Practice history, progress, and personal goals
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page (redirects based on auth)
│   └── globals.css        # Global styles + design tokens
├── components/
│   └── ui/                # Reusable design system components
│       ├── button.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── card.tsx
│       ├── logo.tsx
│       └── index.ts
├── hooks/
│   ├── useAuth.ts         # Auth actions (sign up, login, logout, reset)
│   ├── useUser.ts         # Current user session
│   └── index.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts      # Browser Supabase client
│   │   └── server.ts      # Server Supabase client (for RSC/middleware)
│   └── utils.ts           # cn() classname utility
├── middleware.ts          # Route protection middleware
└── types/
    └── auth.ts            # TypeScript types for auth
```

## Features Implemented

- **Sign Up** - Email/password with client-side validation, password strength requirements
- **Log In** - Email/password with remember me, password visibility toggle
- **Forgot Password** - Email-based password reset flow
- **Protected Dashboard** - Account management and interview intake
- **Interview Preparation** - Resume/JD intake, personalised questions, and text practice with AI feedback
- **Voice Answer Input** - Record spoken answers and transcribe them for evaluation
- **Progress** - Practice history, score summaries, and improvement goals
- **Route Protection** - Middleware redirects unauthenticated users
- **Session Persistence** - Supabase SSR cookies
- **Accessibility** - Labels, focus states, ARIA attributes, keyboard navigation

## Design System

- **Colors**: Deep navy/charcoal base, soft off-white surfaces, electric-blue accent
- **Typography**: Inter font
- **Components**: Button, Input, Label, Card, Logo
- **Animations**: Subtle fade/slide transitions (respects prefers-reduced-motion)
- **Icons**: Lucide React only

## Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npx tsc --noEmit   # TypeScript compiler check
```