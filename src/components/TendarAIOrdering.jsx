import { useState, useRef, useEffect, useCallback } from 'react'

const BRAND = '#FF8C00'
const BRAND_DARK = '#E07800'
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro']

const ADD_TO_CART_TOOL = {
  functionDeclarations: [{
    name: 'add_to_cart',
    description: 'Tambahkan satu atau lebih item ke keranjang belanja customer. Panggil fungsi ini ketika customer meminta untuk memesan menu tertentu.',
    parameters: {
      type: 'OBJECT',
      properties: {
        items: {
          type: 'ARRAY',
          description: 'Daftar item yang akan ditambahkan ke keranjang',
          items: {
            type: 'OBJECT',
            properties: {
              item_id: { type: 'STRING', description: 'ID unik dari menu item' },
              item_name: { type: 'STRING', description: 'Nama menu item' },
              quantity: { type: 'INTEGER', description: 'Jumlah yang dipesan' },
              reason: { type: 'STRING', description: 'Alasan singkat rekomendasi (opsional)' },
            },
            required: ['item_id', 'item_name', 'quantity'],
          },
        },
        confirmation_message: {
          type: 'STRING',
          description: 'Pesan konfirmasi kepada customer setelah menambahkan item, dalam bahasa yang sama dengan customer.',
        },
      },
      required: ['items', 'confirmation_message'],
    },
  }],
}

function formatRp(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID')
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: '#ccc',
          animation: 'tendarBounce 1.2s infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  )
}

function CartItemCard({ item }) {
  return (
    <div style={{
      background: '#fff7ed', border: `1px solid ${BRAND}33`,
      borderRadius: 10, padding: '8px 12px', marginTop: 8,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: BRAND, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0, fontSize: 16,
      }}>🛒</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.item_name}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: BRAND_DARK }}>
          x{item.quantity} · {item.price ? formatRp(item.price * item.quantity) : ''}
        </p>
      </div>
    </div>
  )
}

function ChatBubble({ msg }) {
  const isAI = msg.role === 'ai'
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isAI ? 'flex-start' : 'flex-end',
      marginBottom: 12,
    }}>
      {isAI && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: '#fff', fontWeight: 700,
          }}>✦</div>
          <span style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>AI Assistant</span>
        </div>
      )}
      <div style={{
        maxWidth: '85%',
        background: isAI ? '#fff' : `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`,
        color: isAI ? '#1a1a1a' : '#fff',
        borderRadius: isAI ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
        padding: '10px 14px',
        fontSize: 13, lineHeight: 1.55,
        boxShadow: isAI ? '0 2px 8px rgba(0,0,0,0.06)' : `0 4px 12px ${BRAND}44`,
        border: isAI ? '1px solid #f0f0f0' : 'none',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {msg.typing ? <TypingDots /> : (msg.text ? msg.text.replace(/\*\*/g, '').replace(/\*/g, '') : '')}
        {isAI && msg.cartItems && msg.cartItems.map((item, i) => (
          <CartItemCard key={i} item={item} />
        ))}
      </div>
    </div>
  )
}

export default function TendarAIOrdering({ menuItems = [], onAddToCart, merchantName = 'Warung', cartIsOpen = false }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [pulse, setPulse] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const chatHistory = useRef([]) // Gemini multi-turn history
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  // Build system prompt from menuItems
  const systemPrompt = useCallback(() => {
    const available = menuItems.filter(m => m.is_available !== false)
    const menuList = available.map(m =>
      `- ID: ${m.id} | Nama: ${m.name} | Harga: Rp${Number(m.price).toLocaleString('id-ID')} | Kategori: ${m.category || '-'}${m.description ? ` | Deskripsi: ${m.description}` : ''}`
    ).join('\n')

    return `Kamu adalah asisten pemesanan AI yang sangat ramah, asik, dan helpful untuk pelanggan warung "${merchantName}". 
Tugasmu membantu customer memesan makanan/minuman melalui percakapan natural seperti ngobrol dengan kasir/pelayan sungguhan.

MENU YANG TERSEDIA HARI INI:
${menuList}

PANDUAN SANGAT PENTING:
1. JANGAN PERNAH menyebutkan "ID" menu kepada customer.
2. JANGAN PERNAH menggunakan simbol markdown seperti bintang (*), bold (**), atau list point (-). Gunakan kalimat biasa yang mengalir.
3. Gunakan enter (baris baru) untuk memisahkan paragraf agar rapi, dan gunakan emoji secukupnya agar terlihat friendly.
4. Jawab dalam bahasa yang digunakan customer (Indonesia santai, Jawa, Sunda, dll).
5. Jika customer menyebut menu yang tidak ada, sarankan menu terdekat yang tersedia dengan ramah.
6. Saat customer mau memesan, LANGSUNG panggil tool add_to_cart, jangan banyak tanya konfirmasi.
7. Selalu ramah, singkat, dan tidak kaku.`
  }, [menuItems, merchantName])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300)
      if (!initialized) {
        setInitialized(true)
        // Greeting
        setMessages([{
          id: Date.now(), role: 'ai',
          text: `Halo! 👋 Selamat datang di ${merchantName}. Saya asisten AI yang siap bantu kamu memesan. Mau pesan apa hari ini, atau butuh rekomendasi? 😊`,
        }])
      }
    }
  }, [open, initialized, merchantName])

  // FAB pulse animation
  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 2500)
    return () => clearInterval(t)
  }, [])

  function addMessage(msg) {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), ...msg }])
  }

  function removeTyping() {
    setMessages(prev => prev.filter(m => !m.typing))
  }

  // Execute function call from Gemini
  function executeFunctionCall(fnCall) {
    const { name, args } = fnCall
    if (name !== 'add_to_cart') return null

    const addedItems = []
    for (const item of (args.items || [])) {
      const menuItem = menuItems.find(m => String(m.id) === String(item.item_id))
      if (menuItem) {
        onAddToCart(menuItem, item.quantity)
        addedItems.push({ ...item, price: menuItem.price })
      }
    }

    return { addedItems, confirmationMessage: args.confirmation_message }
  }

  async function sendToGemini(userText) {
    if (!apiKey) {
      addMessage({ role: 'ai', text: '⚠️ Gemini API key belum dikonfigurasi (VITE_GEMINI_API_KEY).' })
      return
    }

    // Add user turn to history
    chatHistory.current.push({ role: 'user', parts: [{ text: userText }] })

    setLoading(true)
    addMessage({ role: 'ai', typing: true })

    try {
      const body = {
        system_instruction: { parts: [{ text: systemPrompt() }] },
        contents: chatHistory.current,
        tools: [ADD_TO_CART_TOOL],
        tool_config: { function_calling_config: { mode: 'AUTO' } },
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }

      let data = null
      let lastErr = null
      for (const model of GEMINI_MODELS) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}))
            lastErr = new Error(errData?.error?.message || `HTTP ${res.status}`)
            continue
          }
          data = await res.json()
          break
        } catch (e) { lastErr = e }
      }
      if (!data) throw lastErr || new Error('Semua model gagal')
      const candidate = data.candidates?.[0]
      const parts = candidate?.content?.parts || []

      removeTyping()

      // Add model response to history
      chatHistory.current.push({ role: 'model', parts })

      let aiText = ''
      let cartItems = []
      let fnCallResult = null

      for (const part of parts) {
        if (part.text) aiText += part.text
        if (part.functionCall) {
          fnCallResult = executeFunctionCall(part.functionCall)
          if (fnCallResult) cartItems = fnCallResult.addedItems
        }
      }

      // Show AI message
      if (fnCallResult) {
        // Add function response to history for multi-turn
        chatHistory.current.push({
          role: 'user',
          parts: [{
            functionResponse: {
              name: 'add_to_cart',
              response: { success: true, items_added: cartItems.length },
            },
          }],
        })

        addMessage({
          role: 'ai',
          text: fnCallResult.confirmationMessage || aiText || 'Item berhasil ditambahkan ke keranjang! 🎉',
          cartItems,
        })
      } else if (aiText) {
        addMessage({ role: 'ai', text: aiText })
      }

    } catch (err) {
      removeTyping()
      console.error('Gemini error:', err)
      addMessage({ role: 'ai', text: `Maaf, ada gangguan koneksi: ${err.message}` })
    } finally {
      setLoading(false)
    }
  }

  async function handleSend(text) {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    addMessage({ role: 'user', text: msg })
    await sendToGemini(msg)
  }

  // Voice input
  function toggleVoice() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      addMessage({ role: 'ai', text: '⚠️ Browser kamu tidak mendukung input suara. Coba Chrome atau Edge.' })
      return
    }

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = 'id-ID'
    rec.interimResults = false
    rec.maxAlternatives = 1

    rec.onstart = () => setListening(true)
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)

    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript || ''
      if (transcript) handleSend(transcript)
    }

    recognitionRef.current = rec
    rec.start()
  }

  const availableCount = menuItems.filter(m => m.is_available !== false).length

  return (
    <>
      {/* Keyframes */}
      <style>{`
        @keyframes tendarBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes tendarFadeUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tendarPulseRing {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes tendarSpin {
          to { transform: rotate(360deg); }
        }
        .tendar-widget {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .tendar-widget.cart-open {
          transform: translateX(-100vw) !important;
        }
        @media (min-width: 768px) {
          .tendar-widget.cart-open {
            transform: translateX(-448px) !important;
          }
        }
        .tendar-input::-webkit-scrollbar {
          display: none;
        }
        .tendar-input {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Chat Panel */}
      {open && (
        <div 
          className={`tendar-widget ${cartIsOpen ? 'cart-open' : ''}`}
          style={{
            position: 'fixed', bottom: 90, right: 20,
            width: 360, maxWidth: 'calc(100vw - 40px)',
            height: 520, maxHeight: 'calc(100vh - 120px)',
            background: '#f8f9fa',
            borderRadius: 20,
            boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
            display: 'flex', flexDirection: 'column',
            zIndex: 9999,
            animation: 'tendarFadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10,
            flexShrink: 0,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>✦</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
                AI Order Assistant
              </p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>
                {availableCount} menu tersedia · Powered by Gemini
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 16, transition: 'background 0.2s',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            >✕</button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '16px 14px',
            scrollbarWidth: 'thin', scrollbarColor: '#e0e0e0 transparent',
          }}>
            {messages.map(msg => (
              <ChatBubble key={msg.id} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions */}
          {messages.length <= 1 && !loading && (
            <div style={{ padding: '0 14px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Rekomendasikan menu 🍽️', 'Menu terlaris ⭐', 'Ada promo apa?'].map(s => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  style={{
                    padding: '6px 12px', borderRadius: 20,
                    border: `1px solid ${BRAND}55`,
                    background: '#fff7ed', color: BRAND_DARK,
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = BRAND; e.currentTarget.style.color = '#fff' }}
                  onMouseOut={e => { e.currentTarget.style.background = '#fff7ed'; e.currentTarget.style.color = BRAND_DARK }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div style={{
            padding: '10px 12px 12px',
            background: '#fff',
            borderTop: '1px solid #f0f0f0',
            display: 'flex', gap: 8, alignItems: 'flex-end',
            flexShrink: 0,
          }}>
            {/* Voice button */}
            <button
              onClick={toggleVoice}
              title={listening ? 'Stop recording' : 'Pesan dengan suara'}
              style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                border: 'none', cursor: 'pointer',
                background: listening ? '#ef4444' : '#f3f4f5',
                color: listening ? '#fff' : '#666',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, transition: 'all 0.2s',
                animation: listening ? 'tendarSpin 2s linear infinite' : 'none',
              }}
            >
              {listening ? '⏹' : '🎤'}
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ketik pesanan..."
              rows={1}
              className="tendar-input"
              style={{
                flex: 1, resize: 'none', border: '1.5px solid #e8e8e8',
                borderRadius: 12, padding: '9px 12px',
                fontSize: 13, lineHeight: 1.4,
                fontFamily: 'inherit', outline: 'none',
                transition: 'border-color 0.2s',
                maxHeight: 80,
                background: '#fafafa',
              }}
              onFocus={e => e.target.style.borderColor = BRAND}
              onBlur={e => e.target.style.borderColor = '#e8e8e8'}
            />

            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                background: input.trim() && !loading ? `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` : '#e8e8e8',
                color: input.trim() && !loading ? '#fff' : '#aaa',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, transition: 'all 0.25s',
                boxShadow: input.trim() && !loading ? `0 4px 12px ${BRAND}55` : 'none',
              }}
            >
              {loading ? (
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid #fff',
                  animation: 'tendarSpin 0.8s linear infinite',
                }} />
              ) : '➤'}
            </button>
          </div>
        </div>
      )}

      {/* FAB Button */}
      <div 
        className={`tendar-widget ${cartIsOpen ? 'cart-open' : ''}`}
        style={{ position: 'fixed', bottom: 24, right: 20, zIndex: 9998 }}
      >
        {/* Pulse ring */}
        {!open && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: BRAND, opacity: 0,
            animation: 'tendarPulseRing 2.5s ease-out infinite',
          }} />
        )}
        <button
          onClick={() => setOpen(o => !o)}
          title="AI Order Assistant"
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: open ? '#64748b' : `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: open ? 20 : 24,
            boxShadow: open
              ? '0 4px 16px rgba(0,0,0,0.2)'
              : `0 8px 24px ${BRAND}66, 0 2px 8px rgba(0,0,0,0.15)`,
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: open ? 'scale(0.9)' : 'scale(1)',
            color: '#fff',
          }}
          onMouseOver={e => { if (!open) e.currentTarget.style.transform = 'scale(1.1)' }}
          onMouseOut={e => { if (!open) e.currentTarget.style.transform = 'scale(1)' }}
        >
          {open ? '✕' : '✦'}
        </button>

        {/* Tooltip */}
        {!open && (
          <div style={{
            position: 'absolute', right: 64, top: '50%', transform: 'translateY(-50%)',
            background: '#1a1a1a', color: '#fff',
            padding: '6px 12px', borderRadius: 8,
            fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
            pointerEvents: 'none', opacity: pulse ? 1 : 0,
            transition: 'opacity 0.5s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}>
            Pesan dengan AI ✨
            <div style={{
              position: 'absolute', right: -5, top: '50%', transform: 'translateY(-50%)',
              width: 0, height: 0,
              borderLeft: '5px solid #1a1a1a',
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
            }} />
          </div>
        )}
      </div>
    </>
  )
}
