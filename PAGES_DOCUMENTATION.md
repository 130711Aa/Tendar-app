# 📄 Dokumentasi Halaman — Tendar App

> Platform SaaS manajemen bisnis F&B (Food & Beverage) untuk UMKM Indonesia.
> Dibangun dengan React + Vite, backend Supabase, styling Tailwind CSS.

---

## Arsitektur Routing

```
/                          → LandingPage
/register                  → RegisterTenantPage
/auth/callback             → AuthCallbackPage

/:slug/                    → MenuPage          (Customer)
/:slug/auth                → AuthPage          (Customer/Staff login)
/:slug/orders              → CustomerOrdersPage
/:slug/profile             → ProfilePage

/:slug/admin               → AdminDashboard    (🔒 Admin only)
/:slug/admin/orders        → OrdersPage        (🔒 Admin + Staff)
/:slug/admin/menu          → MenuManagement    (🔒 Admin only)
/:slug/admin/categories    → CategoriesPage    (🔒 Admin only)
/:slug/admin/inventory     → InventoryPage     (🔒 Admin + Staff)
/:slug/admin/history       → HistoryPage       (🔒 Admin only)
/:slug/admin/analytics     → AnalyticsPage     (🔒 Admin only)
/:slug/admin/billing       → BillingPage       (🔒 Admin only)
/:slug/admin/staff         → StaffManagement   (🔒 Admin only)
/:slug/admin/share         → ShareLinkPage     (🔒 Admin only)

/:slug/pos                 → POSPage           (🔒 Admin + Staff)
```

---

## 🌐 Halaman Publik (Global)

---

### 1. `LandingPage`
**Route:** `/`  
**File:** `src/pages/LandingPage.jsx`  
**Access:** Public (semua pengguna)

#### Deskripsi
Halaman utama marketing Tendar. Menampilkan value proposition, fitur-fitur platform, daftar harga (pricing), dan CTA untuk mendaftar.

#### Fitur Utama
- **Navbar sticky** dengan tombol *Masuk* dan *Daftar Gratis*
- **Login Modal** — form login email/password + Google OAuth  
  - Setelah login: auto-redirect ke `/[slug]/admin` (admin) atau `/[slug]/pos` (staff)
  - Jika sudah login saat refresh halaman: langsung redirect
- **Profile Dropdown** — tampil jika user sudah login, berisi nama, email, dan tombol keluar
- **Hero Section** — headline, deskripsi, tombol *Buka Toko Gratis* & *Lihat Demo*
- **Features Section** — 6 kartu fitur (Menu Digital, Pesanan, POS, Analitik, Stok, Multi-device)
- **Pricing Section** — 4 paket: Free / Starter / Business / Pro
- **CTA Footer** — banner oranye dengan tombol daftar
- **Contact Section** — link WhatsApp CS Tendar
- **Footer** — copyright

#### State / Context
- `useAuth()` — status login, fungsi login/logout
- `supabase` — query `user_roles` & `tenants` untuk redirect

---

### 2. `RegisterTenantPage`
**Route:** `/register`  
**File:** `src/pages/RegisterTenantPage.jsx`  
**Access:** Public

#### Deskripsi
Form pendaftaran toko baru. Pengguna mengisi info akun (nama, email, password) dan info toko (nama toko, slug unik).

#### Fitur Utama
- Form multi-step atau single form registrasi
- Validasi slug unik (tidak boleh duplikat)
- Pembuatan akun Supabase Auth + record tenant baru
- Redirect ke halaman admin setelah berhasil

---

### 3. `AuthCallbackPage`
**Route:** `/auth/callback`  
**File:** `src/pages/AuthCallbackPage.jsx`  
**Access:** Public (dipanggil otomatis oleh Supabase OAuth)

#### Deskripsi
Halaman perantara untuk menyelesaikan OAuth flow (Google login). Menerima token dari Supabase, memvalidasi sesi, lalu redirect ke tujuan sesuai parameter `?next=`.

---

## 🛒 Halaman Customer (Per-Toko)

---

### 4. `MenuPage`
**Route:** `/:slug/` (root toko)  
**File:** `src/pages/MenuPage.jsx`  
**Access:** Public (customer)

#### Deskripsi
Halaman menu digital yang dilihat pelanggan. Menampilkan semua produk toko yang aktif, lengkap dengan filter kategori dan pencarian.

#### Fitur Utama
- **Hero Banner** — gradient oranye dengan nama toko
- **Store Closed Banner** — muncul jika toko sedang tutup (pesanan dinonaktifkan)
- **Search Bar** — filter produk by nama/deskripsi real-time
- **Category Pills** — filter produk by kategori horizontal scrollable
- **Product Grid** — 2 kolom (mobile), 3–4 kolom (desktop), menggunakan `ProductCard`
- **Sticky Cart Bar** — muncul di bawah layar (mobile only) saat ada item di keranjang
- **Loading Skeleton** — animasi skeleton saat data loading

#### State / Context
- `useCategories()` — data kategori
- `useProducts()` — produk yang tersedia (`availableProducts`)
- `useCart()` — jumlah item & total harga keranjang
- `useStoreStatus()` — status buka/tutup toko
- `useTenantContext()` — nama toko

---

### 5. `AuthPage`
**Route:** `/:slug/auth`  
**File:** `src/pages/AuthPage.jsx`  
**Access:** Public (customer/staff login per toko)

#### Deskripsi
Halaman login/register khusus per toko. Customer bisa login untuk tracking pesanan, staff/admin login untuk akses dashboard.

#### Fitur Utama
- Form login email + password
- Google OAuth login
- Form register akun baru (customer)
- Password recovery flow
- Redirect ke halaman yang sesuai setelah login

---

### 6. `CustomerOrdersPage`
**Route:** `/:slug/orders`  
**File:** `src/pages/CustomerOrdersPage.jsx`  
**Access:** Customer (login required)

#### Deskripsi
Halaman riwayat pesanan milik pelanggan yang sedang login. Customer dapat melihat status pesanan mereka.

#### Fitur Utama
- Daftar pesanan customer yang sedang login
- Status pesanan real-time (pending → processing → completed)
- Detail item per pesanan

---

### 7. `ProfilePage`
**Route:** `/:slug/profile`  
**File:** `src/pages/ProfilePage.jsx`  
**Access:** Customer (login required)

#### Deskripsi
Halaman profil pelanggan. Menampilkan data akun dan opsi logout.

#### Fitur Utama
- Tampilan info profil (nama, email)
- Tombol logout

---

## 🛠️ Halaman Admin (Protected)

> Semua halaman admin membutuhkan autentikasi dan role `admin` (kecuali OrdersPage & InventoryPage yang bisa diakses `staff`).
> Navbar admin tersembunyi di mode POS. Sidebar admin tampil di layar `lg` ke atas.

---

### 8. `AdminDashboard`
**Route:** `/:slug/admin`  
**File:** `src/pages/AdminDashboard.jsx`  
**Access:** 🔒 Admin only

#### Deskripsi
Dashboard utama admin. Menyajikan ringkasan performa toko secara real-time berdasarkan data pesanan.

#### Fitur Utama
- **Toggle Buka/Tutup Toko** — kontrol status toko langsung dari header
- **Summary Cards (4 kartu):**
  - Total Pendapatan + pendapatan hari ini
  - Total Pesanan + pesanan hari ini
  - Produk Terlaris
  - Pesanan Perlu Diproses (pending + processing)
- **Line Chart Penjualan 7 Hari** — grafik SVG custom dengan tooltip hover
- **Ringkasan Panel:**
  - Progress bar pesanan selesai
  - Breakdown metode pembayaran (Cash vs QRIS)
  - Jumlah kategori & produk
  - Avatar pesanan aktif
- **Tabel Pesanan Terbaru** — 5 pesanan terakhir dengan kolom ID, pelanggan, items, jumlah, metode bayar, status, waktu

#### State / Context
- `useOrders()` — data semua pesanan
- `useCategories()` — hitungan kategori
- `useProducts()` — hitungan produk
- `useStoreStatus()` — toggle toko
- `useTenantContext()` — nama toko & slug

---

### 9. `OrdersPage`
**Route:** `/:slug/admin/orders`  
**File:** `src/pages/OrdersPage.jsx`  
**Access:** 🔒 Admin + Staff

#### Deskripsi
Halaman manajemen pesanan real-time. Admin/staff melihat, memproses, dan menyelesaikan pesanan yang masuk hari ini.

#### Fitur Utama
- **Filter Tabs** — Semua / Menunggu / Diproses / Selesai (dengan badge jumlah)
- **Badge Notifikasi** — animasi pulse jika ada pesanan pending
- **Koneksi Printer Bluetooth** — tombol hubungkan/putuskan printer thermal ESC/POS
- **Kartu Pesanan Expandable** — klik untuk tampilkan detail:
  - Item pesanan + subtotal
  - Info pelanggan (nama, telepon, alamat, catatan)
  - Metode & bukti pembayaran (dengan preview gambar)
  - Tombol **Proses Pesanan** / **Selesaikan**
  - Tombol **Print** (via Bluetooth) & **Hapus**
- **Proof Modal** — preview fullscreen bukti pembayaran QRIS
- **Hapus Semua** — bulk delete dengan konfirmasi
- Logic khusus: pesanan hanya tampil saat toko **buka** (sesi hari ini)

#### State / Context
- `useOrders()` — pesanan + fungsi update/delete
- `useStoreStatus()` — penentuan sesi hari ini
- `usePrinter()` — Web Bluetooth thermal printer

---

### 10. `MenuManagement`
**Route:** `/:slug/admin/menu`  
**File:** `src/pages/MenuManagement.jsx`  
**Access:** 🔒 Admin only

#### Deskripsi
Halaman kelola menu produk. Admin dapat menambah, mengedit, menghapus produk, serta mengatur status stok.

#### Fitur Utama
- Daftar semua produk dengan filter kategori
- Tambah produk baru (nama, harga, kategori, deskripsi, gambar)
- Edit produk existing
- Toggle aktif/nonaktif stok produk
- Upload foto produk ke Supabase Storage
- Batasan jumlah produk berdasarkan plan (Free: 10, Starter: 30, Business/Pro: unlimited)

---

### 11. `CategoriesPage`
**Route:** `/:slug/admin/categories`  
**File:** `src/pages/CategoriesPage.jsx`  
**Access:** 🔒 Admin only

#### Deskripsi
Halaman manajemen kategori produk. Admin dapat membuat, mengedit, dan menghapus kategori.

#### Fitur Utama
- Daftar kategori aktif
- Form tambah/edit kategori (nama)
- Hapus kategori (dengan validasi jika masih ada produk)

---

### 12. `InventoryPage`
**Route:** `/:slug/admin/inventory`  
**File:** `src/pages/InventoryPage.jsx`  
**Access:** 🔒 Admin + Staff

#### Deskripsi
Halaman manajemen stok bahan baku. Menampilkan status stok dan memungkinkan admin toggling ketersediaan produk.

> ⚠️ Fitur ini terkunci untuk paket Free dan Starter. Membutuhkan paket **Business** atau **Pro**.

#### Fitur Utama
- Daftar produk dengan status stok
- Toggle stok on/off per produk
- (Pro) Manajemen resep (Bill of Materials / BoM)

---

### 13. `HistoryPage`
**Route:** `/:slug/admin/history`  
**File:** `src/pages/HistoryPage.jsx`  
**Access:** 🔒 Admin only

#### Deskripsi
Riwayat semua pesanan yang pernah masuk (tidak terbatas hari ini). Berbeda dengan `OrdersPage` yang hanya menampilkan pesanan sesi aktif.

#### Fitur Utama
- Tabel semua histori pesanan
- Filter by status, tanggal, atau metode pembayaran
- Detail pesanan expandable
- Export data (tergantung plan)

---

### 14. `AnalyticsPage`
**Route:** `/:slug/admin/analytics`  
**File:** `src/pages/AnalyticsPage.jsx`  
**Access:** 🔒 Admin only

> ⚠️ Terkunci untuk paket di bawah **Business**. Halaman terkunci menampilkan CTA upgrade.

#### Deskripsi
Dashboard analitik bisnis lengkap. Data diambil secara paralel dari 6 Supabase views yang dioptimasi.

#### Fitur Utama
- **KPI Cards (4 kartu):**
  - Total Revenue
  - Total Orders
  - Average Order Value (AOV)
  - Forecast Revenue besok (AI prediction)
- **Trend Penjualan** — chart pola penjualan per hari/waktu (`SalesTrendChart`)
- **Matriks Produk** — klasifikasi produk (star/dog/question mark) (`ProductMatrixChart`)
- **Tabel Performa Produk** — ranking produk by revenue & quantity (`ProductPerformanceTable`)
- **Pelanggan Loyal** — list pelanggan repeat order (`CustomerTable`)
- **Export & Reset:**
  - Export ke Excel (multi-sheet: Summary, Product Performance, Sales Trend, All Transactions)
  - Reset database (hapus semua pesanan) dengan konfirmasi modal
- **Print / PDF** — `window.print()` untuk cetak laporan

#### Supabase Views yang Digunakan
| View | Deskripsi |
|------|-----------|
| `view_analytics_summary` | Total revenue, orders, AOV |
| `view_analytics_product_performance` | Performa per produk |
| `view_analytics_product_matrix` | Klasifikasi BCG matrix |
| `view_analytics_sales_time` | Tren penjualan per waktu |
| `view_analytics_customer_insights` | Data pelanggan loyal |
| `view_analytics_forecast` | Prediksi penjualan besok |

---

### 15. `BillingPage`
**Route:** `/:slug/admin/billing`  
**File:** `src/pages/BillingPage.jsx`  
**Access:** 🔒 Admin only

#### Deskripsi
Halaman manajemen langganan dan pembayaran. Admin dapat melihat paket aktif, sisa waktu berlangganan, dan upgrade ke paket lebih tinggi via QRIS.

#### Paket Tersedia
| Paket | Harga | Fitur Utama |
|-------|-------|-------------|
| **Free** | Gratis | 10 produk, 1 staff, Online Menu |
| **Starter** | Rp25.000/bln | 30 produk, Kategori & Gambar |
| **Business** | Rp50.000/bln | Unlimited produk, 2 staff, POS, Analytics, Export CSV |
| **Pro** | Rp100.000/bln | Resep/BoM, staff unlimited, Export Excel, Priority Support |

#### Fitur Utama
- **Status Badge** paket aktif + timer sisa masa berlangganan
- **Progress Bar Durasi** langganan (hijau → amber → merah sesuai sisa hari)
- **Alert Expired / Hampir Expired** (≤7 hari)
- **Kartu Pilih Paket** — highlight paket aktif, badge "PAKET AKTIF"
- **Flow Pembayaran QRIS:**
  1. Klik "Bayar via QRIS" → buat invoice (dengan *unique code* 3 digit untuk verifikasi otomatis)
  2. **QRIS Modal** tampil: QR code + countdown timer invoice (berlaku terbatas)
  3. User scan QR & transfer nominal persis (termasuk kode unik)
  4. Upload screenshot bukti pembayaran (JPG/PNG/WebP, max 5MB, drag & drop)
  5. Verifikasi otomatis via **Google Cloud Vision OCR** (Supabase Edge Function)
  6. Status: `valid` → langganan aktif | `review_needed` → manual review 1×24 jam | `rejected` → upload ulang
- **Panduan 4 Langkah** cara pembayaran QRIS
- **Downgrade** hanya via CS (tidak bisa self-service)

#### State / Context
- `useTenantContext()` — `tenantId`, `tenantName`, `tenantPlan`
- `supabase` — query `tenants.plan_expires_at`
- `billing.js` — `createInvoice()`, `getActiveInvoice()`, `uploadReceiptAndProcess()`

---

### 16. `StaffManagement`
**Route:** `/:slug/admin/staff`  
**File:** `src/pages/StaffManagement.jsx`  
**Access:** 🔒 Admin only

#### Deskripsi
Halaman kelola akun staff toko. Admin dapat menambahkan staff baru dan mengelola akses mereka.

#### Fitur Utama
- Daftar staff aktif dengan role
- Invite staff baru via email
- Hapus akses staff
- Batasan jumlah staff berdasarkan plan (Free: 1, Business: 2, Pro: unlimited)

---

### 17. `ShareLinkPage`
**Route:** `/:slug/admin/share`  
**File:** `src/pages/ShareLinkPage.jsx`  
**Access:** 🔒 Admin only

#### Deskripsi
Halaman untuk membagikan link toko kepada pelanggan. Menyediakan berbagai format berbagi dan QR code menu digital.

#### Fitur Utama
- Tampilkan URL menu digital toko (`/:slug/`)
- Generate QR Code URL toko
- Share link via platform (WhatsApp, dll.)
- Copy to clipboard

---

## 🖥️ Halaman POS (Point of Sale)

---

### 18. `POSPage`
**Route:** `/:slug/pos`  
**File:** `src/pages/POSPage.jsx`  
**Access:** 🔒 Admin + Staff

> ⚠️ Terkunci untuk paket **Free** dan **Starter**. Membutuhkan paket **Business** atau **Pro**.

#### Deskripsi
Antarmuka kasir (Point of Sale) yang dioptimasi untuk transaksi langsung di tempat. Layout split 60/40 (produk / cart & pembayaran). Tidak menampilkan Navbar standar — fullscreen dedicated mode.

#### Fitur Utama

**Panel Kiri (60%) — Product Browsing:**
- Search bar dengan auto-focus (keyboard-first UX)
- Filter kategori horizontal scrollable
- Product grid (3–5 kolom tergantung layar)
- Kartu produk clickable — klik langsung tambah ke cart
- Badge jumlah item di kartu jika sudah di cart
- Produk habis tampil greyscale + badge "HABIS" (tidak bisa diklik)

**Panel Kanan (40%) — Cart & Payment:**
- **Cart Header:** jumlah item, tombol Kosongkan, status koneksi printer Bluetooth
- **Cart Items** — komponen `SwipeableCartItem`:
  - Swipe kanan (touch/mouse) untuk hapus item
  - +/- button untuk atur kuantitas
  - Subtotal per item
- **Input Nama Pelanggan** (opsional, default: "Walk-in Customer")
- **Catatan Pesanan** (textarea)
- **Price Summary** — subtotal + total
- **Metode Pembayaran:**
  - **Tunai (Cash):** input nominal uang, kalkulasi kembalian real-time, validasi nominal cukup
  - **QRIS:** 2 langkah (klik 1: tampil QR code → klik 2: konfirmasi pembayaran)
- **Tombol Bayar / Konfirmasi** — disabled jika validasi belum terpenuhi
- Auto-print struk via **Web Bluetooth** setelah transaksi berhasil
- Reset form otomatis setelah transaksi, kursor kembali ke search

#### State / Context
- `useProducts()` — daftar produk
- `useCategories()` — filter kategori
- `useOrders()` — `addOrder()`
- `useAuth()` — info user kasir
- `usePrinter()` — Web Bluetooth printer
- `useTenantContext()` — nama toko, slug, `planLimits.posEnabled`
- Local state: `cart`, `paymentMethod`, `cashPaidAmount`, `customerName`, dll.

---

## ⚙️ Komponen Pendukung (Non-Page)

| Komponen | Deskripsi |
|----------|-----------|
| `Navbar` | Navigasi global (customer + sidebar admin) |
| `CartDrawer` | Drawer keranjang belanja (customer side) |
| `CheckoutModal` | Modal checkout + form data pelanggan |
| `ProtectedRoute` | Guard route berdasarkan role (`admin`/`staff`) |
| `ErrorBoundary` | Fallback UI jika ada unhandled error |
| `ProductCard` | Kartu produk untuk MenuPage |
| `PrintNota` | Template struk cetak |
| `VerificationCriteriaModal` | Modal info kriteria verifikasi pembayaran |

---

## 🗂️ Konteks Global (Context Providers)

| Context | Data yang Disediakan |
|---------|---------------------|
| `AuthContext` | `user`, `isAuthenticated`, `isAdmin`, `login`, `logout`, `loginWithGoogle` |
| `TenantContext` | `tenantId`, `tenantName`, `slug`, `tenantPlan`, `planLimits` |
| `OrdersContext` | `orders`, `addOrder`, `updateOrderStatus`, `deleteOrder`, `clearAllOrders` |
| `ProductsContext` | `products`, `availableProducts` |
| `CategoriesContext` | `categories`, `filterCategories` |
| `CartContext` | `cart`, `totalItems`, `totalPrice`, `setIsOpen` |
| `StoreStatusContext` | `isStoreOpen`, `toggleStore` |
| `PrinterContext` | `btConnected`, `handleConnectPrinter`, `handleDirectPrint` |

---

## 🔒 Sistem Plan & Pembatasan Fitur

| Fitur | Free | Starter | Business | Pro |
|-------|------|---------|----------|-----|
| Jumlah Produk | 10 | 30 | ∞ | ∞ |
| Staff | 1 | 1 | 2 | ∞ |
| POS (Kasir) | ❌ | ❌ | ✅ | ✅ |
| Analytics | ❌ | ❌ | ✅ | ✅ |
| Inventory | ❌ | ❌ | ✅ | ✅ |
| Export CSV | ❌ | ❌ | ✅ | ✅ |
| Export Excel | ❌ | ❌ | ❌ | ✅ |
| Resep / BoM | ❌ | ❌ | ❌ | ✅ |

> Cek `planLimits` dari `TenantContext` untuk nilai aktual per tenant.

---

*Dokumentasi ini di-generate dari kode sumber pada: April 2026*
