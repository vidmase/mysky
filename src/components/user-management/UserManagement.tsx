import { useEffect, useState } from 'react';
import { UserFilters, UserProfile } from '../../lib/types/user';
import { userManagementService } from '../../lib/services/userManagement';
import { UserListItem } from './UserListItem';
import { UserFiltersComponent } from './UserFilters';
import { UserEditModal } from './UserEditModal';
import { UserActivityLog } from './UserActivityLog';
import { UserMessageModal } from './UserMessageModal';
import { Button } from '../ui/button';
import { useToast } from '../ui/use-toast';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LogoutButton } from '../LogoutButton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<UserFilters>({});
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const loadUsers = async (page: number) => {
    try {
      setLoading(true);
      const response = await userManagementService.listUsers({
        pageNumber: page,
        pageSize: 10,
        filters,
      });
      setUsers(response.users);
      setTotalPages(response.pagination.total_pages);
      setCurrentPage(page);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load users. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, disabled: boolean) => {
    try {
      await userManagementService.toggleUserStatus(userId, disabled);
      toast({
        title: 'Success',
        description: `User ${disabled ? 'disabled' : 'enabled'} successfully`,
      });
      loadUsers(currentPage);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (user: UserProfile) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleViewActivity = (user: UserProfile) => {
    setSelectedUser(user);
    setIsActivityDrawerOpen(true);
  };

  const handleMessage = (user: UserProfile) => {
    setSelectedUser(user);
    setIsMessageModalOpen(true);
  };

  const handleFiltersChange = (newFilters: UserFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  useEffect(() => {
    loadUsers(currentPage);
  }, [currentPage, filters]);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <LogoutButton />
      </div>

      <UserFiltersComponent filters={filters} onFiltersChange={handleFiltersChange} />

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((user) => (
            <UserListItem
              key={user.id}
              user={user}
              onToggleStatus={handleToggleStatus}
              onEdit={handleEdit}
              onViewActivity={() => handleViewActivity(user)}
              onMessage={() => handleMessage(user)}
            />
          ))}

          {users.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      <UserEditModal
        user={selectedUser}
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        onUserUpdated={() => loadUsers(currentPage)}
      />

      <Sheet open={isActivityDrawerOpen} onOpenChange={setIsActivityDrawerOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>User Activity</SheetTitle>
          </SheetHeader>
          {selectedUser && <UserActivityLog user={selectedUser} />}
        </SheetContent>
      </Sheet>

      <UserMessageModal
        user={selectedUser}
        open={isMessageModalOpen}
        onClose={() => {
          setIsMessageModalOpen(false);
          setSelectedUser(null);
        }}
      />
    </div>
  );
} 