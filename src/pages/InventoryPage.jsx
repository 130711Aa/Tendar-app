import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import StockTable from '../components/inventory/StockTable'
import StockOpnameForm from '../components/inventory/StockOpnameForm'
import RecipeManager from '../components/inventory/RecipeManager'
import MovementLog from '../components/inventory/MovementLog'

export default function InventoryPage() {
    const [activeTab, setActiveTab] = useState('stock') // stock, opname, recipes, movements
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1)
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-stone-800">Manajemen Stok Bahan Baku</h1>
                    <p className="text-stone-500 text-sm">Monitor dan kelola inventaris bahan baku</p>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-stone-100 rounded-xl overflow-x-auto max-w-full">
                    {[
                        { id: 'stock', label: 'Stok Saat Ini', icon: 'inventory_2' },
                        { id: 'opname', label: 'Input Bahan', icon: 'add_circle' },
                        { id: 'recipes', label: 'Resep Produk', icon: 'menu_book' },
                        { id: 'movements', label: 'Riwayat', icon: 'history' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-white text-[#ff8c00] shadow-sm'
                                : 'text-stone-500 hover:text-stone-800'
                                }`}
                        >
                            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm min-h-[500px]">
                {activeTab === 'stock' && <StockTable key={refreshTrigger} />}
                {activeTab === 'opname' && <StockOpnameForm onSuccess={handleRefresh} />}
                {activeTab === 'recipes' && <RecipeManager />}
                {activeTab === 'movements' && <MovementLog key={refreshTrigger} />}
            </div>
        </div>
    )
}
