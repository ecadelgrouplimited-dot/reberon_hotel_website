import type { Permission } from '@reberon/contracts';
import {
  BedDouble, BookOpenText, CalendarRange, CircleHelp, ConciergeBell, FileText, Hammer, Home, Image, Inbox, ListChecks, Map, Navigation, ScrollText,
  Settings, Shuffle, SprayCan, Building2, Users, Rocket, type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  perm: Permission;
  badge?: 'inbox' | 'waitlist' | 'publishing';
  later?: string;
}
export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    items: [
      { label: 'Today', href: '/', icon: Home, perm: 'dashboard:view' },
      { label: 'Inbox', href: '/inbox', icon: Inbox, perm: 'inbox:read', badge: 'inbox' },
      { label: 'First-stay list', href: '/waitlist', icon: ListChecks, perm: 'waitlist:read', badge: 'waitlist' },
    ],
  },
  {
    label: 'Website',
    items: [
      { label: 'Publishing', href: '/website/publishing', icon: Rocket, perm: 'content:read', badge: 'publishing' },
      { label: 'Pages', href: '/website/pages', icon: FileText, perm: 'content:read' },
      { label: 'Rooms', href: '/website/rooms', icon: BedDouble, perm: 'content:read' },
      { label: 'Facilities', href: '/website/facilities', icon: Building2, perm: 'content:read' },
      { label: 'Kapchorwa', href: '/website/destinations', icon: Map, perm: 'content:read' },
      { label: 'Hotel rising', href: '/website/rising', icon: Hammer, perm: 'content:read' },
      { label: 'Questions', href: '/website/faqs', icon: CircleHelp, perm: 'content:read' },
      { label: 'Navigation', href: '/website/navigation', icon: Navigation, perm: 'content:read' },
      { label: 'Redirects', href: '/website/redirects', icon: Shuffle, perm: 'content:read' },
      { label: 'Media', href: '/media', icon: Image, perm: 'media:read' },
    ],
  },
  {
    label: 'Coming with the building',
    items: [
      { label: 'Reservations', href: '#', icon: BookOpenText, perm: 'dashboard:view', later: 'II' },
      { label: 'Calendar & rates', href: '#', icon: CalendarRange, perm: 'dashboard:view', later: 'II' },
      { label: 'Front desk', href: '#', icon: ConciergeBell, perm: 'dashboard:view', later: 'IV' },
      { label: 'Housekeeping', href: '#', icon: SprayCan, perm: 'rooms:status', later: 'IV' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Settings', href: '/settings', icon: Settings, perm: 'settings:read' },
      { label: 'People', href: '/settings/users', icon: Users, perm: 'users:manage' },
      { label: 'Audit log', href: '/settings/audit', icon: ScrollText, perm: 'audit:read' },
    ],
  },
];
