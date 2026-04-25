import { supabase } from './supabase'

const BUCKET = 'product-images'
const MAX_SIZE_PX = 600   // max width/height in pixels
const QUALITY = 0.75      // WebP quality
const MAX_FILE_BYTES = 2 * 1024 * 1024 // 2MB upload limit

/**
 * Mengompres gambar di browser menggunakan Canvas API.
 * - Resize ke max MAX_SIZE_PX x MAX_SIZE_PX (mempertahankan aspect ratio)
 * - Konversi ke WebP dengan kualitas QUALITY
 * @param {File} file - File gambar asli
 * @returns {Promise<Blob>} - Blob gambar yang sudah dikompres
 */
export function compressImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)

        img.onload = () => {
            URL.revokeObjectURL(url)

            const { width, height } = img
            let targetW = width
            let targetH = height

            if (width > MAX_SIZE_PX || height > MAX_SIZE_PX) {
                if (width >= height) {
                    targetW = MAX_SIZE_PX
                    targetH = Math.round((height / width) * MAX_SIZE_PX)
                } else {
                    targetH = MAX_SIZE_PX
                    targetW = Math.round((width / height) * MAX_SIZE_PX)
                }
            }

            const canvas = document.createElement('canvas')
            canvas.width = targetW
            canvas.height = targetH

            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, targetW, targetH)

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Gagal mengompres gambar'))
                        return
                    }
                    resolve(blob)
                },
                'image/webp',
                QUALITY
            )
        }

        img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('Gagal memuat gambar'))
        }

        img.src = url
    })
}

/**
 * Kompres lalu upload gambar produk ke Supabase Storage.
 * @param {File} file - File gambar yang dipilih user
 * @param {string|number} tenantId - ID tenant untuk isolasi folder
 * @returns {Promise<string>} - Public URL gambar yang sudah di-upload
 */
export async function uploadProductImage(file, tenantId) {
    // 1. Kompres gambar
    const compressed = await compressImage(file)

    if (compressed.size > MAX_FILE_BYTES) {
        throw new Error('Gambar terlalu besar setelah dikompres. Coba gunakan gambar yang lebih kecil.')
    }

    // 2. Buat path unik: tenantId/timestamp-random.webp
    const timestamp = Date.now()
    const rand = Math.random().toString(36).slice(2, 7)
    const filePath = `${tenantId}/${timestamp}-${rand}.webp`

    // 3. Upload ke Supabase Storage
    const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, compressed, {
            contentType: 'image/webp',
            cacheControl: '3600',
            upsert: false,
        })

    if (error) {
        throw new Error(`Upload gagal: ${error.message}`)
    }

    // 4. Dapatkan public URL
    const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(data.path)

    return urlData.publicUrl
}

/**
 * Hapus gambar dari Supabase Storage berdasarkan public URL-nya.
 * Aman dipanggil bahkan jika URL bukan dari Storage (misal base64 lama).
 * @param {string} imageUrl - URL gambar yang ingin dihapus
 */
export async function deleteProductImage(imageUrl) {
    if (!imageUrl || imageUrl.startsWith('data:')) return // skip base64 lama

    try {
        // Ekstrak path dari URL: .../product-images/tenantId/file.webp → tenantId/file.webp
        const marker = `/object/public/${BUCKET}/`
        const idx = imageUrl.indexOf(marker)
        if (idx === -1) return

        const filePath = imageUrl.slice(idx + marker.length)
        await supabase.storage.from(BUCKET).remove([filePath])
    } catch (err) {
        console.warn('Gagal menghapus gambar lama dari Storage:', err)
        // Non-fatal — tidak perlu throw
    }
}
