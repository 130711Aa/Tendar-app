import { useNavigate } from 'react-router-dom'
import { useTenantContext } from '../../context/TenantContext'

export default function BackToAdminButton() {
    const navigate = useNavigate()
    const { slug } = useTenantContext()

    const handleBack = () => {
        sessionStorage.removeItem('pos_mode')
        navigate(`/${slug}/admin`)
    }

    return (
        <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff8c00]/10 hover:bg-[#ff8c00] text-[#ff8c00] hover:text-white font-bold text-sm transition-all active:scale-95"
        >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span className="hidden sm:inline">Kembali</span>
        </button>
    )
}
