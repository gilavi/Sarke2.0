// Local push reminders — schedules a notification 24h before each due date.
// Notification ids are device-local, stored in AsyncStorage keyed by schedule id.
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { ScheduleWithItem } from '../types/models';

const MAP_KEY = 'sarke.reminders.map';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type ReminderMap = Record<string, string>; // scheduleId -> notificationId

async function readMap(): Promise<ReminderMap> {
  try {
    const raw = await AsyncStorage.getItem(MAP_KEY);
    return raw ? (JSON.parse(raw) as ReminderMap) : {};
  } catch {
    return {};
  }
}

async function writeMap(map: ReminderMap): Promise<void> {
  await AsyncStorage.setItem(MAP_KEY, JSON.stringify(map));
}

export async function requestPermissionsIfNeeded(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (current.canAskAgain === false) return false;
  const req = await Notifications.requestPermissionsAsync();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'შემოწმების შეხსენება',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return req.granted;
}

function triggerAt(date: Date): Notifications.DateTriggerInput {
  return { type: Notifications.SchedulableTriggerInputTypes.DATE, date };
}

/** Schedule a single reminder for the given schedule (next_due_at - 24h). */
export async function scheduleReminder(s: ScheduleWithItem): Promise<void> {
  if (!s.next_due_at) return;
  const fireAt = new Date(new Date(s.next_due_at).getTime() - 24 * 60 * 60 * 1000);
  if (fireAt.getTime() <= Date.now()) return;
  const itemName = s.project_items?.name ?? 'შემოწმება';
  const proj = s.project_items?.projects;
  const projectName = proj?.company_name || proj?.name || '';
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'ვადა გასდის ხვალ',
      body: `${projectName} — ${itemName}`,
      data: { scheduleId: s.id, projectItemId: s.project_item_id },
    },
    trigger: triggerAt(fireAt),
  });
  const map = await readMap();
  map[s.id] = id;
  await writeMap(map);
}

/** Cancel a single reminder if one was scheduled for this schedule. */
export async function cancelReminder(scheduleId: string): Promise<void> {
  const map = await readMap();
  const id = map[scheduleId];
  if (id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // non-fatal
    }
    delete map[scheduleId];
    await writeMap(map);
  }
}

/** Wipe all stored reminders and rebuild from a fresh schedules list. */
export async function rescheduleAllFromDb(schedules: ScheduleWithItem[]): Promise<void> {
  const granted = await requestPermissionsIfNeeded().catch(() => false);
  if (!granted) return;
  // Clear prior reminders
  const map = await readMap();
  await Promise.all(
    Object.values(map).map(id =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined),
    ),
  );
  await writeMap({});
  // Rebuild — never let one bad schedule abort the rest of the rebuild.
  for (const s of schedules) {
    try {
      await scheduleReminder(s);
    } catch (e) {
      console.warn('[notifications.rescheduleAllFromDb] skipped schedule', s.id, e);
    }
  }
}
