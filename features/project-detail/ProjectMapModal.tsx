// Full-screen "projects on the map" modal opened from the project
// detail screen's map hero. Renders pins for up to 20 projects with
// coordinates; tapping a pin slides a card up from the bottom and
// tapping "გახსნა →" navigates to that project.

import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Building2, X } from 'lucide-react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { ProjectAvatar } from '../../components/ProjectAvatar';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { projectsApi } from '../../lib/services';
import type { Project } from '../../types/models';

export function useProjectMapModal(currentProject: Project | null) {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<Project | null>(null);
  const cardAnim = useRef(new Animated.Value(240)).current;
  const [allProjects, setAllProjects] = useState<Project[]>([]);

  const open = useCallback(async () => {
    setVisible(true);
    if (allProjects.length === 0) {
      const list = await projectsApi.list().catch(() => []);
      setAllProjects(list);
    }
  }, [allProjects.length]);

  const close = useCallback(() => setVisible(false), []);

  const openCard = useCallback((p: Project) => {
    setSelected(p);
    Animated.spring(cardAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 12 }).start();
  }, [cardAnim]);

  const closeCard = useCallback(() => {
    Animated.timing(cardAnim, { toValue: 240, duration: 200, useNativeDriver: true }).start(() =>
      setSelected(null),
    );
  }, [cardAnim]);

  return {
    visible,
    open,
    close,
    selected,
    cardAnim,
    openCard,
    closeCard,
    allProjects,
    currentProject,
  };
}

export type ProjectMapModalState = ReturnType<typeof useProjectMapModal>;

export function ProjectMapModal({ state }: { state: ProjectMapModalState }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { visible, close, selected, cardAnim, openCard, closeCard, allProjects, currentProject } = state;

  const mapMarkers = useMemo(() => {
    const withCoords = allProjects.filter(p => p.latitude != null && p.longitude != null);
    if (withCoords.length > 20) {
      // Limit map markers to 20 for performance
    }
    return withCoords.slice(0, 20);
  }, [allProjects]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="auto">
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: insets.top + 12, paddingBottom: 12 }}>
          <View style={{ width: 24 }} />
          <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: theme.colors.ink }}>
            პროექტები რუკაზე
          </Text>
          <Pressable onPress={close} hitSlop={10} {...a11y('დახურვა', 'რუკის დახურვა', 'button')}>
            <X size={24} color={theme.colors.ink} strokeWidth={1.5} />
          </Pressable>
        </View>
        <MapView
          provider={PROVIDER_DEFAULT}
          style={{ flex: 1 }}
          initialRegion={{
            latitude: currentProject?.latitude ?? 41.7151,
            longitude: currentProject?.longitude ?? 44.8271,
            latitudeDelta: 0.5,
            longitudeDelta: 0.5,
          }}
          onPress={closeCard}
        >
          {mapMarkers.map(p => {
            const isActive = p.id === currentProject?.id;
            const pinBg = isActive ? theme.colors.accent : theme.colors.certTint;
            return (
              <Marker
                key={p.id}
                coordinate={{ latitude: p.latitude!, longitude: p.longitude! }}
                tracksViewChanges={false}
                onPress={() => openCard(p)}
              >
                <View style={{ alignItems: 'center' }}>
                  <View style={{
                    backgroundColor: pinBg,
                    borderRadius: 20,
                    width: 32,
                    height: 32,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.28,
                    shadowRadius: 4,
                    elevation: 5,
                  }}>
                    <Building2 size={15} color={theme.colors.white} strokeWidth={1.5} />
                  </View>
                  <View style={{
                    width: 0, height: 0,
                    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7,
                    borderLeftColor: 'transparent', borderRightColor: 'transparent',
                    borderTopColor: pinBg,
                    marginTop: -1,
                  }} />
                </View>
              </Marker>
            );
          })}
        </MapView>

        {allProjects.filter(p => p.latitude != null && p.longitude != null).length > 20 && (
          <View style={{ position: 'absolute', bottom: insets.bottom + 100, left: 16, right: 16, alignItems: 'center' }}>
            <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: theme.colors.white, fontSize: 12, fontWeight: '600' }}>
                ნაჩვენებია პირველი 20 პროექტი
              </Text>
            </View>
          </View>
        )}

        {/* Slide-up project card */}
        {selected && (
          <Animated.View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            transform: [{ translateY: cardAnim }],
          }}>
            <View style={{
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: insets.bottom + 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.12,
              shadowRadius: 16,
              elevation: 12,
            }}>
              <Pressable onPress={closeCard} hitSlop={12} style={{ alignItems: 'center', paddingBottom: 10 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.hairline }} />
              </Pressable>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <ProjectAvatar project={selected} size={44} />
                <View style={{ flex: 1 }}>
                  <Text size="base" weight="bold" numberOfLines={1}>
                    {selected.company_name || selected.name}
                  </Text>
                  {selected.address ? (
                    <Text size="xs" color={theme.colors.inkSoft} numberOfLines={1} style={{ marginTop: 2 }}>
                      {selected.address}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => {
                    closeCard();
                    close();
                    router.push(`/projects/${selected.id}` as any);
                  }}
                  hitSlop={8}
                  style={{
                    backgroundColor: theme.colors.accent,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                  }}
                >
                  <Text size="sm" weight="semibold" color={theme.colors.white}>გახსნა →</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}
