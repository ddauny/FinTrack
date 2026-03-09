import { useReducer } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'

type State = {
  email: string
  password: string
  error: string | null
  loading: boolean
  passwordError: string | null
}

export function RegisterPage() {
  const [state, setState] = useReducer((old: State, update: Partial<State>) => ({ ...old, ...update }), {
    email: '',
    password: '',
    error: null,
    loading: false,
    passwordError: null
  })
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState({ error: null, passwordError: null })

    if (state.password.length < 8) {
      setState({ passwordError: 'Password must be at least 8 characters long' })
      return
    }

    setState({ loading: true })
    try {
      await api.register(state.email, state.password)
      const { token } = await api.login(state.email, state.password)
      localStorage.setItem('token', token)
      navigate('/')
    } catch (e: any) {
      setState({ error: typeof e?.message === 'string' ? e.message : 'Registration failed', loading: false })
      return
    }
    setState({ loading: false })
  }

  return (
    <div className="max-w-sm mx-auto mt-10 p-6 bg-white dark:bg-stone-800 rounded shadow">
      <h1 className="text-xl font-semibold mb-4 dark:text-stone-100">Register</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input type="email" required value={state.email} onChange={e => setState({ email: e.target.value })} placeholder="Email" className="w-full border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        <input type="password" required value={state.password} onChange={e => setState({ password: e.target.value })} placeholder="Password" className="w-full border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        {state.passwordError && <div className="text-red-600 text-sm">{state.passwordError}</div>} {/* Display password error */}
        {state.error && <div className="text-red-600 text-sm">{state.error}</div>}
        <button type="submit" disabled={state.loading} className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
          {state.loading ? 'Creating...' : 'Create account'}
        </button>
      </form>
      <div className="text-sm mt-3 dark:text-stone-100">Have an account? <Link to="/login" className="text-blue-700 dark:text-blue-300">Login</Link></div>
    </div>
  )
}
