import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '@/lib/api'

export function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.register(email, password)
      const { token } = await api.login(email, password)
      localStorage.setItem('token', token)
      navigate('/')
    } catch (e: any) {
      setError(typeof e?.message === 'string' ? e.message : 'Registration failed')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-sm mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-xl font-semibold mb-4">Register</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full border p-2 rounded" />
        <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="w-full border p-2 rounded" />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button type="submit" disabled={loading} className="w-full bg-blue-600 disabled:bg-blue-400 text-white py-2 rounded">
          {loading ? 'Creating...' : 'Create account'}
        </button>
      </form>
      <div className="text-sm mt-3">Have an account? <Link to="/login" className="text-blue-700">Login</Link></div>
    </div>
  )
}


