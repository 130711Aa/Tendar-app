import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import KPICard from '../components/analytics/KPICard'
import ProductPerformanceTable from '../components/analytics/ProductPerformanceTable'
import ProductMatrixChart from '../components/analytics/ProductMatrixChart'
import SalesTrendChart from '../components/analytics/SalesTrendChart'
import CustomerTable from '../components/analytics/CustomerTable'
import { Download, Printer } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useTenantContext } from '../context/TenantContext'
import { Link } from 'react-router-dom'

const PERIOD_OPTIONS = [
    { id: 'day', label: 'Per Hari', title: '7 hari terakhir' },
    { id: 'week', label: 'Per Minggu', title: '8 minggu terakhir' },
    { id: 'month', label: 'Per Bulan', title: '12 bulan terakhir' }
]

const DAY_MS = 24 * 60 * 60 * 1000

const startOfDay = (date) => {
    const next = new Date(date)
    next.setHours(0, 0, 0, 0)
    return next
}

const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS)

const startOfWeek = (date) => {
    const next = startOfDay(date)
    const day = next.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    return addDays(next, mondayOffset)
}

const addWeeks = (date, weeks) => addDays(date, weeks * 7)

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1)

const addMonths = (date, months) => {
    const next = new Date(date)
    next.setMonth(next.getMonth() + months)
    return next
}

const dateKey = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

const monthKey = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
}

const formatShortDate = (date) => date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

const buildPeriodRange = (period) => {
    const today = new Date()

    if (period === 'week') {
        const currentWeekStart = startOfWeek(today)
        const currentStart = addWeeks(currentWeekStart, -7)
        const currentEnd = addWeeks(currentWeekStart, 1)
        return {
            unit: 'week',
            count: 8,
            currentStart,
            currentEnd,
            previousStart: addWeeks(currentStart, -8)
        }
    }

    if (period === 'month') {
        const currentMonthStart = startOfMonth(today)
        const currentStart = addMonths(currentMonthStart, -11)
        const currentEnd = addMonths(currentMonthStart, 1)
        return {
            unit: 'month',
            count: 12,
            currentStart,
            currentEnd,
            previousStart: addMonths(currentStart, -12)
        }
    }

    const tomorrow = addDays(startOfDay(today), 1)
    const currentStart = addDays(tomorrow, -7)
    return {
        unit: 'day',
        count: 7,
        currentStart,
        currentEnd: tomorrow,
        previousStart: addDays(currentStart, -7)
    }
}

const createTrendBuckets = (range) => {
    const buckets = []

    for (let index = 0; index < range.count; index += 1) {
        if (range.unit === 'month') {
            const start = addMonths(range.currentStart, index)
            buckets.push({
                key: monthKey(start),
                label: start.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
                total_revenue: 0,
                total_orders: 0
            })
            continue
        }

        if (range.unit === 'week') {
            const start = addWeeks(range.currentStart, index)
            const end = addDays(start, 6)
            buckets.push({
                key: dateKey(start),
                label: `${formatShortDate(start)} - ${formatShortDate(end)}`,
                total_revenue: 0,
                total_orders: 0
            })
            continue
        }

        const start = addDays(range.currentStart, index)
        buckets.push({
            key: dateKey(start),
            label: formatShortDate(start),
            total_revenue: 0,
            total_orders: 0
        })
    }

    return buckets
}

const getOrderBucketKey = (createdAt, unit) => {
    const date = new Date(createdAt)
    if (unit === 'month') return monthKey(startOfMonth(date))
    if (unit === 'week') return dateKey(startOfWeek(date))
    return dateKey(startOfDay(date))
}

const summarizeOrders = (orders) => {
    const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0)
    return {
        total_revenue: totalRevenue,
        total_orders: orders.length,
        overall_aov: orders.length > 0 ? totalRevenue / orders.length : 0
    }
}

const getOrderItems = (order) => {
    if (Array.isArray(order.order_items) && order.order_items.length > 0) return order.order_items
    if (Array.isArray(order.items)) return order.items
    return []
}

const buildProductPerformance = (orders) => {
    const products = new Map()

    orders.forEach(order => {
        getOrderItems(order).forEach(item => {
            const name = item.name || item.product_name || 'Produk'
            const quantity = Number(item.quantity) || 0
            const price = Number(item.price) || Number(item.unit_price) || 0
            const current = products.get(name) || { name, total_quantity: 0, total_revenue: 0 }
            current.total_quantity += quantity
            current.total_revenue += price * quantity
            products.set(name, current)
        })
    })

    return [...products.values()].sort((a, b) => b.total_revenue - a.total_revenue)
}

const classifyProducts = (products) => {
    if (products.length === 0) return []

    const averageQuantity = products.reduce((sum, product) => sum + product.total_quantity, 0) / products.length
    const averageRevenue = products.reduce((sum, product) => sum + product.total_revenue, 0) / products.length

    return products.map(product => {
        const highQuantity = product.total_quantity >= averageQuantity
        const highRevenue = product.total_revenue >= averageRevenue
        let classification = 'Perlu Evaluasi (Dead Weight)'

        if (highQuantity && highRevenue) classification = 'Star'
        if (highQuantity && !highRevenue) classification = 'Fasilitas Arus Kas (Volume)'
        if (!highQuantity && highRevenue) classification = 'Premium'

        return { ...product, classification }
    })
}

const buildCustomerInsights = (orders) => {
    const customers = new Map()

    orders.forEach(order => {
        const name = order.customer_name || 'Guest'
        const phone = order.customer_phone || ''
        const key = phone || name
        const current = customers.get(key) || {
            customer_name: name,
            customer_phone: phone,
            total_transactions: 0,
            total_spent: 0,
            customer_type: 'New'
        }

        current.total_transactions += 1
        current.total_spent += Number(order.total_amount) || 0
        current.customer_type = current.total_transactions > 1 ? 'Returning' : 'New'
        customers.set(key, current)
    })

    return [...customers.values()].sort((a, b) => b.total_spent - a.total_spent)
}

export default function AnalyticsPage() {
    const { tenantId, tenantName, slug, planLimits } = useTenantContext()
    const [loading, setLoading] = useState(true)
    const [summary, setSummary] = useState({ total_revenue: 0, total_orders: 0, overall_aov: 0 })
    const [products, setProducts] = useState([])
    const [matrix, setMatrix] = useState([])
    const [salesTrend, setSalesTrend] = useState([])
    const [customers, setCustomers] = useState([])
    const [forecast, setForecast] = useState({ predicted_revenue: 0, predicted_transactions: 0 })
    const [revenueTrend, setRevenueTrend] = useState({ value: 0, trend: 'neutral' })
    const [period, setPeriod] = useState('day')

    useEffect(() => {
        if (tenantId) fetchAnalytics()
    }, [tenantId, period])

    const fetchAnalytics = async () => {
        setLoading(true)
        try {
            const range = buildPeriodRange(period)

            // Parallel fetching for performance
            const [
                { data: forecastData },
                { data: orderData, error: orderError }
            ] = await Promise.all([
                supabase.from('view_analytics_forecast').select('*').eq('tenant_id', tenantId).single(),
                supabase
                    .from('orders')
                    .select('id, created_at, total_amount, status, customer_name, customer_phone, items, order_items(name, quantity, price)')
                    .eq('tenant_id', tenantId)
                    .neq('status', 'cancelled')
                    .gte('created_at', range.previousStart.toISOString())
                    .lt('created_at', range.currentEnd.toISOString())
                    .order('created_at', { ascending: true })
            ])

            if (orderError) throw orderError

            if (forecastData) setForecast({
                predicted_revenue: forecastData.predicted_revenue_tomorrow || 0,
                predicted_transactions: forecastData.predicted_transactions_tomorrow || 0
            })

            const allOrders = orderData || []
            const currentPeriodOrders = allOrders.filter(order => {
                const createdAt = new Date(order.created_at)
                return createdAt >= range.currentStart && createdAt < range.currentEnd
            })
            const previousPeriodOrders = allOrders.filter(order => {
                const createdAt = new Date(order.created_at)
                return createdAt >= range.previousStart && createdAt < range.currentStart
            })

            const trendBuckets = createTrendBuckets(range)
            const bucketMap = new Map(trendBuckets.map(bucket => [bucket.key, bucket]))

            currentPeriodOrders.forEach(order => {
                const key = getOrderBucketKey(order.created_at, range.unit)
                const bucket = bucketMap.get(key)
                if (!bucket) return
                bucket.total_revenue += Number(order.total_amount) || 0
                bucket.total_orders += 1
            })

            setSalesTrend(trendBuckets)
            setSummary(summarizeOrders(currentPeriodOrders))
            const productPerformance = buildProductPerformance(currentPeriodOrders)
            setProducts(productPerformance)
            setMatrix(classifyProducts(productPerformance))
            setCustomers(buildCustomerInsights(currentPeriodOrders))

            const currentRevenue = currentPeriodOrders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0)
            const previousRevenue = previousPeriodOrders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0)

            let computedTrendValue = 0
            let computedTrendStatus = 'neutral'

            if (previousRevenue > 0) {
                const diff = currentRevenue - previousRevenue
                computedTrendValue = Number(((diff / previousRevenue) * 100).toFixed(1))
                computedTrendStatus = computedTrendValue > 0 ? 'up' : computedTrendValue < 0 ? 'down' : 'neutral'
                computedTrendValue = Math.abs(computedTrendValue)
            } else if (currentRevenue > 0) {
                computedTrendValue = 100
                computedTrendStatus = 'up'
            }
            
            setRevenueTrend({ value: computedTrendValue, trend: computedTrendStatus })

        } catch (err) {
            console.error('Error fetching analytics:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleExport = async () => {
        if (!planLimits.exportCsv && !planLimits.exportExcel) {
            alert('Fitur Export terkunci. Silakan upgrade paket Anda ke Business atau Pro.')
            return
        }

        try {
            const range = buildPeriodRange(period)

            // 1. Fetch raw data for the selected analytics period
            const { data: rawOrders, error } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('tenant_id', tenantId)
                .neq('status', 'cancelled')
                .gte('created_at', range.currentStart.toISOString())
                .lt('created_at', range.currentEnd.toISOString())
                .order('created_at', { ascending: false })

            if (error) throw error

            // 2. Prepare Data for Excel Sheets
            const summarySheet = [
                { Metric: 'Period', Value: PERIOD_OPTIONS.find(option => option.id === period)?.title || period },
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
            const safeName = tenantName ? tenantName.replace(/[^a-zA-Z0-9]/g, '_') : 'Tendar'

            if (planLimits.exportExcel) {
                // EXCEL EXPORT (PRO PLAN): Multi-sheet
                const wsSummary = XLSX.utils.json_to_sheet(summarySheet)
                XLSX.utils.book_append_sheet(wb, wsSummary, "Summary")

                const wsProducts = XLSX.utils.json_to_sheet(products)
                XLSX.utils.book_append_sheet(wb, wsProducts, "Product Performance")

                const wsSales = XLSX.utils.json_to_sheet(salesTrend)
                XLSX.utils.book_append_sheet(wb, wsSales, "Sales Trend")

                const wsRaw = XLSX.utils.json_to_sheet(flattenedOrders)
                XLSX.utils.book_append_sheet(wb, wsRaw, "All Transactions")

                // Save as XLSX
                XLSX.writeFile(wb, `${safeName}_Report_${new Date().toISOString().split('T')[0]}.xlsx`)
            } else {
                // BASIC EXPORT (BUSINESS PLAN): Single sheet (Raw Data)
                const wsRaw = XLSX.utils.json_to_sheet(flattenedOrders)
                XLSX.utils.book_append_sheet(wb, wsRaw, "All Transactions")
                
                // Save as XLSX
                XLSX.writeFile(wb, `${safeName}_Report_${new Date().toISOString().split('T')[0]}.xlsx`)
            }

        } catch (err) {
            console.error('Export failed:', err)
            alert('Export failed. Please try again.')
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
                    <p className="text-stone-500 text-sm">
                        Overview performa bisnis {tenantName} - {PERIOD_OPTIONS.find(option => option.id === period)?.title}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="flex p-1 bg-stone-100 rounded-lg overflow-x-auto">
                        {PERIOD_OPTIONS.map(option => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setPeriod(option.id)}
                                className={`px-3 py-2 rounded-md text-sm font-bold whitespace-nowrap transition-colors ${period === option.id
                                    ? 'bg-white text-[#ff8c00] shadow-sm'
                                    : 'text-stone-500 hover:text-stone-800'
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors shadow-sm font-medium text-sm"
                    >
                        <Printer className="w-4 h-4" />
                        Print / PDF
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-colors shadow-sm font-medium text-sm"
                    >
                        <Download className="w-4 h-4" />
                        Export Data
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Total Revenue"
                    value={`Rp ${summary.total_revenue?.toLocaleString('id-ID') || 0}`}
                    iconName="dollar"
                    trend={revenueTrend.trend}
                    trendValue={revenueTrend.value}
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
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-4">
                        <h2 className="text-lg font-bold text-stone-800">Trend Penjualan</h2>
                        <span className="text-xs font-medium text-stone-400">
                            {PERIOD_OPTIONS.find(option => option.id === period)?.title}
                        </span>
                    </div>
                    <SalesTrendChart data={salesTrend} period={period} />
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
        </div>
    )
}
