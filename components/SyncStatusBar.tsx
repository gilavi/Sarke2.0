import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffline } from '../lib/offline';
import { useSyncQueue } from '../lib/sync-queue-hook';

export function SyncStatusBar({ onSync }: { onSync?: () => void }) {
  const { isOnline, netReady } = useOffline();
  const pendingCount = useSyncQueue();

  if (!netReady) return null;

  return (
    <Pressable onPress={onSync} style={styles.bar}>
      <View style={[styles.dot, { backgroundColor: isOnline ? '#147A4F' : '#E08A1B' }]} />
      <Text style={styles.text}>
        {isOnline ? 'ონლაინ' : 'ოფლაინ'}
        {pendingCount > 0 ? ` · ${pendingCount} მოლოდინში` : ''}
      </Text>
      {pendingCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pendingCount}</Text>
        </View>
      )}
      <Ionicons name="sync-outline" size={14} color="#4A4A4A" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EFEAE0',
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginBottom: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 12, color: '#4A4A4A', fontWeight: '600' },
  badge: {
    backgroundColor: '#C0433C',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
