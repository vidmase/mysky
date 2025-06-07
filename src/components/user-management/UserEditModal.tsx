import { useState } from 'react';
import { UserProfile, UserUpdatePayload } from '../../lib/types/user';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Button } from '../ui/button';
import { useToast } from '../../../components/ui/use-toast';
import { userManagementService } from '../../lib/services/userManagement';

interface UserEditModalProps {
  user: UserProfile | null;
  open: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
}

export function UserEditModal({ user, open, onClose, onUserUpdated }: UserEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UserUpdatePayload>({
    full_name: user?.full_name || '',
    email: user?.email || '',
    role: user?.role || 'user',
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      await userManagementService.updateUserProfile(user.id, formData);
      toast({
        title: 'Success',
        description: 'User profile updated successfully',
      });
      onUserUpdated();
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      await userManagementService.sendPasswordReset(user.email);
      toast({
        title: 'Success',
        description: 'Password reset email sent successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send password reset email',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name || ''}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetPassword}
              disabled={loading}
            >
              Reset Password
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 