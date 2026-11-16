import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useFeedback } from '@/components/feedback';
import { ReminderField } from '@/components/habit-bits';
import { Screen } from '@/components/screen';
import { Button, Field, Section, Segmented, Txt } from '@/components/ui';
import { useStore } from '@/data/store';
import { type Weekday, deviceTimeZone, formatLong, isValidTimeZone } from '@/domain/dates';
import { updateSettings } from '@/domain/habits';
import { exportCsv, exportJson, parseBackup } from '@/domain/transfer';
import { EMPTY_DATA, type Settings, type ThemePreference } from '@/domain/types';
import { useLayout } from '@/hooks/use-layout';
import { pickTextFile, saveTextFile } from '@/services/file-io';
import { space } from '@/theme';

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];
const WEEK_STARTS: { value: Weekday; label: string }[] = [
  { value: 1, label: 'Monday' },
  { value: 0, label: 'Sunday' },
  { value: 6, label: 'Saturday' },
];

export function SettingsScreen() {
  const { isWide } = useLayout();
  const { data, today, mutate } = useStore();
  const { confirm, notify } = useFeedback();
  const { settings } = data;
  const [zoneText, setZoneText] = useState(settings.timeZone === 'device' ? '' : settings.timeZone);
  const [zoneError, setZoneError] = useState<string | null>(null);

  const patch = (change: Partial<Settings>) => mutate((d) => updateSettings(d, change));

  const applyZone = async () => {
    const zone = zoneText.trim();
    if (!isValidTimeZone(zone)) {
      setZoneError('That is not a time zone this device recognises. Use a name like Europe/Paris or America/New_York.');
      return;
    }
    setZoneError(null);
    if (await patch({ timeZone: zone })) notify(`Days now follow ${zone}.`);
  };

  const run = async (action: () => Promise<void>, failure: string) => {
    try {
      await action();
    } catch (e) {
      notify(`${failure} ${(e as Error).message ?? ''}`.trim(), 'error');
    }
  };

  const stamp = today;
  const exportBackup = () =>
    run(async () => {
      await saveTextFile(`habit-tracker-backup-${stamp}.json`, 'application/json', exportJson(data));
      notify('Backup exported.');
    }, 'The backup could not be exported.');

  const exportHistory = () =>
    run(async () => {
      await saveTextFile(`habit-tracker-check-ins-${stamp}.csv`, 'text/csv', exportCsv(data));
      notify('Check-in history exported.');
    }, 'The history could not be exported.');

  const importBackup = () =>
    run(async () => {
      const text = await pickTextFile();
      if (text === null) return;
      const result = parseBackup(text);
      if (!result.ok) return notify(result.error, 'error');
      const { habits, checkIns } = result.data;
      const count = Object.values(checkIns).reduce((n, days) => n + Object.keys(days).length, 0);
      const ok = await confirm({
        title: 'Replace data on this device?',
        message: `The backup contains ${habits.length} ${habits.length === 1 ? 'habit' : 'habits'} and ${count} check-ins. Importing replaces the ${data.habits.length} ${data.habits.length === 1 ? 'habit' : 'habits'} currently on this device. Export a backup first if you want to keep them.`,
        confirmLabel: 'Replace with backup',
        destructive: true,
      });
      if (!ok) return;
      // Keep this device finished with onboarding even if the backup predates it.
      const imported = { ...result.data, settings: { ...result.data.settings, onboarded: true } };
      if (await mutate(() => imported)) notify('Backup imported.');
    }, 'The file could not be opened.');

  const eraseAll = async () => {
    const ok = await confirm({
      title: 'Erase everything?',
      message:
        'This permanently deletes every habit, all check-in history and your settings from this device. It cannot be undone. Export a backup first if you might want them back.',
      confirmLabel: 'Erase all data',
      destructive: true,
    });
    if (ok && (await mutate(() => ({ ...EMPTY_DATA, settings: { ...EMPTY_DATA.settings, onboarded: true } })))) {
      notify('All data erased.');
    }
  };

  return (
    <Screen tab title="Settings" maxWidth={960}>
      <View style={isWide ? styles.columns : { gap: space.xxl }}>
        <View style={{ flex: 1, gap: space.xxl }}>
          <Section title="Appearance">
            <Segmented label="Theme" options={THEMES} value={settings.theme} onChange={(theme) => patch({ theme })} />
            <Txt variant="small" color="textMuted">
              System follows your device’s light or dark setting. Text size follows your device’s font-size setting.
            </Txt>
          </Section>

          <Section title="Week starts on">
            <Segmented
              label="Week starts on"
              options={WEEK_STARTS}
              value={settings.weekStart}
              onChange={(weekStart) => patch({ weekStart })}
            />
          </Section>

          <Section title="Dates and time zone">
            <Txt>
              Today is <Txt style={{ fontWeight: '600' }}>{formatLong(today, true)}</Txt>.
            </Txt>
            <Txt variant="small" color="textMuted">
              {settings.timeZone === 'device'
                ? `Days follow this device’s time zone (${deviceTimeZone()}). A new day starts at local midnight, and travelling changes when “today” begins.`
                : `Days follow the fixed time zone ${settings.timeZone}, wherever this device is.`}{' '}
              Check-ins are stored by calendar date, so changing this never moves or rewrites past check-ins.
            </Txt>
            <Field
              label="Fixed time zone (optional)"
              value={zoneText}
              onChangeText={setZoneText}
              placeholder="e.g. Europe/Paris"
              autoCapitalize="none"
              autoCorrect={false}
              error={zoneError}
              onSubmitEditing={applyZone}
            />
            <View style={styles.row}>
              <Button label="Use this time zone" onPress={applyZone} disabled={!zoneText.trim()} />
              <Button
                label="Follow device"
                disabled={settings.timeZone === 'device'}
                onPress={async () => {
                  setZoneText('');
                  setZoneError(null);
                  if (await patch({ timeZone: 'device' })) notify('Days now follow this device.');
                }}
              />
            </View>
          </Section>
        </View>

        <View style={{ flex: 1, gap: space.xxl }}>
          <Section title="Daily reminder">
            <ReminderField
              label="Daily check-in reminder"
              value={settings.dailyReminderTime}
              defaultTime="20:00"
              onChange={(dailyReminderTime) => patch({ dailyReminderTime })}
            />
          </Section>

          <Section title="Your data">
            <Txt variant="small" color="textMuted">
              Everything is stored only on this device, in this app or browser. There is no account and nothing is sent to
              a server, so data does not sync between devices or browsers. To move or protect it, export a backup and
              import it elsewhere.
            </Txt>
            <View style={styles.row}>
              <Button label="Export backup (JSON)" icon="download" onPress={exportBackup} />
              <Button label="Export check-ins (CSV)" icon="file-text" onPress={exportHistory} />
              <Button label="Import backup" icon="upload" onPress={importBackup} />
            </View>
            <Button label="Erase all data" variant="danger" icon="trash-2" onPress={eraseAll} style={{ alignSelf: 'flex-start' }} />
          </Section>

          <Section title="About">
            <Txt variant="small" color="textMuted">
              Daily Habit Tracker App · version 1.0.0 · backup format 1
            </Txt>
          </Section>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', gap: space.xxxl, alignItems: 'flex-start' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
