import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
    const { user } = useAuth()
    const [socket, setSocket] = useState(null)
    const [onlineUsers, setOnlineUsers] = useState([])

    useEffect(() => {
        if (!user) return

        // useRef was wrong here - socket wasn't available to children on first render
        const s = io('http://localhost:5000', { withCredentials: true })
        setSocket(s)

        s.emit('user:online', user._id)

        s.on('users:online', (users) => {
            setOnlineUsers(users)
        })

        return () => {
            s.disconnect()
        }
    }, [user])

    return (
        <SocketContext.Provider value={{ socket, onlineUsers }}>
            {children}
        </SocketContext.Provider>
    )
}

export const useSocket = () => useContext(SocketContext)

