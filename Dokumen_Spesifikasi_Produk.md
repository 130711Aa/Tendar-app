# Dokumen Spesifikasi Produk (PRD) - Tendar SaaS

## 1. Gambaran Umum Produk
**Tendar** adalah platform *Software-as-a-Service* (SaaS)* multi-tenant yang dibangun khusus untuk bisnis Food & Beverage (F&B) di Indonesia. Platform ini menyediakan solusi *all-in-one* bagi pemilik usaha untuk mengelola menu digital, memproses pesanan pelanggan secara online, menjalankan sistem *Point of Sale* (POS) yang terintegrasi untuk penjualan di tempat, dan mengelola inventaris secara mulus. 

Tendar merupakan evolusi dari aplikasi *single-tenant* menjadi platform *multi-tenant* yang *scalable*.

### 1.1 Target Pengguna
- **Usaha Mikro, Kecil, dan Menengah (UMKM)** di sektor F&B, seperti kedai kopi, kedai jus, restoran kecil, hingga pedagang kaki lima (*street food*).
- **Pemilik Usaha** yang membutuhkan sistem terpusat dan hemat biaya untuk mendigitalkan operasi bisnis mereka tanpa harus menginstal perangkat keras khusus atau aplikasi *native* pada perangkat.

### 1.2 Nilai Jual (Value Proposition)
- **Dasbor All-in-One:** Menyediakan mulai dari tautan pemesanan online (*online order*) hingga sistem kasir (POS) dan manajemen inventaris.
- **Tanpa Instalasi Aplikasi Tambahan:** Bisa diakses menggunakan web browser pada perangkat apa pun (desain web responsif). Mendukung tablet, laptop, hingga ponsel pintar (*smartphone*).
- **Model Berlangganan yang Terjangkau:** Struktur pembayaran mulai dari gratis (*freemium*) hingga fitur *Pro* tingkat lanjut.

---

## 2. Fitur & Modul Utama

### 2.1 Arsitektur Multi-Tenant
- Setiap toko yang terdaftar (disebut *tenant*) akan mendapatkan URL khusus/unik (`https://tendar-app.vercel.app/:slug`).
- Pelanggan yang mengakses URL tersebut akan langsung melihat menu digital khusus milik toko itu saja.
- Data terisolasi sepenuhnya melalui *Row Level Security* (RLS) PostgreSQL. Satu *tenant* tidak bisa mengakses data *tenant* lain.

### 2.2 Antarmuka Pelanggan (Menu Digital & Pemesanan Online)
- **Katalog Menu:** Pelanggan dapat melihat daftar produk, kategori, harga, dan foto produk secara langsung.
- **Keranjang Belanja & Checkout:** Pelanggan dapat menambahkan item ke keranjang belanja, meninjau pesanan, dan mengirimkannya langsung ke kasir atau dapur.
- **Pemesanan Mandiri (Self-Ordering):** Pelanggan dapat melakukan *scan* QR code di meja untuk memesan tanpa bantuan pelayan.

### 2.3 Mode Point of Sale (POS) (`/:slug/pos`)
- **Antarmuka Kasir:** Antarmuka khusus untuk kasir (UI yang responsif dan cepat) untuk melayani pembeli langsung di tempat (*walk-in customers*).
- **Integrasi Printer Bluetooth:** Dapat mencetak struk secara termal langsung dari *web browser* (menggunakan `PrinterContext`).
- **Sinkronisasi Real-Time:** Pesanan yang dibuat di POS langsung tersinkronisasi dan memengaruhi inventaris terpusat seketika itu juga.

### 2.4 Dasbor Admin (`/:slug/admin`)
- **Manajemen Pesanan:** Melihat dan memperbarui status pesanan (*pending, processing, paid, completed, cancelled*) secara *real-time*.
- **Manajemen Menu & Kategori:** Membuat, mengubah, dan menghapus produk serta kategorinya; mengelola ketersediaan, serta mengunggah gambar produk.
- **Manajemen Status Toko:** Mengubah status toko menjadi *open* atau *closed*. Jika toko ditutup, pelanggan tidak bisa *checkout*.
- **Manajemen Inventaris:**
  - Melacak stok bahan baku.
  - Konfigurasi *Bill of Materials* (BoM) yang memetakan bahan baku ke produk akhir.
  - Pengurangan otomatis jumlah inventaris setelah terjadi penjualan atau pesanan selesai.
- **Analitik & Riwayat:** Laporan penjualan, performa bisnis, serta kemampuan mengekspor data historis (misal via Excel).

### 2.5 Berlangganan & Pembayaran Tagihan SaaS (Via Midtrans)
- **Tingkatan Paket (Pricing Tiers):**
  - **Free (Rp 0/bulan):** Menu digital, maksimal pesanan/produk (mis. 10 produk), fitur pemesanan dasar.
  - **Starter (Rp 25.000/bulan):** Maks 30 produk, gambar produk, dsb.
  - **Business (Rp 50.000/bulan):** Produk tak terbatas, dukungan *fitur POS*, analitik penuh, kontrol inventaris, printer.
  - **Pro (Rp 100.000/bulan):** Semua fitur Business + ekspor ke Excel, multi-kasir, dan dukungan prioritas, serta integrasi manajemen bahan baku (BoM).
- **Payment Gateway Langganan:** Terintegrasi sepenuhnya dengan Midtrans (Snap JS) untuk peningkatan paket otomatis melalui *Supabase Edge Functions*. Pelanggan sistem Tendar (Merchant) yang membayar ke Tendar menggunakan Midtrans.

---

## 3. Teknologi Terapan (Tech Stack)

### 3.1 Antarmuka Pengguna (Frontend)
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS + PostCSS
- **Routing:** React Router v6
- **Manajemen State (State Management):** React Context API (`AuthContext`, `TenantContext`, `CartContext`, dll.)
- **Ikonografi/UI:** Material Symbols, Lucide React
- **Notifikasi/Pop up:** React Hot Toast
- **Pembuatan Grafik:** Recharts (untuk dasbor analitik admin)

### 3.2 Sisi Peladen (Backend) & Basis Data
- **Basis Data:** Supabase (Berdasarkan PostgreSQL)
- **Autentikasi:** Supabase Auth (Email & Kata Sandi)
- **Penyimpanan File:** Supabase Storage (untuk gambar produk & aset)
- **Komputasi Tepi (Edge Functions):** Runtime Deno bawaan Supabase (untuk memproses *payment gateway* Midtrans via Webhook, langganan automasi, dan skrip pekerjaan *background* lainnya).
- **Real-Time Engine:** Menggunakan fitur koneksi WebSocket atau *realtime engine* dari Supabase secara langsung ke *client* agar pesanan masuk memicu pembaruan antarmuka tanpa *refresh* layar.

---

## 4. Keamanan & Arsitektur Sistem
- **Keamanan Isolasi Data (Data Isolation):** Diamankan sangat dalam menggunakan *Supabase Row Level Security* (RLS) berdasarkan `tenant_id`. Setiap tabel kritikal (`products`, `orders`, `categories`, `raw_materials`) memiliki kunci referensi ke tabel `tenants`.
- **Sistem Berbasis Peran (RBAC):** Membedakan peran antara Store Admin, Staff/Cashir, dan Anonym/Customer. Store Admin pada sebuah URL tidak akan bisa masuk/intervensi pada tenant URL lainnya.
- **Keamanan Konfirmasi Midtrans:** Menggunakan rahasia sisi peladen (*Server Secret Keys*) sebagai Edge Function. Variabel rahasia (`MIDTRANS_SERVER_KEY`) tersebut tersembunyi dari peramban client, sehingga penyerang eksternal tidak bisa menyalahgunakannya.

---

## 5. Peta Konsep Pengembangan Masa Depan (Future Roadmap)
1. **Kitchen Display System (KDS):** Layar antarmuka khusus untuk dapur (*kitchen staff*) yang mengatur jalur persinggahan/penyiapan hidangan.
2. **Program Loyalitas (Loyalty Program):** Fitur poin dan hadiah bagi langganan toko/pelanggan *end-user*.
3. **Mendukung Multi-Cabang (Multi-Branch Support):** Fitur untuk mengizinkan sebuah admin pemilik mengontrol berbagai toko fisik hanya melalui satu akun master Tendar. 
4. **Integrasi Vendor Pengantaran Pihak Ketiga:** Endpoint perantara (API Bridge) yang menghubungkan order dari GoFood, GrabFood, serta ShopeeFood untuk tersinkron langsung ke menu kasir Tendar secara sentral.
5. **Kustomisasi Sub-Domain Tendar:** Domain URL yang dapat dimodifikasi/dilekatkan dengan domain bawaan Tendar (Contoh: `kopisenja.tendar.app`).

---
Mengacu ke dokumen desain saat ini, produk ini dioptimalkan bagi pertumbuhan bertahap untuk *cashless flow* dengan skala skalabilitas menengah hingga tinggi, ditujukan pertama murni bagi solusi menu gratis sebelum pemilik naik panggung *(upsell)* pada skema POS dan pelaporan kasir yang berbayar.
