import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite plugin: serves raw JSON at /api/print-data for Bluetooth Print app
function bluetoothPrintPlugin() {
    return {
        name: 'bluetooth-print-api',
        configureServer(server) {
            server.middlewares.use('/api/print-data', (req, res) => {
                try {
                    const url = new URL(req.url, 'http://localhost')
                    const encoded = url.searchParams.get('d')

                    if (!encoded) {
                        res.writeHead(400, { 'Content-Type': 'application/json' })
                        res.end(JSON.stringify({ error: 'Missing data parameter' }))
                        return
                    }

                    // Decode base64 → raw JSON string
                    const jsonStr = Buffer.from(encoded, 'base64').toString('utf-8')

                    // Validate it's actually valid JSON
                    JSON.parse(jsonStr)

                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    })
                    res.end(jsonStr)
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ error: err.message }))
                }
            })
        }
    }
}

export default defineConfig({
    plugins: [react(), bluetoothPrintPlugin()],
    server: {
        host: true
    }
})
