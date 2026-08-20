import { useEffect, useRef, useState } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'

// check marks for message status
function StatusTick({ status, fromSelf }) {
    if (!fromSelf) return null
    if (status === 'sent') return <span className="text-slate-500 text-xs">✓</span>
    if (status === 'delivered') return <span className="text-slate-400 text-xs">✓✓</span>
    if (status === 'read') return <span className="text-violet-400 text-xs">✓✓</span>
    return null
}

export default function ChatWindow({ conversation, roomId }) {
    const { user } = useAuth()
    const { socket } = useSocket()

    const [messages, setMessages] = useState([])
    const [text, setText] = useState('')
    const [typing, setTyping] = useState(false)
    const [otherTyping, setOtherTyping] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [editText, setEditText] = useState('')

    const bottomRef = useRef(null)
    const typingTimer = useRef(null)

    const isDirect = conversation?.type === 'direct'
    const contactId = isDirect ? conversation?.participants?.find(p => p !== user._id) : null

    // load messages
    useEffect(() => {
        if (!conversation) return
        const fetch = isDirect
            ? api.get(`/messages/direct/${contactId}`)
            : api.get(`/messages/group/${conversation.group}`)

        fetch.then(res => setMessages(res.data.messages)).catch(console.error)
    }, [conversation])

    // socket: join room + listen for events
    useEffect(() => {
        if (!socket || !roomId) return

        socket.emit('room:join', roomId)

        socket.on('message:receive', (msg) => {
            setMessages(prev => [...prev, msg])
            // mark as delivered
            socket.emit('message:delivered', { messageId: msg._id, senderId: msg.sender?._id || msg.sender })
        })

        socket.on('message:delivered', ({ messageId }) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status: 'delivered' } : m))
        })

        socket.on('message:read', ({ messageId }) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status: 'read' } : m))
        })

        socket.on('typing:start', ({ username }) => {
            setOtherTyping(username)
        })

        socket.on('typing:stop', () => {
            setOtherTyping(false)
        })

        return () => {
            socket.emit('room:leave', roomId)
            socket.off('message:receive')
            socket.off('message:delivered')
            socket.off('message:read')
            socket.off('typing:start')
            socket.off('typing:stop')
        }
    }, [socket, roomId])

    // scroll to bottom when messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, otherTyping])

    const handleTextChange = (e) => {
        setText(e.target.value)
        if (!typing && socket) {
            setTyping(true)
            socket.emit('typing:start', { roomId, username: user.username })
        }
        clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => {
            setTyping(false)
            socket?.emit('typing:stop', { roomId })
        }, 2000)
    }

    const sendMessage = async (e) => {
        e.preventDefault()
        if (!text.trim()) return

        try {
            const payload = isDirect
                ? { receiverId: contactId, text: text.trim() }
                : { groupId: conversation.group, text: text.trim() }

            const endpoint = isDirect ? '/messages/direct' : '/messages/group'
            const res = await api.post(endpoint, payload)
            const newMsg = { ...res.data.message, fromSelf: true }

            setMessages(prev => [...prev, newMsg])
            socket?.emit('message:send', { roomId, message: newMsg })
            setText('')
            socket?.emit('typing:stop', { roomId })
            setTyping(false)
        } catch (err) {
            console.log('send error', err)
        }
    }

    const handleEdit = async (msgId) => {
        if (!editText.trim()) return
        try {
            await api.patch(`/messages/${msgId}`, { text: editText.trim() })
            setMessages(prev => prev.map(m => m._id === msgId ? { ...m, text: editText.trim(), edited: true } : m))
            setEditingId(null)
        } catch (err) {
            console.log('edit error', err)
        }
    }

    const handleDelete = async (msgId, type) => {
        try {
            await api.delete(`/messages/${msgId}`, { data: { deleteType: type } })
            if (type === 'everyone') {
                setMessages(prev => prev.map(m => m._id === msgId ? { ...m, deleted: true, text: '' } : m))
            } else {
                setMessages(prev => prev.filter(m => m._id !== msgId))
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Could not delete')
        }
    }

    if (!conversation) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-slate-600 text-sm">Select a conversation</p>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* messages area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                {messages.map((msg) => (
                    <div key={msg._id} className={`flex ${msg.fromSelf ? 'justify-end' : 'justify-start'} group`}>
                        <div className={`max-w-[65%] ${msg.fromSelf ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                            {!isDirect && !msg.fromSelf && (
                                <span className="text-violet-400 text-xs px-1">{msg.sender?.username}</span>
                            )}
                            {editingId === msg._id ? (
                                <div className="flex gap-2 items-center">
                                    <input
                                        autoFocus
                                        value={editText}
                                        onChange={e => setEditText(e.target.value)}
                                        className="bg-[#1a1a24] border border-violet-500 rounded-xl px-3 py-2 text-white text-sm outline-none"
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleEdit(msg._id)
                                            if (e.key === 'Escape') setEditingId(null)
                                        }}
                                    />
                                    <button onClick={() => handleEdit(msg._id)} className="text-violet-400 text-xs hover:text-violet-300">Save</button>
                                    <button onClick={() => setEditingId(null)} className="text-slate-500 text-xs hover:text-slate-300">Cancel</button>
                                </div>
                            ) : (
                                <div className={`relative rounded-2xl px-4 py-2.5 text-sm ${msg.fromSelf ? 'bg-violet-600 text-white rounded-br-sm' : 'bg-[#1a1a24] text-slate-200 rounded-bl-sm'}`}>
                                    {msg.deleted ? (
                                        <span className="italic text-xs opacity-50">This message was deleted</span>
                                    ) : (
                                        <span>{msg.text}</span>
                                    )}
                                    {msg.edited && !msg.deleted && (
                                        <span className="text-xs opacity-50 ml-1">(edited)</span>
                                    )}
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 px-1">
                                <span className="text-[10px] text-slate-600">
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <StatusTick status={msg.status} fromSelf={msg.fromSelf} />

                                {/* actions - show on hover */}
                                {msg.fromSelf && !msg.deleted && (
                                    <div className="hidden group-hover:flex items-center gap-1">
                                        <button
                                            onClick={() => { setEditingId(msg._id); setEditText(msg.text) }}
                                            className="text-[10px] text-slate-500 hover:text-slate-300"
                                        >
                                            edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(msg._id, 'everyone')}
                                            className="text-[10px] text-slate-500 hover:text-red-400"
                                        >
                                            delete
                                        </button>
                                    </div>
                                )}
                                {!msg.fromSelf && !msg.deleted && (
                                    <button
                                        onClick={() => handleDelete(msg._id, 'me')}
                                        className="hidden group-hover:block text-[10px] text-slate-500 hover:text-red-400"
                                    >
                                        hide
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {otherTyping && (
                    <div className="flex justify-start">
                        <div className="bg-[#1a1a24] rounded-2xl rounded-bl-sm px-4 py-2.5 text-xs text-slate-400 italic">
                            {otherTyping} is typing...
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-[#2d2d3d] flex gap-3 items-center">
                <input
                    value={text}
                    onChange={handleTextChange}
                    placeholder="Type a message..."
                    className="flex-1 bg-[#1a1a24] border border-[#2d2d3d] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-violet-500 transition-colors"
                />
                <button
                    type="submit"
                    disabled={!text.trim()}
                    className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-xl px-5 py-3 text-sm font-medium transition-colors"
                >
                    Send
                </button>
            </form>
        </div>
    )
}
