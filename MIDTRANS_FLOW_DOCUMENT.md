# Dokumen Alur Transaksi End-to-End Tendar

**Nama Aplikasi:** Tendar  
**Jenis Layanan:** SaaS Platform Digital Menu & Point of Sale (POS) untuk UMKM
**Tanggal:** April 2026

---

## Gambaran Umum

**Tendar** adalah platform SaaS yang memungkinkan pelaku usaha (tenant/merchant) untuk membuat **menu digital berbasis QR Code** dan mengelola transaksi penjualan secara online maupun offline melalui fitur **Point of Sale (POS)**.

**Midtrans digunakan secara eksklusif untuk pemrosesan pembayaran biaya berlangganan (subscription) paket SaaS oleh pemilik usaha (merchant/tenant).** Transaksi antara merchant dengan pelanggan akhirnya (customer order) tidak melalui Midtrans.

---

## Konteks: Siapa yang Menggunakan Tendar?

| Pihak | Peran | Hubungan dengan Midtrans |
|---|---|---|
| **Tenant / Merchant** | Pemilik usaha yang berlangganan Tendar | **Pembayar subscription** — menggunakan Midtrans |
| **Customer / Pelanggan** | Pelanggan akhir dari merchant | Tidak terlibat dengan Midtrans |

---

## Alur Lengkap: Dari Merchant Berlangganan hingga Customer Memesan

### FASE 1 — Merchant Mendaftar & Berlangganan Tendar (via Midtrans)

> Ini adalah alur di mana Midtrans terlibat.

#### Langkah 1 — Merchant Mendaftar Akun Tendar

- Pemilik usaha mengunjungi `https://tendar-app.netlify.app` dan mendaftarkan akun
- Merchant mengisi informasi toko (nama, slug/URL toko)
- Akun dibuat dengan paket **Free** secara default
- **Pada paket Free, merchant sudah bisa langsung menggunakan menu digital** dengan batasan maksimal 10 produk

---

#### Langkah 2 — Merchant Memilih Paket Berlangganan

- Merchant masuk ke dashboard admin: `https://tendar-app.netlify.app/admin`
- Navigasi ke halaman **"Pilih Paket"** (`/pricing`)
- Tersedia 4 pilihan paket:

| Paket    | Harga/Bulan | Fitur Utama                          |
|----------|-------------|--------------------------------------|
| Free     | Rp 0        | Menu digital, maks 10 produk         |
| Starter  | Rp 25.000   | Maks 30 produk, gambar produk        |
| Business | Rp 50.000   | POS, inventory, analytics, printer   |
| Pro      | Rp 100.000  | Semua fitur + BoM, export Excel      |

- Merchant memilih paket yang sesuai kebutuhan
- Klik tombol **"Pilih Paket"** atau **"Upgrade Sekarang"**

---

#### Langkah 3 — Sistem Membuat Transaksi di Midtrans

- Frontend Tendar memanggil **Supabase Edge Function**
- Edge function memproses permintaan dan memanggil **Midtrans API** untuk membuat transaksi baru
- Midtrans merespons dengan **Snap Token**
- Frontend menampilkan **Midtrans Snap Popup** kepada merchant

---

#### Langkah 4 — Merchant Melakukan Pembayaran via Midtrans

- Merchant memilih metode pembayaran yang tersedia di Midtrans Snap:
  - Transfer Bank (Virtual Account: BCA, BNI, BRI, Mandiri)
  - QRIS
  - GoPay / OVO / ShopeePay
  - Kartu Kredit / Debit
- Merchant menyelesaikan proses pembayaran

---

#### Langkah 5 — Midtrans Mengirim Webhook Konfirmasi ke Tendar

- Setelah pembayaran berhasil, Midtrans mengirim **HTTP POST webhook** ke endpoint Tendar:  
  `https://[domain]/api/midtrans/webhook`
- Sistem Tendar memverifikasi signature webhook dari Midtrans
- Setelah terverifikasi, sistem memperbarui status langganan merchant di database:
  - `subscription_tier` → diubah sesuai paket yang dibeli
  - `subscription_status` → `active`
  - `subscription_renewal_date` → +30 hari dari tanggal pembayaran

---

#### Langkah 6 — Akun Merchant Aktif & Fitur Dapat Digunakan

- Dashboard merchant diperbarui otomatis sesuai paket yang dibeli
- Merchant dapat mulai mengkonfigurasi toko:
  - Menambah produk & kategori
  - Mengatur tampilan menu digital
  - Mengaktifkan fitur POS (jika Business/Pro)
- Tendar menggenerate **QR Code** unik untuk toko merchant

---

### FASE 2 — Customer Memesan melalui Menu Digital (Tanpa Midtrans)

> **Fase ini tidak melibatkan Midtrans.** Customer dapat memesan melalui menu digital **sejak merchant memiliki akun Tendar, termasuk pada paket Free**. Perbedaan antar paket hanya pada fitur dan batasan yang tersedia bagi merchant (jumlah produk, akses POS, analytics, dll.) — bukan pada kemampuan customer untuk memesan.

#### Langkah 7 — Customer Scan QR Code

- Customer mendatangi tempat usaha merchant (kafe, restoran, warung, dll.)
- Di meja terdapat **QR Code** unik yang digenerate sistem Tendar
- Customer men-scan QR Code menggunakan kamera HP (tidak perlu install aplikasi)
- Customer diarahkan ke **halaman menu digital** dengan URL:  
  `https://tendar-app.netlify.app/[slug-toko]`
- Halaman ini dapat diakses oleh semua customer tanpa perlu login atau install apapun

---

#### Langkah 8 — Customer Melihat Menu & Memilih Produk

- Halaman menu digital menampilkan daftar produk yang dikonfigurasi merchant
- Customer dapat melihat nama produk, foto, harga, deskripsi, dan kategori
- Customer memilih produk dan memasukkannya ke **keranjang belanja**

---

#### Langkah 9 — Customer Checkout & Konfirmasi Pesanan

- Customer klik tombol **"Pesan Sekarang"**
- Customer mengisi nama pelanggan (opsional) *(Catatan: Input nomor meja saat ini sedang dibangun dan akan dirilis pada update selanjutnya)*
- Customer mereview ringkasan pesanan beserta total harga
- Customer klik **"Konfirmasi Pesanan"**
- Order tersimpan di sistem Tendar dengan status `pending`

---

#### Langkah 10 — Merchant Menerima & Memproses Pesanan

- Notifikasi pesanan masuk muncul di **dashboard POS merchant**
- Staff mengkonfirmasi pesanan → status berubah menjadi `processing`
- Dapur/barista menyiapkan pesanan

---

#### Langkah 11 — Customer Membayar di Kasir

- Customer membayar langsung kepada staff merchant (cash atau QRIS mandiri merchant, dll.)
- Staff merchant mencatat pembayaran di sistem Tendar (POS mode)
- Pesanan selesai siap di ambil customers
- Status akhir: `completed`

---

## Ringkasan Alur

```
FASE 1: Merchant Berlangganan (MENGGUNAKAN MIDTRANS)
──────────────────────────────────────────────────────────────
Daftar Akun → Pilih Paket → Klik Upgrade
    ↓
Edge Function → Midtrans API → Snap Token
    ↓
Midtrans Snap Popup → Pilih Metode → Bayar
    ↓
Midtrans Webhook → Tendar Verifikasi → Akun Aktif ✓

FASE 2: Customer Memesan (TIDAK MENGGUNAKAN MIDTRANS)
──────────────────────────────────────────────────────────────
Scan QR → Lihat Menu Digital → Pilih Produk → Cart
    ↓
Checkout → Konfirmasi Pesanan → Order Masuk ke Sistem
    ↓
Merchant Proses → Customer Bayar di Kasir → Completed ✓
```

---

## Informasi Teknis Integrasi Midtrans

| Parameter        | Detail                                                      |
|------------------|-------------------------------------------------------------|
| Kegunaan         | **Pembayaran subscription SaaS oleh merchant**              |
| Jenis Integrasi  | Midtrans Snap (popup)                                       |
| Library          | `midtrans-client` (Node.js) via Supabase Edge Function      |
| Webhook Endpoint | `/api/midtrans/webhook`                                     |
| Payment Methods  | QRIS, Virtual Account, GoPay, OVO, ShopeePay, Kartu Kredit |
| Environment      | Production (sandbox sebelum go-live)                        |
| Notification URL | Dikonfigurasi di Midtrans Dashboard                         |
| Finish URL       | Redirect ke halaman dashboard Tendar setelah berhasil       |

---

## Informasi Bisnis

**Nama Bisnis:** Tendar  
**Website:** https://tendar-app.netlify.app  
**Jenis Bisnis:** Software as a Service (SaaS) — Digital Menu & POS Platform  
**Target Pengguna:** UMKM (kafe, restoran, warung makan, food court)

---

*Dokumen ini dibuat untuk keperluan verifikasi onboarding Midtrans.*
