import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '../../types/supabase';

export const useSupabase = () => {
  const supabase = createClientComponentClient<Database>();
  return { supabase };
}; 