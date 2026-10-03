import { useQuery } from '@tanstack/react-query'

export type Station = {
  station_id: number
  name: string
  lat: number
  lon: number
  start_trip_count: number
  end_trip_count: number
  round_trip_count: number
  popularity_order: number | null
  peak_start_day: number | null
  peak_start_hour: number | null
}

export function useStations() {
  return useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const res = await fetch('/api/stations')
      if (!res.ok) throw new Error(`Failed to load stations: ${res.status}`)
      return (await res.json()) as Station[]
    },
    staleTime: 60_000,
  })
}