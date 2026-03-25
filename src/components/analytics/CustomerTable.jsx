export default function CustomerTable({ data }) {
    if (!data || data.length === 0) {
        return <div className="p-4 text-center text-stone-400">Belum ada data pelanggan.</div>
    }

    // Limit to top 10
    const topCustomers = data.slice(0, 10)

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-stone-50 text-stone-500 font-medium uppercase text-xs">
                    <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Pelanggan</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Order</th>
                        <th className="px-4 py-3 text-right rounded-tr-lg">Total Belanja</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                    {topCustomers.map((customer, index) => (
                        <tr key={index} className="hover:bg-stone-50/50 transition-colors">
                            <td className="px-4 py-3">
                                <p className="font-medium text-stone-800">{customer.customer_name || 'Guest'}</p>
                                <p className="text-xs text-stone-400">{customer.customer_phone}</p>
                            </td>
                            <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${customer.customer_type === 'Returning'
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-blue-100 text-blue-700'
                                    }`}>
                                    {customer.customer_type}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right text-stone-600">
                                {customer.total_transactions}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-stone-800">
                                Rp {customer.total_spent.toLocaleString('id-ID')}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
