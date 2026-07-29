'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface Message {
  id: string
  direction: string
  type: string
  body: string
  transcript: string | null
  agentGenderUsed: string | null
  agentLanguageUsed: string | null
  ts: Date
}

interface ConversationMeta {
  id: string
  takenOverBy: string | null
}

const EMPTY_CONVO: ConversationMeta = { id: '', takenOverBy: null }

export function useConversationChat(conversationId: string | null, initialMessages: Message[], initialConvo: ConversationMeta | null) {
  const [convo, setConvo] = useState<ConversationMeta>(initialConvo || EMPTY_CONVO)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setMessages(initialMessages)
    if (initialConvo) setConvo(initialConvo)
    else setConvo(EMPTY_CONVO)
    setInput('')
  }, [conversationId, initialMessages, initialConvo])

  const takeover = useCallback(async () => {
    if (!conversationId) return
    const res = await fetch(`/api/conversations/${conversationId}/takeover`, { method: 'POST' })
    const json = await res.json()
    if (json.ok) {
      setConvo((prev) => ({ ...prev, takenOverBy: 'me' }))
      toast.success('You have taken over — agent paused for this patient')
    } else toast.error(json.error)
  }, [conversationId])

  const release = useCallback(async () => {
    if (!conversationId) return
    const res = await fetch(`/api/conversations/${conversationId}/release`, { method: 'POST' })
    const json = await res.json()
    if (json.ok) {
      setConvo((prev) => ({ ...prev, takenOverBy: null }))
      toast.success('Released back to AI agent')
    } else toast.error(json.error)
  }, [conversationId])

  const send = useCallback(async () => {
    if (!input.trim() || loading || !conversationId) return
    setLoading(true)
    const res = await fetch(`/api/conversations/${conversationId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: input }),
    })
    const json = await res.json()
    setLoading(false)
    if (json.ok) {
      setMessages((prev) => [...prev, json.data])
      setInput('')
    } else toast.error(json.error)
  }, [input, loading, conversationId])

  function insertQuickReply(text: string) {
    setInput((prev) => (prev ? prev + ' ' + text : text))
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return { convo, messages, input, setInput, loading, takeover, release, send, insertQuickReply, onKeyDown }
}
