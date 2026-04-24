import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { templatesApi } from '../lib/services';
import { Skeleton } from '../components/Skeleton';
import { theme } from '../lib/theme';
import type { Template } from '../types/models';

const CATEGORY_META: Record<string, { icon: any; tint: string; bg: string }> = {
  xaracho: { icon: 'construct', tint: theme.colors.accent, bg: theme.colors.accentSoft },
  harness: { icon: 'body', tint: theme.colors.harnessTint, bg: theme.colors.harnessSoft },
  other: { icon: 'document-text', tint: theme.colors.inkSoft, bg: theme.colors.subtleSurface },
};

function metaFor(category: string) {
  return CATEGORY_META[category] ?? CATEGORY_META.other;
}

export default function NewInspectionModal() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void templatesApi.list().then(ts => {
        setTemplates(ts.filter(t => t.is_system));
        setLoaded(true);
      });
    }, []),
  );

  const start = (t: Template) => {
    router.replace(`/template/${t.id}/start` as any);
  };

  // Group by category for a cleaner layout when we have 8-12 templates
  const xaracho = templates.filter(t => t.category === 'xaracho');
  const harness = templates.filter(t => t.category === 'harness');
  const other = templates.filter(t => t.category !== 'xaracho' && t.category !== 'harness');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Handle */}
      <View style={styles.handle} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>ახალი შემოწმება</Text>
          <Text style={styles.subtitle}>აირჩიე შემოწმების ტიპი</Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={theme.colors.inkSoft} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {!loaded && templates.length === 0 ? (
          <View style={styles.group}>
            <Skeleton width={80} height={11} />
            <View style={styles.groupCards}>
              {Array.from({ length: 3 }).map((_, i) => (
                <View key={i} style={styles.row}>
                  <Skeleton width={46} height={46} radius={12} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <Skeleton width={'70%'} height={15} />
                    <Skeleton width={'40%'} height={11} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <>
            {xaracho.length > 0 && (
              <TemplateGroup label="ხარაჩო" templates={xaracho} onSelect={start} />
            )}
            {harness.length > 0 && (
              <TemplateGroup label="სამუშაო ქამრები" templates={harness} onSelect={start} />
            )}
            {other.length > 0 && (
              <TemplateGroup label="სხვა" templates={other} onSelect={start} />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TemplateGroup({
  label,
  templates,
  onSelect,
}: {
  label: string;
  templates: Template[];
  onSelect: (t: Template) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.groupCards}>
        {templates.map(t => (
          <TemplateRow key={t.id} template={t} onPress={() => onSelect(t)} />
        ))}
      </View>
    </View>
  );
}

function TemplateRow({ template, onPress }: { template: Template; onPress: () => void }) {
  const { icon, tint, bg } = metaFor(template.category ?? 'other');
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.rowIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={24} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{template.name}</Text>
        <Text style={styles.rowSub}>დაიწყე კითხვარი</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.inkFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.hairline,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.inkSoft,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.subtleSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 20,
  },
  group: {
    gap: 8,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  groupCards: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  rowPressed: {
    backgroundColor: theme.colors.subtleSurface,
  },
  rowIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  rowSub: {
    fontSize: 12,
    color: theme.colors.inkSoft,
    marginTop: 2,
  },
});
