import { BrowserRouter, Routes, Route, useLocation, Navigate, useParams } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { lazy, Suspense } from 'react'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { OrdersProvider } from './context/OrdersContext'
import { CategoriesProvider } from './context/CategoriesContext'
import { ProductsProvider } from './context/ProductsContext'
import { StoreStatusProvider } from './context/StoreStatusContext'
import { PrinterProvider } from './context/PrinterContext'
import { TenantProvider } from './context/TenantContext'
import Navbar from './components/Navbar'
import CartDrawer from './components/CartDrawer'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import { useAuth } from './context/AuthContext'
import { useTenantContext } from './context/TenantContext'
import AuthPage from './pages/AuthPage'
import CustomerOrdersPage from './pages/CustomerOrdersPage'
import ProfilePage from './pages/ProfilePage'
import MenuPage from './pages/MenuPage'
import LandingPage from './pages/LandingPage'
import RegisterTenantPage from './pages/RegisterTenantPage'

// Lazy load admin & POS pages for code splitting
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const MenuManagement = lazy(() => import('./pages/MenuManagement'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const InventoryPage = lazy(() => import('./pages/InventoryPage'))
const POSPage = lazy(() => import('./pages/POSPage'))

const LoadingFallback = () => (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfaf8]">
        <div className="flex flex-col items-center gap-3">
            <span className="animate-spin material-symbols-outlined text-[#ff8c00] text-4xl">progress_activity</span>
            <p className="text-slate-400 text-sm font-medium">Memuat halaman...</p>
        </div>
    </div>
)

// Shows while tenant is being resolved from slug
const TenantLoadingFallback = () => (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfaf8]">
        <div className="flex flex-col items-center gap-3">
            <span className="animate-spin material-symbols-outlined text-[#ff8c00] text-4xl">progress_activity</span>
            <p className="text-slate-400 text-sm font-medium">Memuat toko...</p>
        </div>
    </div>
)

const TenantNotFound = ({ slug }) => (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfaf8]">
        <div className="text-center p-8">
            <span className="material-symbols-outlined text-6xl text-slate-300">store_off</span>
            <h1 className="mt-4 text-2xl font-bold text-slate-700">Toko tidak ditemukan</h1>
            <p className="mt-2 text-slate-400">Toko <strong>{slug}</strong> tidak ada atau belum aktif.</p>
            <a href="/" className="mt-6 inline-block bg-[#ff8c00] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#e07800] transition-colors">
                Kembali ke Beranda
            </a>
        </div>
    </div>
)

// Wraps all tenant-specific pages — handles tenant loading & error state
function TenantAppContent() {
    const { tenantId, tenantLoading, tenantError } = useTenantContext()
    const { slug } = useParams()
    const location = useLocation()
    const { isRecovering } = useAuth()

    const isAdmin = location.pathname.includes('/admin')
    const isPOS = location.pathname.includes('/pos')
    const isAuthPage = location.pathname.endsWith('/auth')

    if (tenantLoading) return <TenantLoadingFallback />
    if (tenantError || !tenantId) return <TenantNotFound slug={slug} />

    if (isRecovering && !isAuthPage) {
        return <Navigate to={`/${slug}/auth`} replace />
    }

    return (
        <div className="relative flex flex-col min-h-screen bg-[#fcfaf8]">
            {!isAuthPage && !isPOS && <Navbar />}
            <div className="flex-1">
                <Suspense fallback={<LoadingFallback />}>
                    <Routes>
                        {/* Customer */}
                        <Route path="" element={<MenuPage />} />
                        <Route path="auth" element={<AuthPage />} />
                        <Route path="orders" element={<CustomerOrdersPage />} />
                        <Route path="profile" element={<ProfilePage />} />

                        {/* Admin (all protected) */}
                        <Route path="admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                        <Route path="admin/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
                        <Route path="admin/menu" element={<ProtectedRoute><MenuManagement /></ProtectedRoute>} />
                        <Route path="admin/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
                        <Route path="admin/categories" element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
                        <Route path="admin/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
                        <Route path="admin/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
                        <Route path="admin/login" element={<Navigate to={`/${slug}/auth`} replace />} />

                        {/* POS */}
                        <Route path="pos" element={<ProtectedRoute><POSPage /></ProtectedRoute>} />

                        {/* Catch all */}
                        <Route path="*" element={<Navigate to={`/${slug}`} replace />} />
                    </Routes>
                </Suspense>
            </div>
            {!isAdmin && !isPOS && <CartDrawer />}
            <Toaster position="top-center" toastOptions={{ style: { pointerEvents: 'auto' }, duration: 2500 }} />
        </div>
    )
}

// Provides all tenant-scoped contexts together
function TenantProviders({ children }) {
    return (
        <OrdersProvider>
            <ProductsProvider>
                <CategoriesProvider>
                    <CartProvider>
                        <StoreStatusProvider>
                            <PrinterProvider>
                                {children}
                            </PrinterProvider>
                        </StoreStatusProvider>
                    </CartProvider>
                </CategoriesProvider>
            </ProductsProvider>
        </OrdersProvider>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <ErrorBoundary>
                <AuthProvider>
                    <Routes>
                        {/* Global pages — no tenant context needed */}
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/register" element={<RegisterTenantPage />} />

                        {/* Tenant-scoped pages — slug resolves the active tenant */}
                        <Route path="/:slug/*" element={
                            <TenantProvider>
                                <TenantProviders>
                                    <TenantAppContent />
                                </TenantProviders>
                            </TenantProvider>
                        } />

                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </AuthProvider>
            </ErrorBoundary>
        </BrowserRouter>
    )
}
