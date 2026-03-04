// PROVA FILE SYNC 12345
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const { token } = await api.login(email, password)
      localStorage.setItem('token', token)
      navigate('/')
    } catch (e: any) {
      setError('Invalid credentials')
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-10 p-6 bg-white dark:bg-stone-800 rounded shadow">
      <h1 className="text-xl font-semibold mb-4 dark:text-stone-100">Login</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 p-2 rounded focus:ring-2 focus:ring-blue-500" />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="w-full border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 p-2 rounded focus:ring-2 focus:ring-blue-500" />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button className="w-full bg-blue-600 text-white py-2 rounded">Sign in</button>
      </form>
  <div className="text-sm mt-3 dark:text-stone-100">No account? <Link to="/register" className="text-blue-700 dark:text-blue-300">Register</Link></div>
    </div>
  )
}


