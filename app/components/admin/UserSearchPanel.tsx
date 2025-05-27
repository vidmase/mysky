import { useState, useEffect } from 'react';
import { 
  Search, 
  Calendar, 
  Filter, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Download,
  AlertTriangle
} from 'lucide-react';
import UserDetailsModal from './UserDetailsModal';

// Use a simple solution that doesn't rely on direct module imports
const formatDate = (dateString: string | null) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString();
};

// Format deactivation status
const formatDeactivationStatus = (user: User) => {
  if (!user.disabled) {
    return (
      <span className="px-3 py-1 rounded-full bg-green-600/80 text-white text-xs font-bold shadow">
        Active
      </span>
    );
  }
  
  if (!user.deactivation_end_date) {
    return (
      <span className="px-3 py-1 rounded-full bg-red-600/80 text-white text-xs font-bold shadow">
        Permanently Disabled
      </span>
    );
  }
  
  const endDate = new Date(user.deactivation_end_date);
  const now = new Date();
  
  if (endDate <= now) {
    // This should be handled by the auto-reactivate function, but just in case
    return (
      <span className="px-3 py-1 rounded-full bg-green-600/80 text-white text-xs font-bold shadow">
        Active
      </span>
    );
  }
  
  // Calculate remaining time
  const diffMs = endDate.getTime() - now.getTime();
  const diffHrs = Math.round(diffMs / (1000 * 60 * 60));
  
  let timeDisplay = '';
  if (diffHrs < 24) {
    timeDisplay = `${diffHrs} hour${diffHrs === 1 ? '' : 's'}`;
  } else {
    const diffDays = Math.round(diffHrs / 24);
    timeDisplay = `${diffDays} day${diffDays === 1 ? '' : 's'}`;
  }
  
  return (
    <span className="px-3 py-1 rounded-full bg-amber-600/80 text-white text-xs font-bold shadow">
      Disabled ({timeDisplay})
    </span>
  );
};

// Define types
interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
  last_active_at: string | null;
  is_super_admin: boolean;
  disabled?: boolean;
  deactivation_end_date?: string | null;
}

interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface UserSearchPanelProps {
  onUsersLoaded?: (users: User[]) => void;
}

export default function UserSearchPanel({ onUsersLoaded }: UserSearchPanelProps) {
  // Search/filter states
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('');
  const [signupAfter, setSignupAfter] = useState<string>('');
  const [signupBefore, setSignupBefore] = useState<string>('');
  const [lastActiveAfter, setLastActiveAfter] = useState<string>('');
  const [lastActiveBefore, setLastActiveBefore] = useState<string>('');
  
  // UI states
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Results
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0
  });

  // Add a new state for the SQL function error
  const [sqlFunctionError, setSqlFunctionError] = useState(false);

  // New state for modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Add new states for user status toggle
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;

  // Load users with current filters
  const loadUsers = async (page = 1) => {
    setLoading(true);
    setError('');
    setSqlFunctionError(false);
    
    try {
      // Build query params
      const params = new URLSearchParams();
      if (email) params.append('email', email);
      if (role) params.append('role', role);
      if (signupAfter) params.append('signupAfter', signupAfter);
      if (signupBefore) params.append('signupBefore', signupBefore);
      if (lastActiveAfter) params.append('lastActiveAfter', lastActiveAfter);
      if (lastActiveBefore) params.append('lastActiveBefore', lastActiveBefore);
      params.append('page', page.toString());
      params.append('pageSize', pagination.pageSize.toString());
      
      // Make the API call
      const response = await fetch(`/api/admin/user-list?${params.toString()}`);
      const data = await response.json();
      
      if (!response.ok) {
        // Check for specific SQL function error
        if (data.error && data.error.includes('admin_filtered_user_list')) {
          setSqlFunctionError(true);
          throw new Error('SQL function not found. The database functions need to be applied.');
        }
        throw new Error(data.error || 'Failed to load users');
      }
      
      setUsers(data.users || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
      
      // Notify parent if callback provided
      if (onUsersLoaded) {
        onUsersLoaded(data.users || []);
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(1); // Reset to first page when search changes
  };
  
  // Clear all filters
  const clearFilters = () => {
    setEmail('');
    setRole('');
    setSignupAfter('');
    setSignupBefore('');
    setLastActiveAfter('');
    setLastActiveBefore('');
    // Reset to page 1 and reload
    setTimeout(() => loadUsers(1), 0);
  };
  
  // Handle pagination
  const goToPage = (page: number) => {
    loadUsers(page);
  };
  
  // Export current results as CSV
  const exportCsv = () => {
    const headers = ['ID', 'Email', 'Role', 'Signup Date', 'Last Sign In', 'Last Active', 'Super Admin'];
    const rows = users.map(user => [
      user.id,
      user.email,
      user.role || 'user',
      user.created_at ? new Date(user.created_at).toLocaleDateString() : '',
      user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : '',
      user.last_active_at ? new Date(user.last_active_at).toLocaleDateString() : '',
      user.is_super_admin ? 'Yes' : 'No'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handler for opening modal
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  // Handler for closing modal
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
  };

  // Handler for toggling user status
  const handleToggleUserStatus = async (user: User) => {
    setActionError(null);
    const action = user.disabled ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    setLoadingUserId(user.id);
    try {
      const res = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, disabled: !user.disabled })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update user status');
      await loadUsers(pagination.page);
    } catch (e: any) {
      setActionError(e.message || 'Failed to update user status');
    } finally {
      setLoadingUserId(null);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-900/80 to-blue-800/60 backdrop-blur-xl border border-blue-700 rounded-3xl shadow-2xl p-8 mt-10 mb-10 max-w-5xl mx-auto">
      <h2 className="text-3xl font-extrabold mb-8 flex items-center gap-3 text-cyan-100 tracking-tight">
        <Search className="h-7 w-7 text-cyan-300" /> User Management
      </h2>
      
      {/* SQL Function Error Alert */}
      {sqlFunctionError && (
        <div className="mb-6 p-4 bg-amber-700/30 border border-amber-600 rounded-lg text-white flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-300 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">SQL Function Missing</p>
            <p className="text-sm mt-1">
              The required database functions are not set up. Please check the instructions in 
              <code className="mx-1 px-1 py-0.5 bg-amber-900/70 rounded text-amber-200">supabase/README.md</code>
              to apply the SQL functions to your database.
            </p>
          </div>
        </div>
      )}
      
      {/* Search & Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center mb-8">
        <div className="relative flex-1 min-w-[250px]">
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Search by email..."
            className="w-full rounded-xl bg-blue-800/60 border border-blue-600 px-12 py-3 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-inner"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400" />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-700/80 border border-blue-600 text-white hover:bg-blue-700/90 transition font-semibold shadow"
        >
          <Filter className="h-5 w-5" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
        <button
          type="submit"
          className="px-5 py-3 rounded-xl bg-cyan-600 text-white font-bold hover:bg-cyan-500 transition shadow"
        >
          Search
        </button>
        <button
          type="button"
          onClick={exportCsv}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-green-700/80 border border-green-600 text-white hover:bg-green-700/90 transition font-semibold shadow"
        >
          <Download className="h-5 w-5" />
          Export CSV
        </button>
      </div>
      
      {/* Advanced Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-blue-800/30 p-4 rounded-xl border border-blue-700">
          <div>
            <label className="block text-sm font-medium text-cyan-200 mb-1">User Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg bg-blue-800/50 border border-blue-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <option value="">Any role</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-cyan-200 mb-1">Signup After</label>
            <input
              type="date"
              value={signupAfter}
              onChange={(e) => setSignupAfter(e.target.value)}
              className="w-full rounded-lg bg-blue-800/50 border border-blue-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-cyan-200 mb-1">Signup Before</label>
            <input
              type="date"
              value={signupBefore}
              onChange={(e) => setSignupBefore(e.target.value)}
              className="w-full rounded-lg bg-blue-800/50 border border-blue-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-cyan-200 mb-1">Last Active After</label>
            <input
              type="date"
              value={lastActiveAfter}
              onChange={(e) => setLastActiveAfter(e.target.value)}
              className="w-full rounded-lg bg-blue-800/50 border border-blue-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-cyan-200 mb-1">Last Active Before</label>
            <input
              type="date"
              value={lastActiveBefore}
              onChange={(e) => setLastActiveBefore(e.target.value)}
              className="w-full rounded-lg bg-blue-800/50 border border-blue-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-700/30 border border-red-700 rounded-lg text-white">
          {error}
        </div>
      )}
      
      {/* Results Table */}
      <div className="overflow-x-auto rounded-2xl shadow-lg">
        {loading ? (
          <div className="text-cyan-200 text-center py-8">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="text-cyan-200 text-center py-8">No users found matching your criteria.</div>
        ) : (
          <>
            <table className="w-full text-base border-separate border-spacing-y-2">
              <thead>
                <tr className="text-cyan-200 bg-blue-800/60">
                  <th className="px-4 py-3 rounded-l-2xl">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Signup Date</th>
                  <th className="px-4 py-3">Last Sign In</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 rounded-r-2xl">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="bg-zinc-100/80 dark:bg-zinc-800/80 rounded-2xl hover:bg-blue-900/30 transition"
                  >
                    <td className="py-3 px-4 rounded-l-2xl font-mono text-cyan-100">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold shadow ${
                        user.role === 'admin'
                          ? 'bg-gradient-to-r from-purple-600 to-purple-400 text-white'
                          : user.role === 'moderator'
                            ? 'bg-gradient-to-r from-blue-600 to-blue-400 text-white'
                            : 'bg-gradient-to-r from-gray-600 to-gray-400 text-white'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">{formatDate(user.created_at)}</td>
                    <td className="py-3 px-4">{formatDate(user.last_sign_in_at)}</td>
                    <td className="py-3 px-4">{formatDate(user.last_active_at)}</td>
                    <td className="py-3 px-4">
                      {formatDeactivationStatus(user)}
                    </td>
                    <td className="py-3 px-4 rounded-r-2xl text-center flex gap-2 justify-center items-center">
                      <button
                        className="inline-flex items-center justify-center rounded-full text-base font-medium text-cyan-300 hover:text-cyan-100 hover:bg-blue-700/50 h-10 w-10 transition"
                        title="View user details"
                        onClick={() => handleViewUser(user)}
                      >
                        <span className="sr-only">View details</span>
                        <Search className="h-5 w-5" />
                      </button>
                      {user.id !== currentUserId && !user.is_super_admin && (
                        <button
                          className={`px-3 py-1 rounded-full text-xs font-bold shadow transition ${
                            user.disabled
                              ? 'bg-gradient-to-r from-green-600 to-green-400 text-white hover:from-green-700 hover:to-green-500'
                              : 'bg-gradient-to-r from-red-600 to-red-400 text-white hover:from-red-700 hover:to-red-500'
                          }`}
                          onClick={() => handleToggleUserStatus(user)}
                          disabled={loadingUserId === user.id}
                        >
                          {loadingUserId === user.id ? 'Processing...' : user.disabled ? 'Activate' : 'Deactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-cyan-200">
                  Showing {((pagination.page - 1) * pagination.pageSize) + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} users
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => goToPage(pagination.page - 1)}
                    className="p-2 rounded-lg bg-blue-800/50 border border-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  
                  <span className="text-sm text-cyan-200">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => goToPage(pagination.page + 1)}
                    className="p-2 rounded-lg bg-blue-800/50 border border-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {/* User Details Modal */}
      <UserDetailsModal user={selectedUser} open={modalOpen} onClose={handleCloseModal} />
      {/* Action Error Message */}
      {actionError && (
        <div className="mb-4 p-2 bg-red-700/30 border border-red-700 rounded text-red-200 text-sm">{actionError}</div>
      )}
    </div>
  );
} 