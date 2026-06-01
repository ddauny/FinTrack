import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'

export function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }
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
    <div className="flex h-[calc(100vh-52px)]">
      {/* Left: Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-between bg-white dark:bg-[#090909] p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-blue-600/20 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full bg-cyan-500/10 blur-[100px]" />
        </div>
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage: 'linear-gradient(to right, #60a5fa 1px, transparent 1px), linear-gradient(to bottom, #60a5fa 1px, transparent 1px)', backgroundSize: '48px 48px'}} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
              <rect width="32" height="32" rx="8" fill="#2563eb"/>
              <path d="M7 22L13 14L18 18L25 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="25" cy="9" r="2" fill="white"/>
              <circle cx="13" cy="14" r="2" fill="white"/>
              <circle cx="18" cy="18" r="2" fill="white"/>
            </svg>
            <span className="text-2xl font-bold text-white">Fin<span className="text-blue-400">Track</span></span>
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
            Start your journey<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">to financial clarity.</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-md">
            Join and get a complete picture of your financial life — income, expenses, assets, and more.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            { icon: '🔒', text: 'Your data is private and secure' },
            { icon: '⚡', text: 'Set up in minutes, insights in seconds' },
            { icon: '🌙', text: 'Dark mode and privacy mode included' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-slate-300">
              <span className="text-xl">{icon}</span>
              <span className="text-sm">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center bg-slate-50 dark:bg-[#101010] px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
              <rect width="32" height="32" rx="8" fill="#2563eb"/>
              <path d="M7 22L13 14L18 18L25 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="25" cy="9" r="2" fill="white"/>
              <circle cx="13" cy="14" r="2" fill="white"/>
              <circle cx="18" cy="18" r="2" fill="white"/>
            </svg>
            <span className="text-xl font-bold text-slate-900 dark:text-[#f0f0f0]">Fin<span className="text-blue-600">Track</span></span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-[#f0f0f0]">Create your account</h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-[#888]">
              Free to use · No credit card required
            </p>
          </div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-[#bbb] mb-1.5">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="block w-full rounded-xl border border-slate-300 dark:border-[#1f1f1f] px-4 py-2.5 text-sm bg-white dark:bg-[#111111] text-slate-900 dark:text-[#f0f0f0] placeholder-slate-400 dark:placeholder-[#555] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-[#bbb] mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="block w-full rounded-xl border border-slate-300 dark:border-[#1f1f1f] px-4 py-2.5 text-sm bg-white dark:bg-[#111111] text-slate-900 dark:text-[#f0f0f0] placeholder-slate-400 dark:placeholder-[#555] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              />
              <p className="mt-1.5 text-xs text-slate-400 dark:text-[#666]">Must be at least 8 characters</p>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 px-4 py-3">
                <svg className="h-4 w-4 text-red-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Creating account...
                </>
              ) : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-[#888]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
