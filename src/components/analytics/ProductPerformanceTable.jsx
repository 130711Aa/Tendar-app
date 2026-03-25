import { ArrowUp, ArrowDown } from 'lucide-react'

export default function ProductPerformanceTable({ data }) {
    if (!data || data.length === 0) {
        return <div className="p-4 text-center text-stone-400">Belum ada data penjualan produk.</div>
    }

    // Sort by total revenue descending
    // Sort by total quantity descending (as requested)
    const sortedData = [...data].sort((a, b) => b.total_quantity - a.total_quantity)

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-stone-50 text-stone-500 font-medium uppercase text-xs">
                    <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Produk</th>
                        <th className="px-4 py-3 text-right">Terjual</th>
                        <th className="px-4 py-3 text-right rounded-tr-lg">Pendapatan</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                    {sortedData.map((item, index) => (
                        <tr key={index} className="hover:bg-stone-50/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-stone-800">
                                {item.name}
                            </td>
                            <td className="px-4 py-3 text-right text-stone-600">
                                {item.total_quantity}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-emerald-600">
                                Rp {item.total_revenue.toLocaleString('id-ID')}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
