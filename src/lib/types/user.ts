export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  disabled: boolean;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  last_active_at: string | null;
}

export interface PaginationInfo {
  total_count: number;
  page_size: number;
  page_number: number;
  total_pages: number;
}

export interface UserListResponse {
  users: UserProfile[];
  pagination: PaginationInfo;
}

export interface UserFilters {
  role?: string;
  disabled?: boolean;
  searchTerm?: string;
}

export interface UserUpdatePayload {
  full_name?: string;
  email?: string;
  role?: string;
  disabled?: boolean;
  avatar_url?: string;
} 