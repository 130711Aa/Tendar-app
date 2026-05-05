import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; i += 1) {
        outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
}

function isPushSupported() {
    return typeof window !== 'undefined'
        && 'serviceWorker' in navigator
        && 'PushManager' in window
        && 'Notification' in window
}

export function canUseOrderPushNotifications() {
    const hasKey = Boolean(VAPID_PUBLIC_KEY)
    const supported = isPushSupported()
    if (!hasKey) console.warn('[PushNotif] VITE_VAPID_PUBLIC_KEY tidak ditemukan di env!')
    if (!supported) console.warn('[PushNotif] Browser tidak support Push Notifications. serviceWorker:', 'serviceWorker' in navigator, '| PushManager:', 'PushManager' in window, '| Notification:', 'Notification' in window)
    return hasKey && supported
}

export async function subscribeToOrderPushNotifications({ order, tenantId, slug }) {
    console.log('[PushNotif] Mulai subscribe untuk order', order?.id, '| tenantId:', tenantId)

    if (!order?.id || !tenantId) {
        console.warn('[PushNotif] Gagal: order.id atau tenantId tidak ada')
        return { ok: false, reason: 'missing_params' }
    }

    if (!canUseOrderPushNotifications()) {
        return { ok: false, reason: 'unsupported' }
    }

    console.log('[PushNotif] Permission saat ini:', Notification.permission)

    if (Notification.permission === 'denied') {
        console.warn('[PushNotif] Izin notifikasi sudah di-block oleh user')
        return { ok: false, reason: 'denied' }
    }

    const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission()

    console.log('[PushNotif] Permission setelah request:', permission)

    if (permission !== 'granted') {
        console.warn('[PushNotif] User menolak izin notifikasi')
        return { ok: false, reason: 'dismissed' }
    }

    // Register service worker dan dapatkan subscription
    const registration = await navigator.serviceWorker.register('/order-push-sw.js')
    await navigator.serviceWorker.ready

    // Selalu pastikan ada subscription aktif
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        })
    }

    const subscriptionJson = subscription.toJSON()

    // Upsert: jika kombinasi order_id+endpoint sudah ada, update saja
    const { error } = await supabase
        .from('order_push_subscriptions')
        .upsert({
            tenant_id: tenantId,
            order_id: order.id,
            endpoint: subscription.endpoint,
            subscription: subscriptionJson,
            customer_name: order.customer_name || null,
            customer_phone: order.customer_phone || null,
            target_url: `${window.location.origin}/${slug}/orders`,
            notified_completed_at: null,
            last_error: null
        }, {
            onConflict: 'order_id,endpoint'
        })

    if (error) {
        console.error('[PushNotif] Gagal menyimpan subscription:', error)
        throw error
    }

    console.log('[PushNotif] Subscription berhasil didaftarkan untuk order', order.id)
    return { ok: true }
}
