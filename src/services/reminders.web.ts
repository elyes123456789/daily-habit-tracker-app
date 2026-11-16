/**
 * Browser reminders. Without a push server a web page can only notify while it
 * is open, so these fire from a timer in the open tab or installed window.
 */
import { toLocalDate, weekdayOf } from '@/domain/dates';
import type { AppData } from '@/domain/types';

import { planReminders } from './reminder-plan';

const supported = () => typeof window !== 'undefined' && 'Notification' in window;

export function getReminderSupport(): { available: boolean; note: string } {
  if (!supported()) {
    return {
      available: false,
      note: 'This browser does not support notifications, so reminders are unavailable here. Everything else works as normal.',
    };
  }
  if (Notification.permission === 'denied') {
    return {
      available: false,
      note: 'Notifications are blocked for this site. Allow them in your browser’s site settings to use reminders.',
    };
  }
  return {
    available: true,
    note: 'In a browser, reminders can only appear while this app is open in a tab or installed window. For reminders when the app is closed, use the Android or iOS app.',
  };
}

export async function ensurePermission(): Promise<boolean> {
  if (!supported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

let latest: AppData | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
const fired = new Set<string>();

function check() {
  if (!latest || !supported() || Notification.permission !== 'granted') return;
  const now = new Date();
  const today = toLocalDate(now, latest.settings.timeZone);
  const minutes = now.getHours() * 60 + now.getMinutes();
  for (const r of planReminders(latest)) {
    const key = `${today}|${r.id}`;
    const due = r.hour * 60 + r.minute;
    // A 5-minute window tolerates throttled background-tab timers.
    if (fired.has(key) || minutes < due || minutes - due > 5) continue;
    if (r.weekdays && !r.weekdays.includes(weekdayOf(today))) continue;
    if (r.id !== 'daily' && latest.checkIns[r.id]?.[today]) continue; // already checked in
    fired.add(key);
    new Notification(r.title, { body: r.body, tag: key });
  }
}

export async function syncReminders(data: AppData): Promise<void> {
  latest = data;
  const needed = planReminders(data).length > 0;
  if (needed && !timer) timer = setInterval(check, 30_000);
  if (!needed && timer) {
    clearInterval(timer);
    timer = null;
  }
}
