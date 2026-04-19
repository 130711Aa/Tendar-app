/**
 * ============================================================
 *  🧪 EXPERIMENTAL — Web Bluetooth Direct Printing
 *  Connects to a Bluetooth thermal printer and sends raw
 *  ESC/POS data directly — no third-party app needed.
 *
 *  Requirements:
 *  - HTTPS or localhost
 *  - Chrome / Edge (no Safari support)
 *  - User gesture required for requestDevice()
 *
 *  Safe to delete if this approach doesn't work out.
 * ============================================================
 */

import { buildReceiptBytes } from './escpos'

// Common Bluetooth serial / printer service UUIDs
const PRINTER_SERVICE_UUIDS = [
    '000018f0-0000-1000-8000-00805f9b34fb', // common thermal printer
    '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC / generic BLE serial
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // RD Printer / other
]

const PRINTER_CHAR_UUIDS = [
    '00002af1-0000-1000-8000-00805f9b34fb', // common write characteristic
    '49535343-8841-43f4-a8d4-ecbe34729bb3', // ISSC write
    'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f', // RD Printer write
]

// ── State ───────────────────────────────────────────────

let connectedDevice = null
let printerCharacteristic = null

/**
 * @returns {boolean} Whether we're currently connected
 */
export function isConnected() {
    return !!(connectedDevice?.gatt?.connected && printerCharacteristic)
}

/**
 * Get the connected printer name, or null
 */
export function getConnectedPrinterName() {
    if (!isConnected()) return null
    return connectedDevice.name || 'Unknown Printer'
}

/**
 * Request and connect to a Bluetooth printer.
 * Must be called from a user gesture (click handler).
 * @returns {Promise<string>} printer name
 */
export async function connectPrinter() {
    if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth tidak didukung di browser ini. Gunakan Chrome atau Edge.')
    }

    // Disconnect existing device first
    if (connectedDevice?.gatt?.connected) {
        try { connectedDevice.gatt.disconnect() } catch (_) { /* ignore */ }
    }

    console.log('[WebBT] Requesting device...')

    // Try with known service UUIDs first, fallback to acceptAllDevices
    let device
    try {
        device = await navigator.bluetooth.requestDevice({
            // Accept all devices to maximize compatibility
            acceptAllDevices: true,
            optionalServices: PRINTER_SERVICE_UUIDS,
        })
    } catch (err) {
        if (err.name === 'NotFoundError') {
            throw new Error('Tidak ada printer yang dipilih.')
        }
        throw err
    }

    console.log('[WebBT] Connecting to GATT server...')
    const server = await device.gatt.connect()

    // Try each known service UUID
    let characteristic = null
    for (const svcUuid of PRINTER_SERVICE_UUIDS) {
        try {
            console.log(`[WebBT] Trying service ${svcUuid}...`)
            const service = await server.getPrimaryService(svcUuid)

            // Try each known characteristic UUID
            for (const charUuid of PRINTER_CHAR_UUIDS) {
                try {
                    const char = await service.getCharacteristic(charUuid)
                    // Check if writable
                    if (char.properties.write || char.properties.writeWithoutResponse) {
                        characteristic = char
                        console.log(`[WebBT] ✅ Found writable characteristic: ${charUuid}`)
                        break
                    }
                } catch (_) { /* try next */ }
            }

            // If specific UUIDs didn't work, try all characteristics
            if (!characteristic) {
                const chars = await service.getCharacteristics()
                for (const char of chars) {
                    if (char.properties.write || char.properties.writeWithoutResponse) {
                        characteristic = char
                        console.log(`[WebBT] ✅ Found writable characteristic: ${char.uuid}`)
                        break
                    }
                }
            }

            if (characteristic) break
        } catch (_) { /* try next service */ }
    }

    if (!characteristic) {
        device.gatt.disconnect()
        throw new Error('Printer tidak kompatibel — tidak ditemukan characteristic yang bisa ditulis. Coba printer lain.')
    }

    // Listen for disconnection
    device.addEventListener('gattserverdisconnected', () => {
        console.log('[WebBT] Printer disconnected')
        connectedDevice = null
        printerCharacteristic = null
    })

    connectedDevice = device
    printerCharacteristic = characteristic

    return device.name || 'Bluetooth Printer'
}

/**
 * Disconnect from the current printer
 */
export function disconnectPrinter() {
    if (connectedDevice?.gatt?.connected) {
        connectedDevice.gatt.disconnect()
    }
    connectedDevice = null
    printerCharacteristic = null
}


/**
 * Send raw bytes to the connected printer in chunks.
 * BLE has a max payload of ~20 bytes per write, so we chunk it.
 */
async function sendBytes(data) {
    if (!printerCharacteristic) {
        throw new Error('Printer belum terhubung.')
    }

    const CHUNK_SIZE = 100 // bytes per write (safe for most BLE printers)
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE)
        if (printerCharacteristic.properties.writeWithoutResponse) {
            await printerCharacteristic.writeValueWithoutResponse(chunk)
        } else {
            await printerCharacteristic.writeValueWithResponse(chunk)
        }
        // Small delay between chunks for printer to process
        await new Promise(r => setTimeout(r, 20))
    }
}

/**
 * Send pre-built ESC/POS bytes directly to the connected printer.
 * Use this when you want full control over the receipt bytes (e.g. in
 * ReceiptDesignerPage where you want to print with the current unsaved layout).
 * @param {Uint8Array} data
 */
export async function sendRawBytes(data) {
    if (!isConnected()) {
        throw new Error('Printer belum terhubung. Klik tombol "Hubungkan Printer" terlebih dahulu.')
    }
    console.log(`[WebBT] Sending ${data.length} raw bytes...`)
    await sendBytes(data)
    console.log('[WebBT] ✅ Done.')
}

/**
 * Print an order receipt directly via Web Bluetooth.
 * Uses the saved layoutConfig from PrinterContext.
 * The printer must already be connected via connectPrinter().
 *
 * @param {Object} order           - Order object from the API
 * @param {string} tenantName      - The store name (fallback header)
 * @param {Object} [layoutConfig]  - Layout/visibility preferences. Falls back to
 *                                   legacy 32-char layout when null/undefined.
 */
export async function printOrderDirect(order, tenantName = 'Toko Saya', layoutConfig = null) {
    if (!isConnected()) {
        throw new Error('Printer belum terhubung. Klik tombol "Hubungkan Printer" terlebih dahulu.')
    }

    const receiptBytes = buildReceiptBytes(order, tenantName, layoutConfig)
    console.log(`[WebBT] Sending ${receiptBytes.length} bytes to printer...`)
    await sendBytes(receiptBytes)
    console.log('[WebBT] ✅ Print complete!')
}

