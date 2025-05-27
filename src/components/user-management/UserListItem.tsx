import { UserProfile } from '@/lib/types/user';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Mail, Edit, Activity, Power } from 'lucide-react';

interface UserListItemProps {
  user: UserProfile;
  onToggleStatus: (userId: string, disabled: boolean) => void;
  onEdit: (user: UserProfile) => void;
  onViewActivity: (user: UserProfile) => void;
  onMessage: (user: UserProfile) => void;
}

export function UserListItem({
  user,
  onToggleStatus,
  onEdit,
  onViewActivity,
  onMessage,
}: UserListItemProps) {
  const lastActive = user.last_active_at
    ? formatDistanceToNow(new Date(user.last_active_at), { addSuffix: true })
    : 'Never';

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h3 className="font-medium">{user.full_name || 'No name'}</h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
            {user.role}
          </Badge>
          {user.disabled && (
            <Badge variant="destructive">Disabled</Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onMessage(user)}
            title="Send Message"
          >
            <Mail className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onEdit(user)}
            title="Edit User"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onViewActivity(user)}
            title="View Activity"
          >
            <Activity className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onToggleStatus(user.id, !user.disabled)}
            title={user.disabled ? 'Enable User' : 'Disable User'}
          >
            <Power className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Role</p>
            <p className="font-medium">{user.role}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Active</p>
            <p className="font-medium">{lastActive}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 