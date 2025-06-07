import { useState } from 'react';
import { UserProfile } from '../../lib/types/user';
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
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useToast } from '../../../components/ui/use-toast';
import { userManagementService } from '../../lib/services/userManagement';

interface UserMessageModalProps {
  user: UserProfile | null;
  open: boolean;
  onClose: () => void;
}

export function UserMessageModal({ user, open, onClose }: UserMessageModalProps) {
  const [loading, setLoading] = useState(false);
  const [messageType, setMessageType] = useState<'email' | 'direct'>('email');
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      await userManagementService.sendUserMessage(user.id, {
        type: messageType,
        subject: formData.subject,
        message: formData.message,
      });
      toast({
        title: 'Success',
        description: `${messageType === 'email' ? 'Email' : 'Message'} sent successfully`,
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to send ${messageType === 'email' ? 'email' : 'message'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Message to {user.full_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="messageType">Message Type</Label>
              <Select
                value={messageType}
                onValueChange={(value: 'email' | 'direct') => setMessageType(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select message type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="direct">Direct Message</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder="Enter message subject"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                placeholder="Type your message here"
                className="h-32"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              Send {messageType === 'email' ? 'Email' : 'Message'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 