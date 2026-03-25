/**
 * ============================================================
 *  🧪 EXPERIMENTAL — ESC/POS Command Builder
 *  Generates raw byte arrays that thermal printers understand.
 *  Safe to delete if Web Bluetooth approach doesn't work out.
 * ============================================================
 */

const ESC = 0x1B
const GS = 0x1D
const LF = 0x0A

// Text encoder for converting strings to bytes
const encoder = new TextEncoder()

/**
 * Concat multiple Uint8Array into one
 */
function concat(...arrays) {
    const total = arrays.reduce((sum, a) => sum + a.length, 0)
    const result = new Uint8Array(total)
    let offset = 0
    for (const a of arrays) {
        result.set(a, offset)
        offset += a.length
    }
    return result
}

// ── Primitives ──────────────────────────────────────────

/** Reset printer to default state */
export const CMD_INIT = new Uint8Array([ESC, 0x40])

/** Line feed */
export const CMD_LF = new Uint8Array([LF])

/** Feed N lines and cut paper (partial cut) */
export function cmdFeedAndCut(lines = 3) {
    return new Uint8Array([
        ESC, 0x64, lines,  // Feed n lines
        GS, 0x56, 0x01,    // Partial cut
    ])
}

/** Bold on / off */
export function cmdBold(on) {
    return new Uint8Array([ESC, 0x45, on ? 0x01 : 0x00])
}

/** Alignment: 0=left, 1=center, 2=right */
export function cmdAlign(align) {
    return new Uint8Array([ESC, 0x61, align])
}

/** Double-width + double-height on/off */
export function cmdDoubleSize(on) {
    // GS ! n — bit 4 = double width, bit 5 = double height
    return new Uint8Array([GS, 0x21, on ? 0x30 : 0x00])
}

/** Convert a string to printer bytes */
export function cmdText(str) {
    return encoder.encode(str)
}

/** Dashed separator line (32 chars for 58mm) */
export function cmdDashedLine(width = 32) {
    return concat(cmdText('-'.repeat(width)), CMD_LF)
}

// ── High-level receipt builder ──────────────────────────

const LINE_WIDTH = 32 // characters for 58mm paper

function padLine(left, right) {
    const spaces = Math.max(1, LINE_WIDTH - left.length - right.length)
    return left + ' '.repeat(spaces) + right
}

function fmtDate(iso) {
    const d = new Date(iso)
    return d.toLocaleString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

function fmtRupiah(n) {
    return 'Rp' + Number(n).toLocaleString('id-ID')
}

/**
 * Build a complete receipt as a single Uint8Array ready to send to the printer.
 * @param {Object} order — order object from the database
 * @param {string} tenantName - The store name to print on header/footer
 * @returns {Uint8Array}
 */
export function buildReceiptBytes(order, tenantName = 'Toko Saya') {
    const parts = []

    const add = (...cmds) => parts.push(...cmds)
    const text = (str) => concat(cmdText(str), CMD_LF)

    // ── INIT ──
    add(CMD_INIT)

    // ── HEADER ──
    add(cmdAlign(1)) // center
    add(cmdBold(true))
    add(text(tenantName))
    add(cmdBold(false))
    add(cmdAlign(0)) // left
    add(cmdDashedLine())

    // ── ORDER INFO ──
    add(cmdBold(true))
    add(text(`No  : ${order.order_number || '-'}`))
    add(cmdBold(false))
    add(text(`Tgl : ${fmtDate(order.created_at)}`))
    add(text(`Nama: ${order.customer_name || '-'}`))
    add(text(`Bayar: ${order.payment_method === 'cashless' ? 'QRIS' : 'Cash'}`))
    add(cmdDashedLine())

    // ── ITEMS ──
    const items = order.items || []
    items.forEach((item) => {
        const right = fmtRupiah((item.price || 0) * (item.quantity || 1))
        const label = `${item.name} x${item.quantity}`
        const maxLeft = LINE_WIDTH - right.length - 1
        const left = label.length > maxLeft ? label.slice(0, maxLeft - 1) + '~' : label
        add(text(padLine(left, right)))
    })
    add(cmdDashedLine())

    // ── TOTAL ──
    add(cmdBold(true))
    add(cmdAlign(2)) // right
    add(text(`TOTAL: ${fmtRupiah(order.total_amount)}`))
    
    // Add Kembalian details if this was a cash payment from POS
    if (order.cash_paid !== undefined && order.change_amount !== undefined) {
        add(cmdBold(false))
        add(cmdDashedLine())
        add(text(`Tunai: ${fmtRupiah(order.cash_paid)}`))
        add(text(`Kembali: ${fmtRupiah(order.change_amount)}`))
    }
    
    add(cmdBold(false))
    add(cmdAlign(0))

    // ── NOTES ──
    if (order.notes) {
        add(cmdDashedLine())
        add(cmdBold(true))
        add(text(`Catatan: ${order.notes}`))
        add(cmdBold(false))
    }

    // ── FOOTER ──
    add(cmdDashedLine())
    add(cmdAlign(1))
    add(text('Terima Kasih!'))
    add(cmdAlign(0))

    // Feed + cut
    add(cmdFeedAndCut(4))

    return concat(...parts)
}
