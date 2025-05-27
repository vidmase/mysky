import { UserManagement } from '@/components/user-management/UserManagement';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'User Management - Admin Dashboard',
  description: 'Manage users, roles, and permissions',
};

export default function UsersPage() {
  return (
    <div className="min-h-screen bg-background">
      <UserManagement />
    </div>
  );
} 