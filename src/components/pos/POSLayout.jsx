import POSTopBar from './POSTopBar'
import { useTenantContext } from '../../context/TenantContext'
export default function POSLayout({ children }) {
    const { tenantName } = useTenantContext()
    return (
        <div className="fixed inset-0 flex flex-col bg-[#f8f9fa] overflow-hidden z-50 font-sans">
            <POSTopBar />
            <main className="flex flex-1 overflow-hidden">
                {children}
            </main>
            {/* Footer: Shortcut Bar */}
            <footer className="bg-white px-6 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest relative z-10">
                <div className="flex gap-3">
                    <span className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">search</span> Cari</span>
                    <span className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">receipt_long</span> Order Baru</span>
                    <span className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">print</span> Cetak Nota</span>
                </div>
                <div className="flex items-center font-display">
                    {tenantName || 'Toko Saya'} POS v1.0
                </div>
            </footer>
        </div>
    )
}
