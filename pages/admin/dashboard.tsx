import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User, CreditCard, Zap, LogOut, Activity } from 'lucide-react'

// Heartbeat hook to update last_active_at
function useHeartbeat() {
  const supabase = createClientComponentClient()
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', user.id)
      }
    }, 30000) // every 30 seconds
    return () => clearInterval(interval)
  }, [])
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [userMetrics, setUserMetrics] = useState<any>(null)
  const [metricsError, setMetricsError] = useState('')
  const [userList, setUserList] = useState<any[]>([])
  const [userListError, setUserListError] = useState('')
  const [userListLoading, setUserListLoading] = useState(false)
  const [liveUsers, setLiveUsers] = useState<any[]>([])
  const [liveUsersError, setLiveUsersError] = useState('')
  const [liveUsersLoading, setLiveUsersLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/admin/login')
        return
      }
      setUser(user)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (!profile || profile.role !== 'admin') {
        router.replace('/admin/login')
        return
      }
      setIsAdmin(true)
      setLoading(false)
    }
    checkAdmin()
    // eslint-disable-next-line
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    setUserMetrics(null)
    setMetricsError('')
    fetch('/api/admin/user-metrics')
      .then(res => res.json())
      .then(data => setUserMetrics(data))
      .catch(() => setMetricsError('Failed to load user metrics'))
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) return;
    setUserListLoading(true);
    setUserListError('');
    fetch('/api/admin/user-list')
      .then(res => res.json())
      .then(data => {
        setUserList(data.users || []);
        setUserListLoading(false);
      })
      .catch(() => {
        setUserListError('Failed to load user list');
        setUserListLoading(false);
      });
  }, [isAdmin]);

  useHeartbeat()

  useEffect(() => {
    if (!isAdmin) return;
    setLiveUsersLoading(true);
    setLiveUsersError('');
    fetch('/api/admin/live-users')
      .then(res => res.json())
      .then(data => {
        setLiveUsers(data.liveUsers || []);
        setLiveUsersLoading(false);
      })
      .catch(() => {
        setLiveUsersError('Failed to load live users');
        setLiveUsersLoading(false);
      });
    const interval = setInterval(() => {
      fetch('/api/admin/live-users')
        .then(res => res.json())
        .then(data => setLiveUsers(data.liveUsers || []))
        .catch(() => setLiveUsersError('Failed to load live users'));
    }, 30000)
    return () => clearInterval(interval)
  }, [isAdmin])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.replace('/admin/login')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-xl">Loading...</div>
  }
  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 p-8">
      <div className="max-w-6xl mx-auto relative">
        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="absolute top-0 right-0 mt-2 mr-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-700 text-white font-semibold shadow-lg hover:bg-blue-600 transition focus:outline-none focus:ring-2 focus:ring-blue-400 z-20"
        >
          <LogOut className="h-5 w-5" />
          Log out
        </button>
        <h1 className="text-4xl font-extrabold mb-8 text-center tracking-tight drop-shadow-lg text-white">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          {/* User Activity Card */}
          <div className="backdrop-blur-xl bg-blue-800/80 border border-blue-700 rounded-3xl shadow-2xl p-7 flex flex-col items-center gap-3 transition hover:scale-[1.02] hover:shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-8 w-8 text-cyan-300 drop-shadow" />
              <h2 className="text-xl font-bold tracking-tight text-cyan-100">User Activity</h2>
            </div>
            {userMetrics ? (
              <>
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex justify-between text-base">
                    <span>Total users:</span>
                    <span className="font-bold">{userMetrics.totalUsers ?? '—'}</span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span>Active (24h):</span>
                    <span className="font-bold text-cyan-300">{userMetrics.active24h ?? '—'}</span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span>Active (7d):</span>
                    <span className="font-bold text-cyan-300">{userMetrics.active7d ?? '—'}</span>
                  </div>
                </div>
                <div className="mt-4 w-full">
                  <h3 className="font-semibold text-sm mb-1">Top 5 Most Active Users</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-separate border-spacing-y-1">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="text-left font-medium">User</th>
                          <th className="text-left font-medium">Interactions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userMetrics.topUsers?.map((u: any, i: number) => (
                          <tr key={u.user_id || u.id} className="bg-zinc-100/80 dark:bg-zinc-800/80 rounded-lg">
                            <td className="py-1 px-2 rounded-l-lg font-mono">{u.email || u.user_id || u.id}</td>
                            <td className="py-1 px-2 rounded-r-lg text-right font-bold">{u.count ?? u.last_login ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : metricsError ? (
              <div className="text-red-500 text-sm mt-2">{metricsError}</div>
            ) : (
              <div className="text-muted-foreground text-sm mt-2">Loading metrics...</div>
            )}
            <p className="text-cyan-200 text-xs text-center mt-4">Monitor registrations, active users, and engagement trends.</p>
          </div>
          {/* Financial Metrics Card (placeholder for now) */}
          <div className="backdrop-blur-xl bg-blue-800/80 border border-blue-700 rounded-3xl shadow-2xl p-7 flex flex-col items-center gap-3 transition hover:scale-[1.02] hover:shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-8 w-8 text-cyan-300 drop-shadow" />
              <h2 className="text-xl font-bold tracking-tight text-cyan-100">Financial Metrics</h2>
            </div>
            <p className="text-cyan-200 text-sm text-center">Track subscriptions, revenue, and coupon usage.</p>
          </div>
          {/* System Performance Card (placeholder) */}
          <div className="backdrop-blur-xl bg-blue-800/80 border border-blue-700 rounded-3xl shadow-2xl p-7 flex flex-col items-center gap-3 transition hover:scale-[1.02] hover:shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-8 w-8 text-cyan-300 drop-shadow" />
              <h2 className="text-xl font-bold tracking-tight text-cyan-100">System Performance</h2>
            </div>
            <p className="text-cyan-200 text-sm text-center">View system health, uptime, and performance stats.</p>
          </div>
        </div>
        {/* Live Active Users Card */}
        <div className="backdrop-blur-xl bg-blue-900/90 border border-blue-700 rounded-3xl shadow-2xl p-8 mt-10 mb-10">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-cyan-100">
            <Activity className="h-6 w-6 text-cyan-300" /> Live Active Users (last 5 min)
          </h2>
          {liveUsersLoading ? (
            <div className="text-muted-foreground text-sm">Loading live users...</div>
          ) : liveUsersError ? (
            <div className="text-red-500 text-sm">{liveUsersError}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-y-1">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left font-semibold">Email</th>
                    <th className="text-left font-semibold">Last Active</th>
                    <th className="text-left font-semibold">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {liveUsers.map((u: any) => (
                    <tr key={u.id} className="bg-zinc-100/80 dark:bg-zinc-800/80 rounded-lg">
                      <td className="py-1 px-2 rounded-l-lg font-mono">{u.email}</td>
                      <td className="py-1 px-2">{u.last_active_at ? new Date(u.last_active_at).toLocaleTimeString() : '—'}</td>
                      <td className="py-1 px-2 rounded-r-lg font-semibold text-flight">{u.role || 'user'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {liveUsers.length === 0 && <div className="text-cyan-200 text-sm mt-2">No users active in the last 5 minutes.</div>}
            </div>
          )}
        </div>
        <div className="backdrop-blur-xl bg-blue-900/90 border border-blue-700 rounded-3xl shadow-2xl p-10 mt-10">
          <h2 className="text-2xl font-bold mb-4 text-cyan-100">Welcome, {user?.email || 'Admin'}!</h2>
          <p className="text-cyan-200 text-lg">Select a section above to view detailed analytics and management tools.</p>
        </div>
      </div>
    </div>
  )
} 