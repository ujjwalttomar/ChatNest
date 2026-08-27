import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api'

export default function ResetPasswordPage() {
    const [params] = useSearchParams()
    const navigate = useNavigate()
    const token = params.get('token')

    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!token) {
            setError('Invalid or missing reset token.')
        }
    }, [token])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (password.length < 8) {
            setError('Password must be at least 8 characters.')
            return
        }
        if (password !== confirm) {
            setError('Passwords do not match.')
            return
        }

        setLoading(true)
        try {
            await api.post('/auth/reset-password', { token, newPassword: password })
            setSuccess(true)
            setTimeout(() => navigate('/'), 2500)
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center p-4">
            <div className="bg-[#1a1a24] border border-[#2d2d3d] rounded-2xl p-8 w-full max-w-sm">
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">C</div>
                    <span className="text-white font-semibold text-sm">ChatNest</span>
                </div>

                <h2 className="text-white text-lg font-semibold mb-1">Set new password</h2>
                <p className="text-slate-400 text-xs mb-6">Choose something you haven't used before</p>

                {success ? (
                    <div className="text-green-400 text-sm text-center">
                        Password reset! Redirecting to login...
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                        <input
                            type="password"
                            placeholder="New password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="bg-[#0f0f13] border border-[#2d2d3d] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-violet-500 transition-colors"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Confirm password"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            className="bg-[#0f0f13] border border-[#2d2d3d] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-violet-500 transition-colors"
                            required
                        />
                        {error && <p className="text-red-400 text-xs">{error}</p>}
                        <button
                            type="submit"
                            disabled={loading || !token}
                            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-medium transition-colors mt-1"
                        >
                            {loading ? 'Resetting...' : 'Reset password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
