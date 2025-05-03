import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ykxwxmwmqxmfvgyjnqrv.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlreHd4bXdtcXhtZnZneWpucXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk2NzE0NzAsImV4cCI6MjAyNTI0NzQ3MH0.GwfYr4tpKk3YJ7nRwEHo_hRvQfTxVPqwX5dGFrAv6_s'

export const createClient = () =>
    createSupabaseClient(supabaseUrl, supabaseAnonKey) 