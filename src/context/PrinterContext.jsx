import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { connectPrinter as btConnect, disconnectPrinter as btDisconnect, isConnected as btIsConnected, printOrderDirect } from '../lib/webBluetoothPrint'
import { useTenantContext } from './TenantContext'

const PrinterContext = createContext()

const LS_KEY = 'kareeem_last_printer'

export function PrinterProvider({ children }) {
    const { tenantName } = useTenantContext()
    const [btConnected, setBtConnected] = useState(false)
    const [btPrinterName, setBtPrinterName] = useState(null)
    const [btConnecting, setBtConnecting] = useState(false)
    const [lastPrinterName, setLastPrinterName] = useState(() => {
        try { return localStorage.getItem(LS_KEY) } catch { return null }
    })

    // Periodically check if the BLE device is still connected
    // (handles cases where the printer disconnects unexpectedly)
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
            // Remember last printer for reconnect UX
            setLastPrinterName(name)
            try { localStorage.setItem(LS_KEY, name) } catch { /* ignore */ }
        } catch (err) {
            // Don't alert — let the caller decide
            throw err
        } finally {
            setBtConnecting(false)
        }
    }, [btConnected])

    const handleDirectPrint = useCallback(async (order, silent = false) => {
        try {
            await printOrderDirect(order, tenantName)
        } catch (err) {
            if (!silent) {
                throw err
            }
            // Silently ignore print errors
        }
    }, [tenantName])

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
