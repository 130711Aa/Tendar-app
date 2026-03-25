import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function MovementLog() {
    const [movements, setMovements] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchMovements()
    }, [])

    const fetchMovements = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('raw_material_movements')
            .select('*, raw_materials(name, unit)')
            .order('created_at', { ascending: false })
            .limit(50) // Limit to last 50 for now

        if (!error) setMovements(data || [])
        setLoading(false)
    }

    if (loading) return <div className="p-8 text-center text-stone-500">Memuat riwayat...</div>

    return (
        <div className="p-6">
            <h3 className="text-lg font-bold text-stone-800 mb-6">Riwayat Mutasi Stok (Terakhir 50)</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-stone-50 text-stone-500 text-xs font-bold uppercase tracking-wider border-b border-stone-100">
                            <th className="px-4 py-3">Waktu</th>
                            <th className="px-4 py-3">Bahan</th>
                            <th className="px-4 py-3 text-center">Tipe</th>
                            <th className="px-4 py-3 text-right">Jumlah</th>
                            <th className="px-4 py-3">Ref</th>
                            <th className="px-4 py-3">Ket</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                        {movements.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-stone-400">Belum ada riwayat.</td></tr>
                        ) : (
                            movements.map(m => (
                                <tr key={m.id} className="hover:bg-stone-50/50">
                                    <td className="px-4 py-3 text-stone-500 whitespace-nowrap">
                                        {new Date(m.created_at).toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-4 py-3 font-medium">{m.raw_materials?.name}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${m.movement_type === 'IN' ? 'bg-green-100 text-green-700' :
                                            m.movement_type === 'OUT' ? 'bg-orange-100 text-orange-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                            {m.movement_type}
                                        </span>
                                    </td>
                                    <td className={`px-4 py-3 text-right font-bold ${m.quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {m.quantity > 0 ? '+' : ''}{m.quantity} {m.raw_materials?.unit}
                                    </td>
                                    <td className="px-4 py-3 text-stone-500 text-xs">{m.reference_type} #{m.reference_id || '-'}</td>
                                    <td className="px-4 py-3 text-stone-500 text-xs max-w-[200px] truncate" title={m.notes}>{m.notes}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
