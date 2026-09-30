import { supabase } from '@/lib/supabaseClient'
import { useQuery } from '@tanstack/react-query';

export function useStations() {
  return useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stations')
        .select('name, lat, lon');

      if (error) throw error;
        return data;
    },
    staleTime: 60_000,
  })
}