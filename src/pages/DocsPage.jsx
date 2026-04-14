import { useState, useEffect } from 'react'
import { BrandLogo } from '../components/BrandLogo'
import { useNavigate } from 'react-router-dom'

const DOCS_DATA = [
  {
    id: "arsitektur",
    title: "Arsitektur Routing",
    type: "section",
    content: (
      <div className="space-y-4 text-slate-600">
        <p>Aplikasi Tendar menggunakan sistem routing dinamis berbasis <code className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-mono text-sm">:slug</code> toko untuk mendukung sistem multi-tenant terisolasi.</p>
        <div className="bg-slate-900 text-slate-300 p-5 rounded-2xl font-mono text-sm overflow-x-auto shadow-sm">
          <div className="grid grid-cols-1 gap-2">
            <div><span className="text-emerald-400">/</span>                          → LandingPage</div>
            <div><span className="text-emerald-400">/register</span>                  → RegisterTenantPage</div>
            <div className="mb-3"><span className="text-emerald-400">/auth/callback</span>             → AuthCallbackPage</div>
            
            <div><span className="text-[#ff8c00]">/:slug/</span>                    → MenuPage <span className="text-slate-500">(Customer)</span></div>
            <div><span className="text-[#ff8c00]">/:slug/auth</span>                → AuthPage <span className="text-slate-500">(Customer/Staff login)</span></div>
            <div><span className="text-[#ff8c00]">/:slug/orders</span>              → CustomerOrdersPage</div>
            <div className="mb-3"><span className="text-[#ff8c00]">/:slug/profile</span>             → ProfilePage</div>
            
            <div><span className="text-indigo-400">/:slug/admin</span>               → AdminDashboard <span className="text-yellow-500">🔒 Admin only</span></div>
            <div><span className="text-indigo-400">/:slug/admin/orders</span>        → OrdersPage <span className="text-yellow-500">🔒 Admin + Staff</span></div>
            <div><span className="text-indigo-400">/:slug/admin/menu</span>          → MenuManagement <span className="text-yellow-500">🔒 Admin only</span></div>
            <div><span className="text-indigo-400">/:slug/admin/categories</span>    → CategoriesPage <span className="text-yellow-500">🔒 Admin only</span></div>
            <div><span className="text-indigo-400">/:slug/admin/inventory</span>     → InventoryPage <span className="text-yellow-500">🔒 Admin + Staff</span></div>
            <div><span className="text-indigo-400">/:slug/admin/history</span>       → HistoryPage <span className="text-yellow-500">🔒 Admin only</span></div>
            <div><span className="text-indigo-400">/:slug/admin/analytics</span>     → AnalyticsPage <span className="text-yellow-500">🔒 Admin only</span></div>
            <div><span className="text-indigo-400">/:slug/admin/billing</span>       → BillingPage <span className="text-yellow-500">🔒 Admin only</span></div>
            <div><span className="text-indigo-400">/:slug/admin/staff</span>         → StaffManagement <span className="text-yellow-500">🔒 Admin only</span></div>
            <div className="mb-3"><span className="text-indigo-400">/:slug/admin/share</span>         → ShareLinkPage <span className="text-yellow-500">🔒 Admin only</span></div>
            
            <div><span className="text-rose-400">/:slug/pos</span>                 → POSPage <span className="text-yellow-500">🔒 Admin + Staff</span></div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "publik",
    title: "🌐 Halaman Publik (Global)",
    type: "category",
    items: [
      {
        id: "landing",
        title: "LandingPage",
        route: "/",
        file: "src/pages/LandingPage.jsx",
        access: "Public",
        desc: "Halaman utama marketing Tendar. Menampilkan value proposition, fitur-fitur platform, daftar harga, dan CTA mendaftar.",
        features: ["Navbar sticky dengan auth check", "Login Modal terintegrasi", "Features & Pricing Section", "Auto-redirect jika terautentikasi"]
      },
      {
        id: "register",
        title: "RegisterTenantPage",
        route: "/register",
        file: "src/pages/RegisterTenantPage.jsx",
        access: "Public",
        desc: "Form pendaftaran toko baru. Validasi slug unik dan otomatisasi pembuatan identitas multi-tenant.",
        features: ["Pengecekan slug unik real-time", "Pembuatan Supabase Auth user", "Pembuatan record Tenant baru otomatis"]
      }
    ]
  },
  {
    id: "customer",
    title: "🛒 Halaman Customer (Per-Toko)",
    type: "category",
    items: [
      {
        id: "menupage",
        title: "MenuPage",
        route: "/:slug/",
        file: "src/pages/MenuPage.jsx",
        access: "Public (customer)",
        desc: "Halaman menu digital yang dilihat pelanggan. Tersinkronisasi dengan status buka/tutup toko dan manajemen inventory.",
        features: ["Filter kategori interaktif", "Pencarian real-time", "Sticky Cart Bar", "Banner penutupan toko dinamis"]
      },
      {
        id: "authpage",
        title: "AuthPage",
        route: "/:slug/auth",
        file: "src/pages/AuthPage.jsx",
        access: "Public (Customer & Staff)",
        desc: "Portal autentikasi tenant khusus untuk toko tersebut.",
        features: ["Login/Register form", "Password recovery", "Otomasi redirect sesuai jenis role (Customer/Admin/Staff)"]
      },
      {
        id: "customerorders",
        title: "CustomerOrdersPage",
        route: "/:slug/orders",
        file: "src/pages/CustomerOrdersPage.jsx",
        access: "Customer (Login Required)",
        desc: "Pelacakan order real-time bagi pelanggan yang sudah checkout.",
        features: ["Progress status pesanan animasi", "Detail daftar produk pesanan"]
      }
    ]
  },
  {
    id: "admin",
    title: "🛠️ Halaman Admin (Protected)",
    type: "category",
    items: [
      {
        id: "admindashboard",
        title: "AdminDashboard",
        route: "/:slug/admin",
        file: "src/pages/AdminDashboard.jsx",
        access: "🔒 Admin only",
        desc: "Dashboard utama admin. Menyajikan ringkasan performa toko secara real-time.",
        features: ["Summary performa (Revenue, Orders)", "Grafik Penjualan 7 Hari", "Toggle status Buka/Tutup toko cepat"]
      },
      {
        id: "orderspage",
        title: "OrdersPage",
        route: "/:slug/admin/orders",
        file: "src/pages/OrdersPage.jsx",
        access: "🔒 Admin + Staff",
        desc: "Halaman manajemen pesanan sesi hari ini. Digunakan secara aktif untuk operasional kasir dan dapur.",
        features: ["Notifikasi pesanan baru (Pulse Badge)", "Cetak struk koneksi printer ESC/POS Web Bluetooth", "Validasi bukti pembayaran QRIS OCR"]
      },
      {
        id: "menumanagement",
        title: "MenuManagement",
        route: "/:slug/admin/menu",
        file: "src/pages/MenuManagement.jsx",
        access: "🔒 Admin only",
        desc: "Halaman CRUD (Create, Read, Update, Delete) produk/menu toko.",
        features: ["Integrasi Supabase Storage Upload", "Toggle ketersediaan produk", "Limit produk sesuai skema berlangganan"]
      },
      {
        id: "statistic",
        title: "AnalyticsPage",
        route: "/:slug/admin/analytics",
        file: "src/pages/AnalyticsPage.jsx",
        access: "🔒 Admin only (Business/Pro)",
        desc: "Pusat Analisis bisnis lengkap melalui manipulasi complex SQL View dari Supabase.",
        features: ["Prediksi AI Sales", "Product Matrix Analysis (BCG)", "Export ke Multiple Sheet XLSX", "Trend Penjualan per waktu"]
      },
      {
        id: "billing",
        title: "BillingPage",
        route: "/:slug/admin/billing",
        file: "src/pages/BillingPage.jsx",
        access: "🔒 Admin only",
        desc: "Pusat langganan tagihan SaaS. Melayani pembuatan Invoice otomatis dengan OCR verifikasi.",
        features: ["Sistem QRIS dengan Unique Code", "Upload bukti dengan Image processing", "Notifikasi expire peringatan (< 7 hari)"]
      }
    ]
  },
  {
    id: "pos",
    title: "🖥️ Halaman POS (Point of Sale)",
    type: "category",
    items: [
      {
        id: "pospage",
        title: "POSPage",
        route: "/:slug/pos",
        file: "src/pages/POSPage.jsx",
        access: "🔒 Admin + Staff (Business/Pro)",
        desc: "Aplikasi kasir (POS) khusus untuk kecepatan bertransaksi walk-in di tablet/komputer offline-style.",
        features: ["Layout Tampil 60/40 Optimized", "Kalkulasi kembalian tunai (cash) instant", "Dukungan QRIS Langsung", "Auto Printer trigger setelah pembayaran"]
      }
    ]
  },
  {
    id: "sys_plan",
    title: "Sistem Ekosistem Plan",
    type: "section",
    content: (
      <div className="bg-white border text-sm rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-[#fff6ec] text-[#ff8c00]">
            <tr>
              <th className="p-4 font-bold border-b border-slate-100">Fitur</th>
              <th className="p-4 font-bold border-b border-slate-100 text-center">Free</th>
              <th className="p-4 font-bold border-b border-slate-100 text-center">Starter</th>
              <th className="p-4 font-bold border-b border-slate-100 text-center">Business</th>
              <th className="p-4 font-bold border-b border-slate-100 text-center">Pro</th>
            </tr>
          </thead>
          <tbody className="text-slate-600">
            <tr className="border-b border-slate-50"><td className="p-4 font-medium text-slate-800">Jumlah Produk</td><td className="p-4 text-center">10</td><td className="p-4 text-center">30</td><td className="p-4 text-center font-bold text-emerald-500">∞</td><td className="p-4 text-center font-bold text-emerald-500">∞</td></tr>
            <tr className="border-b border-slate-50"><td className="p-4 font-medium text-slate-800">Batas Staff</td><td className="p-4 text-center">1</td><td className="p-4 text-center">1</td><td className="p-4 text-center">2</td><td className="p-4 text-center font-bold text-emerald-500">∞</td></tr>
            <tr className="border-b border-slate-50"><td className="p-4 font-medium text-slate-800">Akses POS (Kasir)</td><td className="p-4 text-center opacity-40">❌</td><td className="p-4 text-center opacity-40">❌</td><td className="p-4 text-center text-emerald-500 bg-emerald-50">✅</td><td className="p-4 text-center text-emerald-500 bg-emerald-50">✅</td></tr>
            <tr className="border-b border-slate-50"><td className="p-4 font-medium text-slate-800">Analytics Dashboard</td><td className="p-4 text-center opacity-40">❌</td><td className="p-4 text-center opacity-40">❌</td><td className="p-4 text-center text-emerald-500 bg-emerald-50">✅</td><td className="p-4 text-center text-emerald-500 bg-emerald-50">✅</td></tr>
            <tr className="border-b border-slate-50"><td className="p-4 font-medium text-slate-800">Inventory Monitoring</td><td className="p-4 text-center opacity-40">❌</td><td className="p-4 text-center opacity-40">❌</td><td className="p-4 text-center text-emerald-500 bg-emerald-50">✅</td><td className="p-4 text-center text-emerald-500 bg-emerald-50">✅</td></tr>
            <tr><td className="p-4 font-medium text-slate-800">Export Excel (XLSX)</td><td className="p-4 text-center opacity-40">❌</td><td className="p-4 text-center opacity-40">❌</td><td className="p-4 text-center opacity-40">❌</td><td className="p-4 text-center text-emerald-500 bg-emerald-50">✅</td></tr>
          </tbody>
        </table>
      </div>
    )
  }
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('arsitektur');
  const navigate = useNavigate();

  // Scroll spy helper
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]');
      let current = '';
      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (window.scrollY >= sectionTop - 150) {
          current = section.getAttribute('id');
        }
      });
      if (current && current !== activeSection) {
        setActiveSection(current);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeSection]);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({ top: el.offsetTop - 100, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfaf8] font-[Manrope,sans-serif] flex flex-col">
      {/* HEADER */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <BrandLogo onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer" />
        <div className="flex items-center gap-4">
          <span className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1.5 rounded-full">v1.2.0 Docs</span>
          <button 
            onClick={() => navigate('/')}
            className="text-sm font-semibold text-slate-600 hover:text-[#ff8c00] transition-colors"
          >
            Kembali ke App
          </button>
        </div>
      </nav>

      <div className="flex-1 max-w-7xl w-full mx-auto flex gap-8 px-6 py-10 relative">
        {/* SIDEBAR NAVIGATION (Desktop Only) */}
        <aside className="w-64 shrink-0 hidden lg:block">
          <div className="sticky top-32 space-y-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-3">Daftar Isi</h3>
            {DOCS_DATA.map((node) => (
              <button
                key={node.id}
                onClick={() => scrollTo(node.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeSection === node.id 
                    ? 'bg-orange-50 text-[#ff8c00]' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {node.title.replace(/[\u{1F300}-\u{1F9FF}]/gu, '') /* Remove emojis for cleaner sidebar */}
              </button>
            ))}
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 max-w-4xl pb-32">
          
          <div className="mb-12">
            <h1 className="text-4xl lg:text-5xl font-black text-slate-800 tracking-tight leading-tight">
              Dokumentasi Halaman <br/><span className="text-[#ff8c00]">Tendar App</span>
            </h1>
            <p className="mt-4 text-lg text-slate-500 leading-relaxed border-l-4 border-[#ff8c00] pl-4 py-1 bg-orange-50/50">
              Platform SaaS manajemen bisnis F&B (Food & Beverage) untuk UMKM Indonesia.
              Dibangun dengan React + Vite, backend Supabase, dan styling Tailwind CSS.
            </p>
          </div>

          <div className="space-y-16">
            {DOCS_DATA.map((node) => (
              <section key={node.id} id={node.id} className="scroll-mt-32">
                <h2 className="text-2xl font-extrabold text-slate-800 mb-6 flex items-center gap-3">
                  {node.title}
                </h2>
                
                {/* SECTION TYPE */}
                {node.type === 'section' && node.content}

                {/* CATEGORY TYPE */}
                {node.type === 'category' && (
                  <div className="space-y-6">
                    {node.items.map((item) => (
                      <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                          <h3 className="text-xl font-bold text-[#ff8c00] flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px]">description</span>
                            {item.title}
                          </h3>
                          <div className="flex gap-2 text-xs font-mono font-medium">
                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded">{item.file.split('/').pop()}</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">route</span>
                            <div>
                              <span className="text-slate-400 block text-xs font-semibold">Route</span>
                              <code className="bg-orange-50 text-orange-700 px-1.5 rounded">{item.route}</code>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">security</span>
                            <div>
                              <span className="text-slate-400 block text-xs font-semibold">Akses</span>
                              <span className="font-semibold text-slate-700">{item.access}</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-slate-600 mb-5 leading-relaxed">{item.desc}</p>
                        
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Fitur Utama</h4>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {item.features.map((feat, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                <span className="material-symbols-outlined text-[#ff8c00] text-[18px] translate-y-0.5">check_circle</span>
                                <span className="flex-1">{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>

        </main>
      </div>
    </div>
  );
}
