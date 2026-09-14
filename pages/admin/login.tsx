import { useState } from 'react'
import { useRouter } from 'next/router'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Plane } from 'lucide-react'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      setError('Invalid credentials')
      setLoading(false)
      return
    }
    // Check for admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()
    if (!profile || profile.role !== 'admin') {
      setError('You do not have admin access')
      setLoading(false)
      await supabase.auth.signOut()
      return
    }
    router.push('/admin/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-flight/10 via-white/60 to-[color-mix(in_srgb,var(--ink-2)_80%,transparent)]">
      <form onSubmit={handleLogin} className="backdrop-blur-xl bg-[hsl(var(--card))] border border-[var(--rule)] shadow-2xl rounded-3xl p-10 w-full max-w-md flex flex-col gap-7">
        <div className="flex flex-col items-center gap-2 mb-2">
          <Plane className="h-10 w-10 text-flight drop-shadow" />
          <h1 className="text-3xl font-bold text-center tracking-tight">Admin Login</h1>
        </div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="px-4 py-3 rounded-xl border border-flight text-[var(--ink)] bg-[var(--paper)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-2 focus:ring-flight text-base shadow-sm"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="px-4 py-3 rounded-xl border border-[var(--rule)] text-[var(--ink)] bg-[var(--paper)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-2 focus:ring-flight text-base shadow-sm"
          required
        />
        {error && <div className="text-[var(--vermillion-dk)] text-sm text-center font-medium">{error}</div>}
        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-flight text-[var(--ink)] font-semibold text-lg shadow-lg hover:bg-flight/90 transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-flight"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  )
} 