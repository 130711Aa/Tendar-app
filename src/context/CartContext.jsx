import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const CartContext = createContext()

export function CartProvider({ children }) {
    const [items, setItems] = useState(() => {
        try {
            const stored = localStorage.getItem('kareeem_cart')
            return stored ? JSON.parse(stored) : []
        } catch {
            return []
        }
    })
    const [isOpen, setIsOpen] = useState(false)

    // Persist cart to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('kareeem_cart', JSON.stringify(items))
        } catch {
            // Quota exceeded — not critical
        }
    }, [items])

    const addItem = useCallback((product) => {
        setItems(prev => {
            const existing = prev.find(item => item.id === product.id)
            if (existing) {
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            }
            return [...prev, { ...product, quantity: 1 }]
        })
    }, [])

    const removeItem = useCallback((productId) => {
        setItems(prev => prev.filter(item => item.id !== productId))
    }, [])

    const updateQuantity = useCallback((productId, quantity) => {
        if (quantity <= 0) {
            setItems(prev => prev.filter(item => item.id !== productId))
            return
        }
        setItems(prev =>
            prev.map(item =>
                item.id === productId ? { ...item, quantity } : item
            )
        )
    }, [])

    const clearCart = useCallback(() => setItems([]), [])

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    return (
        <CartContext.Provider value={{
            items, addItem, removeItem, updateQuantity, clearCart,
            totalItems, totalPrice, isOpen, setIsOpen
        }}>
            {children}
        </CartContext.Provider>
    )
}

export function useCart() {
    const context = useContext(CartContext)
    if (!context) throw new Error('useCart must be used within CartProvider')
    return context
}
