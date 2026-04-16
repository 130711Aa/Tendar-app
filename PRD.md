# Product Requirements Document (PRD) - Tendar SaaS

## 1. Product Overview
**Tendar** is a multi-tenant Software-as-a-Service (SaaS) platform built specifically for Food & Beverage (F&B) businesses in Indonesia. It provides an all-in-one solution for store owners to manage their digital menus, process customer online orders, run an integrated Point of Sale (POS) system for on-premise sales, and manage their inventory seamlessly.

### 1.1 Target Audience
- Small and Medium Enterprises (SMEs) in the F&B sector (Coffee shops, juice bars, restaurants, street food vendors).
- Store owners who need a cost-effective, centralized system to digitize operations without installing physical hardware or native apps.

### 1.2 Value Proposition
- **All-in-One Dashboard:** From online ordering link to POS and inventory.
- **No Native App Required:** Accessible via web browser on any device (Responsive web design).
- **Affordable Subscription Model:** Freemium structure up to advanced Pro features.

---

## 2. Core Features & Moduls

### 2.1 Multi-Tenant Architecture
- Every registered store (tenant) gets a unique URL slug (`tendar.vercel.app/:slug`).
- Customers entering the URL immediately see the store's digital menu.
- Full data isolation via PostgreSQL Row Level Security (RLS). A tenant cannot access another tenant's data.

### 2.2 Customer Interface (Online Menu & Ordering)
- **Menu Catalog:** View product lists, categories, prices, and photos.
- **Add to Cart & Checkout:** Customers can add items to their cart, review the order, and submit it directly to the kitchen/cashier.
- **Customer Profiles:** Simple profile tracking for repeat customers.

### 2.3 Point of Sale (POS) Mode (`/:slug/pos`)
- **Cashier Interface:** A dedicated, fast-response UI optimized for cashiers to punch in orders from walk-in customers.
- **Bluetooth Printer Integration:** Print thermal receipts directly from the web browser (`PrinterContext`).
- **Real-Time Synchronization:** Orders made in POS affect centralized inventory immediately.

### 2.4 Admin Dashboard (`/:slug/admin`)
- **Order Management:** View and update order statuses (pending, processing, completed) in real-time.
- **Menu & Category Management:** Create, edit, delete products and their respective categories. Upload product images.
- **Inventory Management:**
  - Track raw materials (stok bahan).
  - Bill of Materials (BoM) configuration mapping final products to raw ingredients.
  - Automatic inventory deduction upon completed sales.
- **Analytics & History:** Sales reports, performance metrics, and historical data exports.

### 2.5 SaaS Billing & Subscription
- **Pricing Tiers:**
  - **Free:** Up to 20 products, basic ordering, basic reports.
  - **Basic (Rp99.000/mo):** Unlimited products, POS mode, full analytics, inventory control.
  - **Pro (Rp199.000/mo):** All Basic features + Excel export, multi-cashier, priority support.
- **Payment Gateway:** Fully integrated with Midtrans (Snap JS) for automatic subscription upgrades using Supabase Edge Functions.

---

## 3. Technology Stack

### 3.1 Frontend
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS + PostCSS
- **Routing:** React Router v6
- **State Management:** React Context API (AuthContext, TenantContext, CartContext, etc.)
- **Icons/UI:** Material Symbols, Lucide React
- **Toast Notifications:** React Hot Toast
- **Charting:** Recharts (for Analytics)

### 3.2 Backend & Data
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (Email & Password)
- **File Storage:** Supabase Storage (for product images & payment proofs)
- **Edge Functions:** Deno runtime natively on Supabase (used for Midtrans payment and background jobs).

---

## 4. Architecture & Security
- **Data Isolation:** Enforced deeply using Supabase Row Level Security (RLS) policies based on `tenant_id`. Every table (`products`, `orders`, `categories`, `raw_materials`) includes a Reference Key to the `tenants` table.
- **Role-Based Access Control (RBAC):** Built-in distinction between Store Admin, Staff/Cashier, and Anonymous Customer.
- **Payment Security:** Secret Server Keys are securely stored and invoked only via backend Edge Functions, preventing exposure on the frontend client.

---

## 5. Future Roadmap
1. **Kitchen Display System (KDS):** A separated screen dedicated solely for kitchen staff to prepare incoming orders.
2. **Loyalty Program:** Points and rewards integration for customers.
3. **Multi-Branch Support:** Allowing a single owner to manage multiple outlets under one master account.
4. **Third-Party Delivery Integration:** API hooking into GrabFood, GoFood, or ShopeeFood.
