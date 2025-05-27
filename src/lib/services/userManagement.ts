import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { UserFilters, UserListResponse, UserProfile, UserUpdatePayload } from '../types/user';

const supabase = createClientComponentClient();

export const userManagementService = {
  async listUsers({
    pageSize = 10,
    pageNumber = 1,
    filters
  }: {
    pageSize?: number;
    pageNumber?: number;
    filters?: UserFilters;
  }): Promise<UserListResponse> {
    const { data, error } = await supabase.rpc('admin_list_users', {
      page_size: pageSize,
      page_number: pageNumber,
      filter_role: filters?.role,
      filter_disabled: filters?.disabled,
      search_term: filters?.searchTerm
    });

    if (error) throw error;
    return data as UserListResponse;
  },

  async getUserDetails(userId: string): Promise<UserProfile> {
    const { data, error } = await supabase.rpc('admin_get_user_details', {
      target_user_id: userId
    });

    if (error) throw error;
    return data as UserProfile;
  },

  async updateUserProfile(userId: string, updates: UserUpdatePayload): Promise<UserProfile> {
    const { data, error } = await supabase.rpc('admin_update_user_profile', {
      target_user_id: userId,
      new_full_name: updates.full_name,
      new_email: updates.email,
      new_role: updates.role,
      new_disabled: updates.disabled
    });

    if (error) throw error;
    return data as UserProfile;
  },

  async toggleUserStatus(
    userId: string,
    disabled: boolean,
    deactivationEndDate?: Date
  ): Promise<UserProfile> {
    const { data, error } = await supabase.rpc('admin_toggle_user_status', {
      target_user_id: userId,
      new_disabled_status: disabled,
      deactivation_end_date: deactivationEndDate
    });

    if (error) throw error;
    return data as UserProfile;
  },

  async sendPasswordReset(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  },

  async getUserActivity(userId: string): Promise<any[]> {
    const { data, error } = await supabase.rpc('admin_get_user_activity', {
      target_user_id: userId
    });

    if (error) throw error;
    return data;
  },

  async sendUserMessage(userId: string, message: {
    type: 'email' | 'direct';
    subject: string;
    message: string;
  }): Promise<void> {
    const { error } = await supabase.rpc('admin_send_user_message', {
      target_user_id: userId,
      message_type: message.type,
      message_subject: message.subject,
      message_content: message.message
    });

    if (error) throw error;
  },

  async adminLogout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
}; 