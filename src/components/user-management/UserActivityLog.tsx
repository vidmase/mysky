import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { UserProfile } from '../../lib/types/user';
import { userManagementService } from '../../lib/services/userManagement';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { Badge } from '../ui/badge';

interface UserActivityLogProps {
  user: UserProfile;
}

interface ActivityLog {
  activity_id: string;
  activity_type: string;
  description: string;
  metadata: any;
  created_at: string;
}

export function UserActivityLog({ user }: UserActivityLogProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActivity = async () => {
      try {
        setLoading(true);
        const data = await userManagementService.getUserActivity(user.id);
        setActivities(data);
      } catch (error) {
        console.error('Failed to load user activity:', error);
      } finally {
        setLoading(false);
      }
    };

    loadActivity();
  }, [user.id]);

  const getActivityBadgeColor = (type: string): "default" | "secondary" | "destructive" => {
    switch (type) {
      case 'profile_updated':
        return 'secondary';
      case 'login_attempt':
        return 'default';
      default:
        return 'destructive';
    }
  };

  const formatActivityDescription = (activity: ActivityLog): string => {
    switch (activity.activity_type) {
      case 'profile_updated':
        const changes = activity.metadata?.changes;
        if (changes) {
          const changedFields = Object.keys(changes.new).filter(
            key => changes.old[key] !== changes.new[key]
          );
          return `Updated: ${changedFields.join(', ')}`;
        }
        return activity.description;
      
      case 'login_attempt':
        return 'Logged in successfully';
      
      default:
        return activity.description;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
        <CardDescription>Recent user activity and changes</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="text-center py-4">Loading activity...</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No activity recorded
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.activity_id}
                  className="flex items-start space-x-4 border-b pb-4 last:border-0"
                >
                  <Badge variant={getActivityBadgeColor(activity.activity_type)}>
                    {activity.activity_type.replace('_', ' ')}
                  </Badge>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">
                      {formatActivityDescription(activity)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(activity.created_at), 'PPpp')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 