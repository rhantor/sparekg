# 🧳 SpareKG

**Peer-to-Peer Excess Baggage Marketplace**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Backend-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

SpareKG is a two-sided marketplace designed to monetize a structurally underutilized resource: the unused checked-baggage allowance of international travelers. 

By connecting travelers with extra luggage space to individuals needing to send items affordably across borders, SpareKG acts as a trust, discovery, and settlement layer. 

**Initial Launch Corridor:** Kuala Lumpur ↔ Dhaka

---

## 🎯 The Problem & Solution

Travelers frequently fly with 10-20 kg of unused allowance on every trip, which has zero salvage value to the airline or the passenger. Meanwhile, senders face exorbitant courier rates (USD 8-15 per kg) and long delivery windows (5-10 days) on international corridors. 

**SpareKG solves this by providing:**
- A platform for identity verification (KYC).
- Flight and capacity discovery.
- Price mediation through a controlled points-based economy.
- The rails for safe handoff, delivery confirmation, and dispute resolution.

## 👥 User Personas

1. **The Traveler**: Returning students, family visitors, or business travelers with confirmed flight tickets and 5-25 kg of unused checked allowance. They are motivated by side income (typically MYR 200-800 per trip).
2. **The Sender**: Diaspora workers, small e-commerce operators, or individuals sending gifts, documents, and specialty items back home. They are motivated by lower costs and faster delivery compared to traditional couriers.

## 🛠️ Technology Stack

- **Frontend**: Next.js (App Router), React 19
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit & RTK Query
- **Animations**: Framer Motion
- **Backend & Auth**: Firebase (Authentication, Firestore, Cloud Functions, Storage)
- **Deployment**: Vercel (Frontend), Firebase (Backend)

## 🏗️ Architecture

The architecture relies heavily on **Firebase Cloud Functions** as the trusted compute layer, enforcing state transitions and economy mutations securely on the server. **Firestore Security Rules** provide robust authorization at the database level.

### Key State Machines
- **Flights**: `DRAFT` ➔ `LIVE` ➔ `LOCKED` ➔ `IN_TRANSIT` ➔ `COMPLETED`
- **Bids**: `PENDING` ➔ `AGREED` ➔ `HANDED_OVER` ➔ `DELIVERED` 

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- A Firebase Project (with Authentication, Firestore, and Storage enabled)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/sparekg.git
   cd sparekg
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   FIREBASE_SERVICE_ACCOUNT_KEY={"type": "service_account", ... }
   ```

4. **Deploy Firestore Rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

5. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🔒 Trust & Security (KYC)

Safety is the foundation of SpareKG. All users must pass a rigorous KYC pipeline before executing transactions:
- Upload of Government ID (Front & Back).
- In-app live selfie capture (rejecting static gallery uploads).
- Manual and automated verification queues.
- Strict Prohibited Goods Policies enforced at the listing level.

## 🗺️ Roadmap / Phases

- [x] **Phase 0:** Foundation (Repo setup, Firebase environment, Auth configuration)
- [ ] **Phase 1:** KYC + Trust (Identity submission, moderation queues)
- [ ] **Phase 2:** Core Marketplace (Flight posting, Bid discovery)
- [ ] **Phase 3:** Points Economy (Ledger, urgency boosts, payment integration)
- [ ] **Phase 4:** Transactions & Settlement (Handoffs, payouts, reviews)
- [ ] **Phase 5:** Polish & Soft Launch (Onboarding, localization, live beta)

## 📄 License

This project is proprietary and confidential. Unauthorized copying of this file, via any medium, is strictly prohibited.
