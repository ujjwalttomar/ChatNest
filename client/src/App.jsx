import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import LoginPage from './pages/LoginPage'
import ChatPage from './pages/ChatPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

function PrivateRoute({ children }) {
    const { user, loading } = useAuth()
    if (loading) return <div className="h-screen bg-[#0f0f13] flex items-center justify-center"><span className="text-slate-500 text-sm">Loading...</span></div>
    return user ? children : <Navigate to="/" />
}

function PublicRoute({ children }) {
    const { user, loading } = useAuth()
    if (loading) return null
    return user ? <Navigate to="/chat" /> : children
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/chat" element={
                <PrivateRoute>
                    <SocketProvider>
                        <ChatPage />
                    </SocketProvider>
                </PrivateRoute>
            } />
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    )
}
