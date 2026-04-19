import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { connectPrinter as btConnect, disconnectPrinter as btDisconnect, isConnected as btIsConnected, printOrderDirect } from '../lib/webBluetoothPrint'
import { useTenantContext } from './TenantContext'
import { useReceiptConfig } from '../hooks/useReceiptConfig'

const PrinterContext = createContext()

const LS_KEY = 'kareeem_last_printer'

export function PrinterProvider({ children }) {
    const { tenantName, slug } = useTenantContext()
    const [btConnected, setBtConnected] = useState(false)
    const [btPrinterName, setBtPrinterName] = useState(null)
    const [btConnecting, setBtConnecting] = useState(false)
    const [lastPrinterName, setLastPrinterName] = useState(() => {
        try { return localStorage.getItem(LS_KEY) } catch { return null }
    })

    // Load the tenant's saved receipt layout config
    const { config: receiptConfig } = useReceiptConfig(slug)

    // Periodically check if the BLE device is still connected
    useEffect(() => {
        const interval = setInterval(() => {
            if (btConnected && !btIsConnected()) {
                setBtConnected(false)
                setBtPrinterName(null)
            }
        }, 3000)
        return () => clearInterval(interval)
    }, [btConnected])

    const handleConnectPrinter = useCallback(async () => {
        if (btConnected) {
            btDisconnect()
            setBtConnected(false)
            setBtPrinterName(null)
            return
        }
        try {
            setBtConnecting(true)
            const name = await btConnect()
            setBtConnected(true)
            setBtPrinterName(name)
            setLastPrinterName(name)
            try { localStorage.setItem(LS_KEY, name) } catch { /* ignore */ }
        } catch (err) {
            throw err
        } finally {
            setBtConnecting(false)
        }
    }, [btConnected])

    /**
     * Print an order using the tenant's saved layout config.
     * - orderData (business data) comes from the order API
     * - storeName comes from TenantContext
     * - receiptConfig (layout/visibility only) comes from useReceiptConfig
     * Falls back to legacy 32-char layout when no config has been saved.
     */
    const handleDirectPrint = useCallback(async (order, silent = false) => {
        try {
            await printOrderDirect(order, tenantName, receiptConfig)
        } catch (err) {
            if (!silent) throw err
        }
    }, [tenantName, receiptConfig])

    return (
        <PrinterContext.Provider value={{
            btConnected,
            btPrinterName,
            btConnecting,
            lastPrinterName,
            handleConnectPrinter,
            handleDirectPrint,
        }}>
            {children}
        </PrinterContext.Provider>
    )
}

export function usePrinter() {
    const ctx = useContext(PrinterContext)
    if (!ctx) throw new Error('usePrinter must be used within PrinterProvider')
    return ctx
}
