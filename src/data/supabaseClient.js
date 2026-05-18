import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://odborcvrmjazcfsujvbg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MfwYfxgSGYZP32Icpdu2_w_ZbqIQlb-';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
