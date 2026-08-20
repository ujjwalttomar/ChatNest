import { useEffect, useState } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import ChatWindow from '../components/ChatWindow'
import { useNavigate } from 'react-router-dom'

function ConvItem({ conv, active, onlineUsers, onClick, currentUserId }) {
    const isOnline = conv.type === 'direct' && onlineUsers.includes(
        conv.participants?.find(p => p !== currentUserId)
    )
    return (
        <button
            onClick={onClick}
            className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${active ? 'bg-violet-600/20 border border-violet-500/30' : 'hover:bg-[#1a1a24]'}`}
        >
            <div className="relative shrink-0">
                <div className="w-10 h-10 bg-[#2d2d3d] rounded-full flex items-center justify-center text-sm font-semibold text-white">
                    {conv.name?.[0]?.toUpperCase() || '?'}
                </div>
                {isOnline && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#0f0f13]" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-medium truncate">{conv.name}</span>
                    {conv.unreadCount > 0 && (
                        <span className="bg-violet-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                            {conv.unreadCount}
                        </span>
                    )}
                </div>
                <p className="text-slate-500 text-xs truncate">{conv.lastMessagePreview || 'No messages yet'}</p>
            </div>
        </button>
    )
}

export default function ChatPage() {
    const { user, logout } = useAuth()
    const { onlineUsers } = useSocket()
    const navigate = useNavigate()

    const [conversations, setConversations] = useState([])
    const [selected, setSelected] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [showSearch, setShowSearch] = useState(false)

    useEffect(() => {
        loadConversations()
    }, [])

    const loadConversations = async () => {
        try {
            const res = await api.get('/conversations')
            setConversations(res.data.conversations)
        } catch (e) {
            console.log(e)
        }
    }

    const handleSearch = async (e) => {
        const q = e.target.value
        setSearchQuery(q)
        if (!q.trim()) { setSearchResults([]); return }
        try {
            const res = await api.get(`/users/search?q=${q}`)
            setSearchResults(res.data.users)
        } catch {
            setSearchResults([])
        }
    }

    const startDM = async (targetUser) => {
        // check if conv already exists
        const existing = conversations.find(c =>
            c.type === 'direct' && c.participants?.includes(targetUser._id)
        )
        if (existing) {
            setSelected(existing)
            setShowSearch(false)
            return
        }
        // create by sending a message (backend creates conv lazily)
        setSelected({
            type: 'direct',
            name: targetUser.username,
            participants: [user._id, targetUser._id],
            _new: true,
            _targetId: targetUser._id
        })
        setShowSearch(false)
        setSearchQuery('')
    }

    const handleLogout = async () => {
        await logout()
        navigate('/')
    }

    const roomId = selected
        ? selected.type === 'direct'
            ? [user._id, selected.participants?.find(p => p !== user._id)].sort().join('-')
            : selected.group
        : null

    return (
        <div className="h-screen flex bg-[#0f0f13] overflow-hidden">
            {/* Sidebar */}
            <aside className="w-72 flex flex-col bg-[#13131a] border-r border-[#2d2d3d] shrink-0">
                {/* header */}
                <div className="p-4 flex items-center justify-between border-b border-[#2d2d3d]">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">C</div>
                        <span className="text-white font-semibold text-sm">ChatNest</span>
                    </div>
                    <button onClick={handleLogout} className="text-slate-500 hover:text-white text-xs transition-colors">
                        logout
                    </button>
                </div>

                {/* user info */}
                <div className="px-4 py-3 flex items-center gap-2 border-b border-[#2d2d3d]">
                    <div className="w-8 h-8 bg-violet-700 rounded-full flex items-center justify-center text-xs font-bold text-white">
                        {user?.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                        <p className="text-white text-xs font-medium">{user?.username}</p>
                        <p className="text-green-400 text-[10px]">● online</p>
                    </div>
                </div>

                {/* search */}
                <div className="p-3 border-b border-[#2d2d3d]">
                    <input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={handleSearch}
                        onFocus={() => setShowSearch(true)}
                        onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                        className="w-full bg-[#0f0f13] border border-[#2d2d3d] rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-violet-500 transition-colors"
                    />
                    {showSearch && searchResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-60 bg-[#1a1a24] border border-[#2d2d3d] rounded-xl overflow-hidden shadow-xl">
                            {searchResults.map(u => (
                                <button
                                    key={u._id}
                                    onMouseDown={() => startDM(u)}
                                    className="w-full text-left px-3 py-2.5 hover:bg-[#2d2d3d] text-white text-sm flex items-center gap-2"
                                >
                                    <div className="w-6 h-6 bg-violet-700 rounded-full flex items-center justify-center text-[10px] font-bold">
                                        {u.username[0].toUpperCase()}
                                    </div>
                                    {u.username}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* conversations list */}
                <div className="flex-1 overflow-y-auto p-2">
                    {conversations.length === 0 ? (
                        <p className="text-slate-600 text-xs text-center py-6">No conversations yet.<br />Search for a user to start chatting.</p>
                    ) : (
                        conversations.map(conv => (
                            <ConvItem
                                key={conv._id}
                                conv={conv}
                                active={selected?._id === conv._id}
                                onlineUsers={onlineUsers}
                                currentUserId={user._id}
                                onClick={() => setSelected(conv)}
                            />
                        ))
                    )}
                </div>
            </aside>

            {/* Chat area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {selected ? (
                    <>
                        {/* chat header */}
                        <div className="h-14 border-b border-[#2d2d3d] flex items-center px-5 gap-3 shrink-0">
                            <div className="w-8 h-8 bg-[#2d2d3d] rounded-full flex items-center justify-center text-sm font-bold text-white">
                                {selected.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                                <p className="text-white text-sm font-medium">{selected.name}</p>
                                <p className="text-slate-500 text-xs">
                                    {selected.type === 'direct' && onlineUsers.includes(selected.participants?.find(p => p !== user._id))
                                        ? 'online'
                                        : selected.type === 'direct' ? 'offline' : `${selected.memberCount || ''} members`
                                    }
                                </p>
                            </div>
                        </div>

                        <ChatWindow conversation={selected} roomId={roomId} />
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-14 h-14 bg-[#1a1a24] rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <span className="text-2xl">💬</span>
                            </div>
                            <p className="text-white font-medium text-sm">Your messages</p>
                            <p className="text-slate-500 text-xs mt-1">Select a conversation or search for someone</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
