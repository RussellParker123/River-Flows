import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://odborcvrmjazcfsujvbg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MfwYfxgSGYZP32Icpdu2_w_ZbqIQ8zqAOtYEjgDyC6CZqEhKnpq3Y6P9R5vz9K2pqCYZo9o5VxN0qJR0P5Z9Z9o9Z9Z9Z9o9Z9Z9Z9o9Z9Z9Z9';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
