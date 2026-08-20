import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
    const { user } = useAuth()
    const socketRef = useRef(null)
    const [onlineUsers, setOnlineUsers] = useState([])

    useEffect(() => {
        if (!user) return

        const socket = io('http://localhost:5000', { withCredentials: true })
        socketRef.current = socket

        socket.emit('user:online', user._id)

        socket.on('users:online', (users) => {
            setOnlineUsers(users)
        })

        return () => {
            socket.disconnect()
        }
    }, [user])

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, onlineUsers }}>
            {children}
        </SocketContext.Provider>
    )
}

export const useSocket = () => useContext(SocketContext)
