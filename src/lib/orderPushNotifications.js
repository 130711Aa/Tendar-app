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
    return Boolean(VAPID_PUBLIC_KEY) && isPushSupported()
}

export async function subscribeToOrderPushNotifications({ order, tenantId, slug }) {
    if (!order?.id || !tenantId || !canUseOrderPushNotifications()) {
        return { ok: false, reason: 'unsupported' }
    }

    if (Notification.permission === 'denied') {
        return { ok: false, reason: 'denied' }
    }

    const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission()

    if (permission !== 'granted') {
        return { ok: false, reason: 'dismissed' }
    }

    const registration = await navigator.serviceWorker.register('/order-push-sw.js')
    const existingSubscription = await registration.pushManager.getSubscription()
    const subscription = existingSubscription || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    })

    const subscriptionJson = subscription.toJSON()
    const { error } = await supabase
        .from('order_push_subscriptions')
        .insert({
            tenant_id: tenantId,
            order_id: order.id,
            endpoint: subscription.endpoint,
            subscription: subscriptionJson,
            customer_name: order.customer_name || null,
            customer_phone: order.customer_phone || null,
            target_url: `${window.location.origin}/${slug}/orders`
        })

    if (error) throw error
    return { ok: true }
}
