import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zvyioxhwdyocaanzcgqf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2eWlveGh3ZHlvY2FhbnpjZ3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyOTM2NTUsImV4cCI6MjA5Mjg2OTY1NX0.px_s68TxIdBCDkA-OlTFZahqjZ2V8ndFi-XzYN7UIYk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
