import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
    const { login } = useAuth()
    const navigate = useNavigate()

    const [tab, setTab] = useState('login')
    const [form, setForm] = useState({ username: '', email: '', password: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const [forgotMode, setForgotMode] = useState(false)
    const [forgotEmail, setForgotEmail] = useState('')
    const [forgotMsg, setForgotMsg] = useState('')

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
        setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const endpoint = tab === 'login' ? '/auth/login' : '/auth/register'
            const payload = tab === 'login'
                ? { email: form.email, password: form.password }
                : { username: form.username, email: form.email, password: form.password }

            const res = await api.post(endpoint, payload)
            login(res.data.user)
            navigate('/chat')
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    const handleForgot = async (e) => {
        e.preventDefault()
        try {
            await api.post('/auth/forgot-password', { email: forgotEmail })
            setForgotMsg('If that email exists, a reset link has been sent.')
        } catch {
            setForgotMsg('Something went wrong, try again.')
        }
    }

    if (forgotMode) {
        return (
            <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center p-4">
                <div className="bg-[#1a1a24] border border-[#2d2d3d] rounded-2xl p-8 w-full max-w-sm">
                    <h2 className="text-white text-xl font-semibold mb-1">Forgot password</h2>
                    <p className="text-slate-400 text-sm mb-6">We'll send you a reset link</p>
                    {forgotMsg ? (
                        <p className="text-green-400 text-sm">{forgotMsg}</p>
                    ) : (
                        <form onSubmit={handleForgot} className="flex flex-col gap-3">
                            <input
                                type="email"
                                placeholder="Your email"
                                value={forgotEmail}
                                onChange={e => setForgotEmail(e.target.value)}
                                className="bg-[#0f0f13] border border-[#2d2d3d] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-violet-500"
                                required
                            />
                            <button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl py-3 text-sm font-medium transition-colors">
                                Send reset link
                            </button>
                        </form>
                    )}
                    <button onClick={() => setForgotMode(false)} className="mt-4 text-slate-500 hover:text-white text-xs transition-colors">
                        ← Back to login
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center p-4">
            <div className="bg-[#1a1a24] border border-[#2d2d3d] rounded-2xl p-8 w-full max-w-sm shadow-2xl">
                {/* Logo */}
                <div className="flex items-center gap-2 mb-8">
                    <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center text-white text-sm font-bold">C</div>
                    <span className="text-white font-semibold text-lg">ChatNest</span>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-[#0f0f13] rounded-xl p-1 mb-6">
                    {['login', 'register'].map(t => (
                        <button
                            key={t}
                            onClick={() => { setTab(t); setError('') }}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    {tab === 'register' && (
                        <input
                            name="username"
                            placeholder="Username"
                            value={form.username}
                            onChange={handleChange}
                            className="bg-[#0f0f13] border border-[#2d2d3d] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-violet-500 transition-colors"
                            required
                        />
                    )}
                    <input
                        name="email"
                        type="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={handleChange}
                        className="bg-[#0f0f13] border border-[#2d2d3d] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-violet-500 transition-colors"
                        required
                    />
                    <input
                        name="password"
                        type="password"
                        placeholder="Password"
                        value={form.password}
                        onChange={handleChange}
                        className="bg-[#0f0f13] border border-[#2d2d3d] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-violet-500 transition-colors"
                        required
                    />

                    {error && <p className="text-red-400 text-xs">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-medium transition-colors mt-1"
                    >
                        {loading ? 'Please wait...' : tab === 'login' ? 'Login' : 'Create account'}
                    </button>
                </form>

                {tab === 'login' && (
                    <button
                        onClick={() => setForgotMode(true)}
                        className="mt-4 text-slate-500 hover:text-slate-300 text-xs w-full text-center transition-colors"
                    >
                        Forgot password?
                    </button>
                )}
            </div>
        </div>
    )
}
