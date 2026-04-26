import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatShortDateTime } from '../lib/formatDate';
import type { ProjectFile } from '../types/models';

const BRAND_GREEN = '#1D9E75';

function humanSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function UploadedFilesSection({
  files,
  busy = false,
  onUpload,
  onOpen,
  onDelete,
}: {
  files: ProjectFile[];
  busy?: boolean;
  onUpload?: () => void;
  onOpen?: (f: ProjectFile) => void;
  onDelete?: (f: ProjectFile) => void;
}) {
  const [open, setOpen] = useState(false);
  const count = files.length;
  const latest = count > 0 ? files[0].created_at : null;

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={() => setOpen(o => !o)}>
        <View style={styles.iconWrap}>
          <Ionicons name="folder-outline" size={18} color="#065F46" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>ატვირთული ფაილები</Text>
          <Text style={styles.subtitle}>
            {count === 0
              ? 'ფაილები არ არის ატვირთული'
              : `${count} ფაილი · ბოლოს ${formatShortDateTime(latest)}`}
          </Text>
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#9CA3AF"
        />
      </Pressable>

      {open ? (
        <View style={styles.body}>
          {count === 0 ? (
            <View style={styles.emptyZone}>
              <Ionicons name="cloud-upload-outline" size={32} color={BRAND_GREEN} />
              <Text style={styles.emptyTitle}>ფაილები არ არის</Text>
              <Text style={styles.emptyHint}>
                ატვირთეთ პროექტის დოკუმენტაცია, ფოტოები ან გეგმები.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {files.map(f => (
                <Pressable
                  key={f.id}
                  onPress={() => onOpen?.(f)}
                  style={styles.fileRow}
                >
                  <Ionicons name="document-outline" size={18} color="#6B7280" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
                    <Text style={styles.fileMeta}>
                      {[humanSize(f.size_bytes), formatShortDateTime(f.created_at)]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  {onDelete ? (
                    <Pressable
                      onPress={() => onDelete(f)}
                      hitSlop={8}
                      style={styles.deleteBtn}
                      accessibilityLabel="წაშლა"
                    >
                      <Ionicons name="trash-outline" size={16} color="#9CA3AF" />
                    </Pressable>
                  ) : null}
                </Pressable>
              ))}
            </View>
          )}

          <Pressable
            onPress={onUpload}
            disabled={!onUpload || busy}
            style={({ pressed }) => [
              styles.uploadBtn,
              (!onUpload || busy) && { opacity: 0.6 },
              pressed && { opacity: 0.85 },
            ]}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="add" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.uploadBtnText}>
              {busy ? 'იტვირთება…' : 'ფაილის ატვირთვა'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  body: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  emptyZone: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D1FAE5',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 4,
  },
  emptyHint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  fileMeta: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: BRAND_GREEN,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
