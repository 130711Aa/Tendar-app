import { useState, useRef, useCallback } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { useTenantContext } from '../context/TenantContext'
import toast from 'react-hot-toast'

const BASE_URL = 'https://tendar-app.netlify.app'

const QR_SIZES = [
    { label: 'Kecil', value: 200, desc: 'Cocok untuk print struk' },
    { label: 'Sedang', value: 300, desc: 'Umum dipasang di meja' },
    { label: 'Besar', value: 400, desc: 'Poster & banner' },
]

const QR_THEMES = [
    { label: 'Classic', fg: '#181510', bg: '#ffffff' },
    { label: 'Brand Orange', fg: '#ff8c00', bg: '#fff8f0' },
    { label: 'Dark Mode', fg: '#ffffff', bg: '#181510' },
    { label: 'Ocean', fg: '#0369a1', bg: '#f0f9ff' },
    { label: 'Forest', fg: '#15803d', bg: '#f0fdf4' },
    { label: 'Rose', fg: '#be123c', bg: '#fff1f2' },
]

export default function ShareLinkPage() {
    const { slug, tenantName } = useTenantContext()
    const storeUrl = `${BASE_URL}/${slug}`

    const [qrSize, setQrSize] = useState(300)
    const [theme, setTheme] = useState(QR_THEMES[0])
    const [showLogo, setShowLogo] = useState(true)
    const [copied, setCopied] = useState(false)
    const [activeTab, setActiveTab] = useState('qr') // 'qr' | 'share'
    const qrRef = useRef(null)

    // Copy link to clipboard
    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(storeUrl)
            setCopied(true)
            toast.success('Link berhasil disalin!')
            setTimeout(() => setCopied(false), 2500)
        } catch {
            toast.error('Gagal menyalin link')
        }
    }, [storeUrl])

    // Download QR as PNG
    const handleDownload = useCallback(() => {
        const canvas = qrRef.current?.querySelector('canvas')
        if (!canvas) return toast.error('QR code belum siap')

        // Create a padded canvas for nicer export
        const padding = 32
        const exportCanvas = document.createElement('canvas')
        exportCanvas.width = canvas.width + padding * 2
        exportCanvas.height = canvas.height + padding * 2 + 60 // extra for label
        const ctx = exportCanvas.getContext('2d')

        // Background
        ctx.fillStyle = theme.bg
        ctx.roundRect(0, 0, exportCanvas.width, exportCanvas.height, 16)
        ctx.fill()

        // QR
        ctx.drawImage(canvas, padding, padding)

        // Label (store name + url)
        ctx.fillStyle = theme.fg
        ctx.font = `bold 16px Manrope, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(tenantName || slug, exportCanvas.width / 2, canvas.height + padding + 28)
        ctx.font = `12px Manrope, sans-serif`
        ctx.fillStyle = theme.fg + '99'
        ctx.fillText(storeUrl, exportCanvas.width / 2, canvas.height + padding + 48)

        // Download
        const url = exportCanvas.toDataURL('image/png')
        const a = document.createElement('a')
        a.href = url
        a.download = `qr-${slug}.png`
        a.click()
        toast.success('QR code berhasil diunduh!')
    }, [theme, slug, tenantName, storeUrl])

    // Web Share API
    const handleNativeShare = useCallback(async () => {
        if (!navigator.share) return toast.error('Browser Anda tidak mendukung fitur berbagi langsung')
        try {
            await navigator.share({
                title: tenantName || 'Menu Online Kami',
                text: `Pesan langsung di ${tenantName || 'toko kami'}! 🍽️`,
                url: storeUrl,
            })
        } catch (e) {
            if (e.name !== 'AbortError') toast.error('Gagal berbagi')
        }
    }, [tenantName, storeUrl])

    const SVG_ICONS = {
        whatsapp: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
        telegram: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>,
        instagram: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.88z"/></svg>,
        twitter: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>,
        facebook: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
        email: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M2 5.5v13a2 2 0 002 2h16a2 2 0 002-2v-13a2 2 0 00-2-2H4a2 2 0 00-2 2zm2-.5h16l-8 5-8-5zm0 2l8 5 8-5v11H4v-11z"/></svg>,
    }

    const shareLinks = [
        {
            name: 'WhatsApp',
            iconObj: SVG_ICONS.whatsapp,
            color: 'bg-[#25D366]',
            url: `https://wa.me/?text=${encodeURIComponent(`Haii! Yuk pesan di *${tenantName || 'toko kami'}* langsung dari HP kamu! 🍽️\n\n${storeUrl}`)}`,
        },
        {
            name: 'Telegram',
            iconObj: SVG_ICONS.telegram,
            color: 'bg-[#229ED9]',
            url: `https://t.me/share/url?url=${encodeURIComponent(storeUrl)}&text=${encodeURIComponent(`Pesan di ${tenantName || 'toko kami'} sekarang! 🍽️`)}`,
        },
        {
            name: 'Instagram Story',
            iconObj: SVG_ICONS.instagram,
            color: 'bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045]',
            action: () => {
                handleCopy()
                toast('Salin link lalu paste ke Instagram Story kamu 📲', { icon: '📋' })
            },
        },
        {
            name: 'Twitter / X',
            iconObj: SVG_ICONS.twitter,
            color: 'bg-[#000000]',
            url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Pesan di ${tenantName || 'toko kami'} sekarang! 🍽️ ${storeUrl}`)}`,
        },
        {
            name: 'Facebook',
            iconObj: SVG_ICONS.facebook,
            color: 'bg-[#1877F2]',
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storeUrl)}`,
        },
        {
            name: 'Email',
            iconObj: SVG_ICONS.email,
            color: 'bg-neutral-600',
            url: `mailto:?subject=${encodeURIComponent(`Menu Online - ${tenantName || 'Toko Kami'}`)}&body=${encodeURIComponent(`Haii! Kunjungi menu online kami dan langsung pesan dari HP kamu:\n\n${storeUrl}`)}`,
        },
    ]

    return (
        <main className="flex-1 flex flex-col min-w-0">
            <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto w-full">
                {/* Header */}
                <div className="flex items-end justify-between flex-wrap gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Bagikan Toko</h2>
                        <p className="text-orange-800/60 font-medium mt-0.5">
                            QR Code & link agar pelanggan mudah menemukan toko kamu
                        </p>
                    </div>
                </div>

                {/* Link Banner */}
                <div className="bg-gradient-to-br from-[#ff8c00] to-[#e67e00] rounded-2xl p-6 text-white relative overflow-hidden shadow-xl shadow-[#ff8c00]/25">
                    {/* Decorative circles */}
                    <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
                    <div className="absolute -bottom-12 -left-4 w-32 h-32 rounded-full bg-white/5" />
                    <p className="text-sm font-bold opacity-80 mb-2 relative z-10">Link Menu Online Kamu</p>
                    <div className="flex items-center gap-3 relative z-10 flex-wrap">
                        <code className="flex-1 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 font-mono text-sm font-bold break-all min-w-0">
                            {storeUrl}
                        </code>
                        <button
                            onClick={handleCopy}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 shrink-0 ${
                                copied
                                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                    : 'bg-white text-[#ff8c00] hover:bg-white/90 shadow-lg shadow-black/10'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">
                                {copied ? 'check_circle' : 'content_copy'}
                            </span>
                            {copied ? 'Tersalin!' : 'Salin Link'}
                        </button>
                        {navigator.share && (
                            <button
                                onClick={handleNativeShare}
                                className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-white/20 hover:bg-white/30 transition-all active:scale-95 shrink-0"
                            >
                                <span className="material-symbols-outlined text-[18px]">ios_share</span>
                                Bagikan
                            </button>
                        )}
                    </div>
                    {/* Stats pill */}
                    <div className="flex items-center gap-2 mt-4 relative z-10">
                        <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            Link Aktif
                        </span>
                        <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">
                            tendar-app.netlify.app/{slug}
                        </span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-[#fcfaf8] rounded-xl p-1 border border-[#ff8c00]/10 w-fit">
                    {[
                        { id: 'qr', label: 'QR Code', icon: 'qr_code_2' },
                        { id: 'share', label: 'Bagikan', icon: 'share' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
                                activeTab === tab.id
                                    ? 'bg-white text-[#ff8c00] shadow-sm border border-[#ff8c00]/10'
                                    : 'text-neutral-400 hover:text-neutral-600'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* QR Code Tab */}
                {activeTab === 'qr' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* QR Preview */}
                        <div className="bg-white rounded-2xl border border-[#ff8c00]/10 shadow-sm p-6 flex flex-col items-center gap-6">
                            <h3 className="text-lg font-bold self-start">Preview QR Code</h3>
                            
                            {/* QR Canvas */}
                            <div
                                ref={qrRef}
                                className="rounded-2xl p-6 shadow-md transition-all"
                                style={{ backgroundColor: theme.bg }}
                            >
                                <QRCodeCanvas
                                    value={storeUrl}
                                    size={Math.min(qrSize, 280)}
                                    fgColor={theme.fg}
                                    bgColor="transparent"
                                    level="H"
                                    imageSettings={showLogo ? {
                                        src: '/Logo.png',
                                        height: Math.min(qrSize, 280) * 0.15,
                                        width: Math.min(qrSize, 280) * 0.15,
                                        excavate: true,
                                    } : undefined}
                                />
                                <p
                                    className="text-center text-xs font-bold mt-3 opacity-70"
                                    style={{ color: theme.fg, fontFamily: 'Manrope, sans-serif' }}
                                >
                                    {tenantName || slug}
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={handleDownload}
                                    className="flex-1 flex items-center justify-center gap-2 bg-[#ff8c00] hover:bg-[#e67e00] text-white px-4 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-[#ff8c00]/20"
                                >
                                    <span className="material-symbols-outlined text-[18px]">download</span>
                                    Unduh PNG
                                </button>
                                <button
                                    onClick={handleNativeShare}
                                    className="flex items-center justify-center gap-2 bg-[#fcfaf8] hover:bg-neutral-100 border border-[#ff8c00]/10 text-[#181510] px-4 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[18px]">ios_share</span>
                                    Bagikan
                                </button>
                            </div>

                            <p className="text-xs text-neutral-400 text-center">
                                QR code sudah include nama toko & URL. Scan untuk membuka menu.
                            </p>
                        </div>

                        {/* QR Settings */}
                        <div className="space-y-5">
                            {/* Size */}
                            <div className="bg-white rounded-2xl border border-[#ff8c00]/10 shadow-sm p-5">
                                <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px] text-[#ff8c00]">straighten</span>
                                    Ukuran QR Code
                                </h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {QR_SIZES.map(s => (
                                        <button
                                            key={s.value}
                                            onClick={() => setQrSize(s.value)}
                                            className={`p-3 rounded-xl border-2 text-left transition-all ${
                                                qrSize === s.value
                                                    ? 'border-[#ff8c00] bg-[#ff8c00]/5'
                                                    : 'border-transparent bg-[#fcfaf8] hover:border-[#ff8c00]/30'
                                            }`}
                                        >
                                            <p className={`font-bold text-sm ${qrSize === s.value ? 'text-[#ff8c00]' : 'text-[#181510]'}`}>
                                                {s.label}
                                            </p>
                                            <p className="text-[10px] text-neutral-400 mt-0.5">{s.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Theme */}
                            <div className="bg-white rounded-2xl border border-[#ff8c00]/10 shadow-sm p-5">
                                <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px] text-[#ff8c00]">palette</span>
                                    Tema Warna
                                </h4>
                                <div className="grid grid-cols-6 sm:grid-cols-3 gap-2">
                                    {QR_THEMES.map(t => (
                                        <button
                                            key={t.label}
                                            onClick={() => setTheme(t)}
                                            className={`flex justify-center sm:justify-start items-center gap-2 sm:p-2.5 p-2 rounded-xl border-2 transition-all ${
                                                theme.label === t.label
                                                    ? 'border-[#ff8c00]'
                                                    : 'border-transparent bg-[#fcfaf8] hover:border-neutral-200'
                                            }`}
                                        >
                                            <div
                                                className="w-8 h-8 rounded-lg border border-neutral-100 shrink-0 flex items-center justify-center"
                                                style={{ backgroundColor: t.bg }}
                                            >
                                                <div
                                                    className="w-4 h-4 rounded-[3px]"
                                                    style={{ backgroundColor: t.fg }}
                                                />
                                            </div>
                                            <span className="hidden sm:block text-xs font-bold text-[#181510] truncate">{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Options */}
                            <div className="bg-white rounded-2xl border border-[#ff8c00]/10 shadow-sm p-5">
                                <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px] text-[#ff8c00]">tune</span>
                                    Opsi Tampilan
                                </h4>
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <p className="text-sm font-bold text-[#181510]">Tampilkan Logo di Tengah</p>
                                        <p className="text-xs text-neutral-400">Logo favicon toko di tengah QR</p>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={showLogo}
                                            onChange={e => setShowLogo(e.target.checked)}
                                        />
                                        <span className="toggle-slider" />
                                    </label>
                                </label>
                            </div>

                            {/* Tip card */}
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                                <span className="material-symbols-outlined text-amber-500 shrink-0 mt-0.5">lightbulb</span>
                                <div>
                                    <p className="text-sm font-bold text-amber-800">Tips Penggunaan QR Code</p>
                                    <ul className="text-xs text-amber-700 mt-2 space-y-1 list-disc list-inside">
                                        <li>Cetak ukuran minimal 3×3 cm agar mudah di-scan</li>
                                        <li>Pasang di meja, kasir, atau pintu masuk toko</li>
                                        <li>Gunakan ukuran "Besar" untuk banner & poster</li>
                                        <li>Coba tambahkan label "Scan untuk pesan" di bawah QR</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Share Tab */}
                {activeTab === 'share' && (
                    <div className="space-y-6">
                        {/* Social Share Grid */}
                        <div className="bg-white rounded-2xl border border-[#ff8c00]/10 shadow-sm p-6">
                            <h3 className="text-lg font-bold mb-5">Bagikan ke Platform</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {shareLinks.map(platform => (
                                    <a
                                        key={platform.name}
                                        href={platform.url || '#'}
                                        target={platform.url ? '_blank' : undefined}
                                        rel="noopener noreferrer"
                                        onClick={platform.action ? (e) => { e.preventDefault(); platform.action() } : undefined}
                                        className={`flex items-center gap-3 p-4 rounded-xl text-white font-bold text-[13px] sm:text-sm transition-all hover:opacity-90 active:scale-95 shadow-sm ${platform.color}`}
                                    >
                                        <div className="shrink-0 drop-shadow-sm">{platform.iconObj}</div>
                                        <span className="truncate">{platform.name}</span>
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Embed HTML */}
                        <div className="bg-white rounded-2xl border border-[#ff8c00]/10 shadow-sm p-6">
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[20px] text-[#ff8c00]">code</span>
                                Embed di Website / Blog
                            </h3>
                            <p className="text-sm text-neutral-400 mb-3">Salin kode HTML ini dan paste di website kamu</p>
                            <div className="relative bg-[#181510] rounded-xl p-4 overflow-x-auto">
                                <code className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
{`<a href="${storeUrl}" target="_blank" rel="noopener noreferrer"
   style="display:inline-block;background:#ff8c00;color:#fff;
          padding:12px 24px;border-radius:12px;font-weight:700;
          text-decoration:none;font-family:sans-serif">
  🍽️ Pesan di ${tenantName || slug}
</a>`}
                                </code>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`<a href="${storeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#ff8c00;color:#fff;padding:12px 24px;border-radius:12px;font-weight:700;text-decoration:none;font-family:sans-serif">🍽️ Pesan di ${tenantName || slug}</a>`)
                                        toast.success('HTML embed disalin!')
                                    }}
                                    className="absolute top-3 right-3 size-8 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
                                    title="Salin kode"
                                >
                                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                                </button>
                            </div>
                        </div>

                        {/* WhatsApp Template */}
                        <div className="bg-white rounded-2xl border border-[#ff8c00]/10 shadow-sm p-6">
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[20px] text-[#ff8c00]">chat_bubble</span>
                                Template Pesan WhatsApp
                            </h3>
                            <p className="text-sm text-neutral-400 mb-3">Siap kirim ke grup atau broadcast pelanggan</p>
                            <div className="space-y-3">
                                {[
                                    {
                                        label: 'Promo Singkat',
                                        msg: `Haii! 👋\n\nYuk pesan di *${tenantName || 'toko kami'}* langsung dari HP kamu, tanpa antri! 🍽️\n\n👉 ${storeUrl}\n\n_Pesan sekarang, siap kami antar!_`,
                                    },
                                    {
                                        label: 'Grand Opening',
                                        msg: `🎉 *${tenantName || 'Toko Kami'} kini hadir online!*\n\nSkarang kamu bisa order menu favorit langsung dari HP, tanpa ribet!\n\n👇 Klik link berikut:\n${storeUrl}\n\nBuruan cobain! 🔥`,
                                    },
                                ].map(tpl => (
                                    <div key={tpl.label} className="bg-[#fcfaf8] rounded-xl p-4 border border-[#ff8c00]/10">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-[#ff8c00] uppercase tracking-wide">{tpl.label}</span>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(tpl.msg)
                                                    toast.success('Template disalin!')
                                                }}
                                                className="text-xs font-bold text-neutral-400 hover:text-[#ff8c00] flex items-center gap-1 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                                Salin
                                            </button>
                                        </div>
                                        <p className="text-sm text-[#181510] whitespace-pre-wrap leading-relaxed">{tpl.msg}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    )
}
