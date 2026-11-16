import type { IconName } from './ui';

/** The four top-level destinations, shared by the native tab bar, the web tab bar and the desktop sidebar. */
export const NAV_ITEMS = [
  { name: 'index', href: '/', label: 'Today', icon: 'sun', sf: 'sun.max', md: 'today' },
  { name: 'habits', href: '/habits', label: 'Habits', icon: 'list', sf: 'checklist', md: 'checklist' },
  { name: 'insights', href: '/insights', label: 'Insights', icon: 'bar-chart-2', sf: 'chart.bar', md: 'bar_chart' },
  { name: 'settings', href: '/settings', label: 'Settings', icon: 'settings', sf: 'gearshape', md: 'settings' },
] as const satisfies readonly { name: string; href: string; label: string; icon: IconName; sf: string; md: string }[];
