import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DeactivationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  onDeactivate: () => void;
}

type DurationOption = {
  label: string;
  hours: number | null;
}

type DurationOptions = {
  [key in "1_hour" | "1_day" | "3_days" | "1_week" | "2_weeks" | "1_month" | "permanent"]: DurationOption;
}

export function DeactivationDialog({ isOpen, onClose, userId, userEmail, onDeactivate }: DeactivationDialogProps) {
  const [duration, setDuration] = useState<keyof DurationOptions>("1_day");
  const [isLoading, setIsLoading] = useState(false);
  // Supabase client removed - using Clerk auth via useAuth()

  const durationOptions: DurationOptions = {
    "1_hour": { label: "1 Hour", hours: 1 },
    "1_day": { label: "1 Day", hours: 24 },
    "3_days": { label: "3 Days", hours: 72 },
    "1_week": { label: "1 Week", hours: 168 },
    "2_weeks": { label: "2 Weeks", hours: 336 },
    "1_month": { label: "1 Month", hours: 720 },
    "permanent": { label: "Permanent", hours: null }
  };

  const handleDeactivate = async () => {
    try {
      setIsLoading(true);
      
      const deactivationEndDate = durationOptions[duration].hours 
        ? new Date(Date.now() + durationOptions[duration].hours * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from('profiles')
        .update({ 
          disabled: true,
          deactivation_end_date: deactivationEndDate
        })
        .eq('id', userId);

      if (error) throw error;

      onDeactivate();
      onClose();
    } catch (error) {
      console.error('Error deactivating user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-blue-900/90 border-blue-700">
        <DialogHeader>
          <DialogTitle className="text-cyan-100">Deactivate User Account</DialogTitle>
          <DialogDescription className="text-cyan-200">
            Choose how long to deactivate the account for {userEmail}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Select
            value={duration}
            onValueChange={(value: keyof DurationOptions) => setDuration(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(durationOptions).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-blue-700 text-cyan-200 hover:bg-blue-800/50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeactivate}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? "Deactivating..." : "Deactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 