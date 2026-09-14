import React, { useState } from 'react';

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

interface UserDetailsModalProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onUserUpdated?: (user: User) => void;
}

const roleOptions = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
  { value: 'moderator', label: 'Moderator' },
];

const deactivationOptions = [
  { value: '0', label: 'Permanent' },
  { value: '1', label: '1 hour' },
  { value: '24', label: '24 hours' },
  { value: '48', label: '48 hours' },
  { value: '168', label: '1 week' },
  { value: '720', label: '30 days' },
];

export default function UserDetailsModal({ user, open, onClose, onUserUpdated }: UserDetailsModalProps) {
  const [editRole, setEditRole] = useState(user?.role || 'user');
  const [editStatus, setEditStatus] = useState(user?.disabled || false);
  const [deactivationDuration, setDeactivationDuration] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  React.useEffect(() => {
    setEditRole(user?.role || 'user');
    setEditStatus(user?.disabled || false);
    setDeactivationDuration('0');
    setError('');
    setSuccess('');
  }, [user, open]);

  if (!open || !user) return null;

  // Format the deactivation date for display
  const formatDeactivationDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date > new Date() 
      ? `Until ${date.toLocaleString()}`
      : '—';
  };

  // Calculate deactivation end date based on selected duration
  const calculateDeactivationEndDate = (hours: number): string | null => {
    if (hours <= 0) return null;
    
    const date = new Date();
    date.setHours(date.getHours() + hours);
    return date.toISOString();
  };

  // Call API to update user role/status
  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    // Calculate the deactivation end date if applicable
    const deactivationEndDate = editStatus 
      ? calculateDeactivationEndDate(parseInt(deactivationDuration, 10))
      : null;
    
    try {
      const res = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          role: editRole, 
          disabled: editStatus,
          deactivation_end_date: deactivationEndDate
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      setSuccess('User updated!');
      if (onUserUpdated) {
        onUserUpdated({ 
          ...user, 
          role: editRole, 
          disabled: editStatus,
          deactivation_end_date: deactivationEndDate
        });
      }
    } catch (e: any) {
      setError(e.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  // Call API to send password reset email
  const handleResetPassword = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset email');
      setSuccess('Password reset email sent!');
    } catch (e: any) {
      setError(e.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="backdrop-blur-xl bg-[var(--wash-accent)] border border-[var(--vermillion)] rounded-2xl shadow-2xl p-8 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-[var(--vermillion)] hover:text-[var(--vermillion-dk)] text-2xl font-bold"
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-4 text-[var(--vermillion)]">User Details</h2>
        <div className="space-y-3 mb-6">
          <div><span className="font-semibold text-[var(--vermillion)]">Email:</span> <span className="text-[var(--ink)] font-mono">{user.email}</span></div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--vermillion)]">Role:</span>
            <select
              className="rounded-lg bg-[var(--wash-accent)] border border-[var(--vermillion)] px-2 py-1 text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--wash-accent)]"
              value={editRole}
              onChange={e => setEditRole(e.target.value)}
              disabled={user.is_super_admin}
            >
              {roleOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {user.is_super_admin && <span className="text-xs text-[var(--vermillion)] ml-2">Super Admin</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--vermillion)]">Account Status:</span>
            <button
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${editStatus ? 'bg-[var(--wash-accent)] text-[var(--vermillion-dk)]' : 'bg-[var(--wash-jade)] text-[var(--jade)]'}`}
              onClick={() => setEditStatus(!editStatus)}
              disabled={user.is_super_admin}
            >
              {editStatus ? 'Deactivated' : 'Active'}
            </button>
            {user.is_super_admin && <span className="text-xs text-[var(--vermillion)] ml-2">Cannot deactivate super admin</span>}
          </div>
          
          {/* Deactivation Duration Section */}
          {editStatus && !user.is_super_admin && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--vermillion)]">Deactivation Duration:</span>
              <select
                className="rounded-lg bg-[var(--wash-accent)] border border-[var(--vermillion)] px-2 py-1 text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--wash-accent)]"
                value={deactivationDuration}
                onChange={e => setDeactivationDuration(e.target.value)}
              >
                {deactivationOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Show current deactivation end date if exists */}
          {user.disabled && user.deactivation_end_date && (
            <div>
              <span className="font-semibold text-[var(--vermillion)]">Current Deactivation:</span>
              <span className="text-[var(--brass)] ml-2">{formatDeactivationDate(user.deactivation_end_date)}</span>
            </div>
          )}
          
          <div><span className="font-semibold text-[var(--vermillion)]">Super Admin:</span> <span className="text-[var(--ink)]">{user.is_super_admin ? 'Yes' : 'No'}</span></div>
          <div><span className="font-semibold text-[var(--vermillion)]">Signup Date:</span> <span className="text-[var(--ink)]">{user.created_at ? new Date(user.created_at).toLocaleString() : '—'}</span></div>
          <div><span className="font-semibold text-[var(--vermillion)]">Last Sign In:</span> <span className="text-[var(--ink)]">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '—'}</span></div>
          <div><span className="font-semibold text-[var(--vermillion)]">Last Active:</span> <span className="text-[var(--ink)]">{user.last_active_at ? new Date(user.last_active_at).toLocaleString() : '—'}</span></div>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleResetPassword}
            className="w-full py-2 rounded-lg bg-[var(--vermillion)] text-[var(--paper)] font-semibold hover:bg-[var(--vermillion-dk)] transition disabled:opacity-50"
            disabled={loading}
          >
            Send Password Reset Email
          </button>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSave}
              className="flex-1 py-2 rounded-lg bg-[var(--jade)] text-[var(--paper)] font-semibold hover:bg-[var(--ink)] transition disabled:opacity-50"
              disabled={loading || (editRole === user.role && editStatus === !!user.disabled && (!editStatus || deactivationDuration === '0'))}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-[hsl(var(--card))] text-[var(--ink)] font-semibold hover:bg-[hsl(var(--card))] transition"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
          {error && <div className="text-[var(--vermillion-dk)] text-sm mt-2">{error}</div>}
          {success && <div className="text-[var(--jade)] text-sm mt-2">{success}</div>}
        </div>
      </div>
    </div>
  );
} 