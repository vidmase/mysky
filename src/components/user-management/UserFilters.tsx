import { UserFilters } from '../../lib/types/user';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface UserFiltersProps {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
}

export function UserFiltersComponent({ filters, onFiltersChange }: UserFiltersProps) {
  return (
    <div className="flex gap-4 mb-6">
      <div className="flex-1">
        <Input
          placeholder="Search users..."
          value={filters.searchTerm || ''}
          onChange={(e) =>
            onFiltersChange({ ...filters, searchTerm: e.target.value })
          }
        />
      </div>
      <Select
        value={filters.role || 'all'}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, role: value === 'all' ? undefined : value })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All roles</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="user">User</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={filters.disabled === undefined ? 'all' : filters.disabled.toString()}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            disabled: value === 'all' ? undefined : value === 'true',
          })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All status</SelectItem>
          <SelectItem value="true">Disabled</SelectItem>
          <SelectItem value="false">Active</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
} 