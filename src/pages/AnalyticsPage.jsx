import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import KPICard from '../components/analytics/KPICard'
import ProductPerformanceTable from '../components/analytics/ProductPerformanceTable'
import ProductMatrixChart from '../components/analytics/ProductMatrixChart'
import SalesTrendChart from '../components/analytics/SalesTrendChart'
import CustomerTable from '../components/analytics/CustomerTable'
import { Download, Printer, Trash2, AlertTriangle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useTenantContext } from '../context/TenantContext'
import { Link } from 'react-router-dom'

export default function AnalyticsPage() {
    const { tenantId, slug, planLimits } = useTenantContext()
    const [loading, setLoading] = useState(true)
    const [summary, setSummary] = useState({ total_revenue: 0, total_orders: 0, overall_aov: 0 })
    const [products, setProducts] = useState([])
    const [matrix, setMatrix] = useState([])
    const [salesTrend, setSalesTrend] = useState([])
    const [customers, setCustomers] = useState([])
    const [forecast, setForecast] = useState({ predicted_revenue: 0, predicted_transactions: 0 })

    // Reset Modal
    const [showResetModal, setShowResetModal] = useState(false)
    const [resetting, setResetting] = useState(false)

    useEffect(() => {
        if (tenantId) fetchAnalytics()
    }, [tenantId])

    const fetchAnalytics = async () => {
        setLoading(true)
        try {
            // Parallel fetching for performance
            const [
                { data: summaryData },
                { data: productsData },
                { data: matrixData },
                { data: salesData },
                { data: customersData },
                { data: forecastData }
            ] = await Promise.all([
                supabase.from('view_analytics_summary').select('*').eq('tenant_id', tenantId).single(),
                supabase.from('view_analytics_product_performance').select('*').eq('tenant_id', tenantId),
                supabase.from('view_analytics_product_matrix').select('*').eq('tenant_id', tenantId),
                supabase.from('view_analytics_sales_time').select('*').eq('tenant_id', tenantId).order('day_of_week', { ascending: true }),
                supabase.from('view_analytics_customer_insights').select('*').eq('tenant_id', tenantId),
                supabase.from('view_analytics_forecast').select('*').eq('tenant_id', tenantId).single()
            ])

            if (summaryData) setSummary(summaryData)
            if (productsData) setProducts(productsData)
            if (matrixData) setMatrix(matrixData)
            if (salesData) setSalesTrend(salesData)
            if (customersData) setCustomers(customersData)
            if (forecastData) setForecast({
                predicted_revenue: forecastData.predicted_revenue_tomorrow || 0,
                predicted_transactions: forecastData.predicted_transactions_tomorrow || 0
            })

        } catch (err) {
            console.error('Error fetching analytics:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleExportAndReset = async () => {
        if (!planLimits.exportCsv && !planLimits.exportExcel) {
            alert('Fitur Export terkunci. Silakan upgrade paket Anda ke Business atau Pro.')
            return
        }

        try {
            // 1. Fetch ALL Raw Data
            const { data: rawOrders, error } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false })

            if (error) throw error

            // 2. Prepare Data for Excel Sheets
            const summarySheet = [
                { Metric: 'Total Revenue', Value: summary.total_revenue },
                { Metric: 'Total Orders', Value: summary.total_orders },
                { Metric: 'AOV', Value: summary.overall_aov },
                { Metric: 'Predicted Revenue (Tomorrow)', Value: forecast.predicted_revenue },
                { Metric: 'Predicted Transactions (Tomorrow)', Value: forecast.predicted_transactions }
            ]

            // Flatten raw orders for Excel
            const flattenedOrders = []
            rawOrders.forEach(order => {
                if (order.order_items && order.order_items.length > 0) {
                    order.order_items.forEach(item => {
                        flattenedOrders.push({
                            OrderID: order.id,
                            Date: new Date(order.created_at).toLocaleDateString(),
                            Time: new Date(order.created_at).toLocaleTimeString(),
                            CustomerName: order.customer_name,
                            CustomerPhone: order.customer_phone,
                            ProductName: item.name,
                            Quantity: item.quantity,
                            Price: item.price,
                            TotalAmount: item.price * item.quantity,
                            Status: order.status,
                            Notes: order.notes
                        })
                    })
                } else {
                    // Orders without items (shouldn't happen but safe to handle)
                    flattenedOrders.push({
                        OrderID: order.id,
                        Date: new Date(order.created_at).toLocaleDateString(),
                        Customer: order.customer_name,
                        Total: order.total_amount,
                        Status: order.status
                    })
                }
            })

            // 3. Create Workbook
            const wb = XLSX.utils.book_new()

            const wsSummary = XLSX.utils.json_to_sheet(summarySheet)
            XLSX.utils.book_append_sheet(wb, wsSummary, "Summary")

            const wsProducts = XLSX.utils.json_to_sheet(products)
            XLSX.utils.book_append_sheet(wb, wsProducts, "Product Performance")

            const wsSales = XLSX.utils.json_to_sheet(salesTrend)
            XLSX.utils.book_append_sheet(wb, wsSales, "Sales Trend")

            const wsRaw = XLSX.utils.json_to_sheet(flattenedOrders)
            XLSX.utils.book_append_sheet(wb, wsRaw, "All Transactions")

            // 4. Save File
            XLSX.writeFile(wb, `KareemJuice_Uncut_Report_${new Date().toISOString().split('T')[0]}.xlsx`)

            // 5. Trigger Reset Modal
            setShowResetModal(true)

        } catch (err) {
            console.error('Export failed:', err)
            alert('Export failed. Please try again.')
        }
    }

    const confirmReset = async () => {
        setResetting(true)
        try {
            // Delete all orders. Cascades to order_items usually, but we'll see.
            // Safe delete: verify we are NOT touching products/categories

            // Delete order_items first to be safe if no cascade
            await supabase.from('order_items').delete().neq('id', 0)

            // Delete orders
            const { error } = await supabase.from('orders').delete().neq('id', 0)

            if (error) throw error

            alert('Database has been reset successfully.')
            setShowResetModal(false)
            fetchAnalytics() // Refresh (should be empty)

        } catch (err) {
            console.error('Reset failed:', err)
            alert('Reset failed: ' + err.message)
        } finally {
            setResetting(false)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    if (planLimits && !planLimits.analyticsEnabled) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">monitoring</span>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Analytics Terkunci</h1>
                <p className="text-slate-500 mb-6 max-w-sm">Paket Anda saat ini tidak memiliki akses ke Dashboard Analytics. Silakan upgrade paket untuk melihat performa bisnis.</p>
                <Link to={`/${slug}/admin/billing`} className="bg-[#ff8c00] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#e07800] transition-colors shadow-lg">
                    Lihat Paket Langganan
                </Link>
            </div>
        )
    }

    if (loading) return <div className="p-8 text-center">Loading Analytics...</div>

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 print:p-0 print:max-w-none">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-stone-800">Business Dashboard</h1>
                    <p className="text-stone-500 text-sm">Overview performa bisnis Kareem Juice</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors shadow-sm font-medium text-sm"
                    >
                        <Printer className="w-4 h-4" />
                        Print / PDF
                    </button>
                    <button
                        onClick={handleExportAndReset}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-colors shadow-sm font-medium text-sm"
                    >
                        <Download className="w-4 h-4" />
                        Export & Reset
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Total Revenue"
                    value={`Rp ${summary.total_revenue?.toLocaleString('id-ID') || 0}`}
                    iconName="dollar"
                    trend="up"
                />
                <KPICard
                    title="Total Orders"
                    value={summary.total_orders || 0}
                    iconName="bag"
                />
                <KPICard
                    title="Avg. Order Value"
                    value={`Rp ${Math.round(summary.overall_aov || 0).toLocaleString('id-ID')}`}
                    iconName="activity"
                />
                <KPICard
                    title="Forecast (Besok)"
                    value={`Rp ${Math.round(forecast.predicted_revenue || 0).toLocaleString('id-ID')}`}
                    subtext={`${Math.round(forecast.predicted_transactions || 0)} transaksi`}
                    iconName="activity"
                />
            </div>

            {/* Charts Section 1: Sales Trend & Product Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
                    <h2 className="text-lg font-bold text-stone-800 mb-4">Trend Penjualan</h2>
                    <SalesTrendChart data={salesTrend} />
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
                    <h2 className="text-lg font-bold text-stone-800 mb-4">Matriks Produk</h2>
                    <ProductMatrixChart data={matrix} />
                </div>
            </div>

            {/* Section 2: Product Performance & Customer Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
                    <h2 className="text-lg font-bold text-stone-800 mb-4">Performa Produk</h2>
                    <ProductPerformanceTable data={products} />
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
                    <h2 className="text-lg font-bold text-stone-800 mb-4">Pelanggan Loyal</h2>
                    <CustomerTable data={customers} />
                </div>
            </div>

            {/* Reset Confirmation Modal */}
            {showResetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:hidden">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <AlertTriangle className="w-8 h-8" />
                            <h3 className="text-xl font-bold">Reset Database?</h3>
                        </div>
                        <p className="text-stone-600 mb-6">
                            File Excel telah diunduh. <br /><br />
                            Apakah Anda yakin ingin <strong>MENGHAPUS SEMUA DATA PENJUALAN</strong> dari database? <br />
                            Tindakan ini tidak dapat dibatalkan. Menu dan Kategori <strong>TIDAK</strong> akan terhapus.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowResetModal(false)}
                                className="px-4 py-2 text-stone-600 font-medium hover:bg-stone-50 rounded-lg"
                                disabled={resetting}
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmReset}
                                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
                                disabled={resetting}
                            >
                                {resetting ? 'Menghapus...' : 'Ya, Hapus Semua'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
