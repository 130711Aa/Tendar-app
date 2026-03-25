import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell, CartesianGrid, Legend } from 'recharts'

export default function ProductMatrixChart({ data }) {
    if (!data || data.length === 0) return null

    // Categorize data for coloring
    const COLORS = {
        'Star': '#10b981', // Emerald
        'Fasilitas Arus Kas (Volume)': '#3b82f6', // Blue
        'Premium': '#8b5cf6', // Violet
        'Perlu Evaluasi (Dead Weight)': '#ef4444' // Red
    }

    return (
        <div className="h-80 w-full font-sans">
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                    <XAxis
                        type="number"
                        dataKey="total_quantity"
                        name="Terjual"
                        unit=" pcs"
                        stroke="#a8a29e"
                        tick={{ fill: '#78716c', fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e5e5' }}
                        label={{ value: 'Jumlah Terjual (pcs)', position: 'insideBottom', offset: -10, fill: '#78716c', fontSize: 12, fontWeight: 500 }}
                    />
                    <YAxis
                        type="number"
                        dataKey="total_revenue"
                        name="Pendapatan"
                        unit=""
                        stroke="#a8a29e"
                        width={80} // Give more space for Y-axis labels
                        tickFormatter={(val) => `Rp ${val / 1000}k`}
                        tick={{ fill: '#78716c', fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e5e5' }}
                        label={{ value: 'Pendapatan', angle: -90, position: 'insideLeft', fill: '#78716c', fontSize: 12, fontWeight: 500, offset: 0 }}
                    />
                    <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div className="bg-white p-3 shadow-xl rounded-xl border border-stone-100 text-xs z-50">
                                        <p className="font-bold text-stone-800 mb-1 text-sm">{data.name}</p>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[data.classification] }}></span>
                                            <span className="text-stone-500 font-medium">{data.classification}</span>
                                        </div>
                                        <div className="space-y-1 bg-stone-50 p-2 rounded-lg">
                                            <div className="flex justify-between gap-4">
                                                <span className="text-stone-500">Terjual:</span>
                                                <span className="font-mono font-medium text-stone-700">{data.total_quantity} pcs</span>
                                            </div>
                                            <div className="flex justify-between gap-4">
                                                <span className="text-stone-500">Revenue:</span>
                                                <span className="font-mono font-medium text-emerald-600">Rp {data.total_revenue.toLocaleString('id-ID')}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Scatter name="Produk" data={data} fill="#8884d8" shape="circle">
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.classification] || '#94a3b8'} stroke="white" strokeWidth={2} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>

            <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center mt-2 text-[10px] md:text-xs text-stone-500 uppercase tracking-wider font-medium">
                {Object.entries(COLORS).map(([name, color]) => (
                    <div key={name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: color }}></div>
                        <span>{name.replace(' (Volume)', '').replace(' (Dead Weight)', '')}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
