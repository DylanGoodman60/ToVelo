import { useQuery } from "@tanstack/react-query"

export type RouteTripStats = {
  completed_trip_count: number;
  average_duration_seconds: number | null;
  tenth_percentile_duration_seconds: number | null;
  fastest_duration_seconds: number | null;
  average_straight_line_speed_kmh: number | null;
};

export function useRouteTripStats(start?: number, end?: number) {
  return useQuery({
    queryKey: ['route-stats', start, end],
    enabled: start != null && end != null,
    queryFn: async ({ signal }) => {
      if (start == null || end == null) {
        throw new Error('Both station IDs are required to load route stats.');
      }

      const params = new URLSearchParams({ start: String(start), end: String(end) });
      const res = await fetch(`/api/route-stats?${params}`, { signal });
      if (!res.ok) throw new Error(`Failed to load route stats: ${res.status}`)
      return (await res.json()) as RouteTripStats;
    },
  })
}