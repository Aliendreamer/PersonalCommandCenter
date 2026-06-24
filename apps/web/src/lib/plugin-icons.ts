import {
  Activity,
  Bell,
  BookOpen,
  Boxes,
  BrainCircuit,
  Calendar,
  Cloud,
  Code2,
  Cpu,
  LayoutGrid,
  ListChecks,
  Rss,
  Search,
  Server,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/** Per-plugin nav/tile icon (keyed by manifest id), with a generic fallback. */
const ICONS: Record<string, LucideIcon> = {
  system: Server,
  iot: Cpu,
  calendar: Calendar,
  tasks: ListChecks,
  notifications: Bell,
  search: Search,
  weather: Cloud,
  rss: Rss,
  goodreads: BookOpen,
  uptime: Activity,
  models: Boxes,
  coding: Code2,
  memory: BrainCircuit,
}

export function iconFor(id: string): LucideIcon {
  return ICONS[id] ?? LayoutGrid
}
