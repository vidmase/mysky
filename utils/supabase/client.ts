import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kayyrfpijdeqfrmylecj.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtheXlyZnBpamRlcWZybXlsZWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MjMwOTUsImV4cCI6MjA1NTk5OTA5NX0.LCxdJ15nI8lxDd5BX8DvxH8Cg1MQhljckzvXZFCZn7c'

export const createClient = () =>
    createSupabaseClient(supabaseUrl, supabaseAnonKey) 