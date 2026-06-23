import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlatList } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, BookOpen } from 'lucide-react-native';
import { QuestionAvatar } from './QuestionAvatar';
import { HeaderBackButton } from './HeaderBackButton';
import { HeaderCloseButton } from './HeaderCloseButton';
import { SCAFFOLD_HELP, ScaffoldHelpEntry } from '../lib/scaffoldHelp';
import { useTheme } from '../lib/theme';

const { width: SCREEN_W } = Dimensions.get('window');

/**
 * One-time, **optional** intro carousel shown before the first xaracho
 * (scaffold) inspection. It is a help guide, not a required step — the user
 * can dismiss it any time via the ✕ in the header. `onClose` both closes the
 * modal and is what the wizard uses to mark the tour seen.
 */
export function ScaffoldTour({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* A React Native Modal renders in its own native view hierarchy, so the
          app's root safe-area provider is out of reach here — SafeAreaView /
          useSafeAreaInsets would silently report a 0 top inset and the back +
          ✕ buttons would render flush under the status bar. Wrapping the body
          in a fresh SafeAreaProvider and applying the inset as manual padding
          kills that bug class. See features/signatures/SignaturesScreen.tsx. */}
      <SafeAreaProvider>
        <ScaffoldTourBody visible={visible} onClose={onClose} />
      </SafeAreaProvider>
    </Modal>
  );
}

function ScaffoldTourBody({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<ScaffoldHelpEntry>>(null);
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // Reset to the first slide each time the tour is re-opened.
  useEffect(() => {
    if (visible) {
      setIndex(0);
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [visible]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (i !== index) setIndex(i);
  };

  const goNext = () => {
    if (index < SCAFFOLD_HELP.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (index > 0) listRef.current?.scrollToIndex({ index: index - 1, animated: true });
  };

  const isLast = index === SCAFFOLD_HELP.length - 1;
  const total = SCAFFOLD_HELP.length;

  return (
    <View style={styles.root}>
        <View style={{ flex: 1 }}>
          {/* Header: back (hidden on first slide) · "guide" pill · close (✕) */}
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <View style={styles.headerSide}>
              {index > 0 ? <HeaderBackButton onPress={goPrev} /> : null}
            </View>

            <View style={styles.guidePill}>
              <BookOpen size={14} color={theme.colors.accent} strokeWidth={2} />
              <Text style={styles.guidePillText}>გზამკვლევი</Text>
            </View>

            <View style={[styles.headerSide, styles.headerSideRight]}>
              <HeaderCloseButton onPress={onClose} />
            </View>
          </View>

          {/* Framing: makes clear this is optional help, not a required step. */}
          <View style={styles.intro}>
            <Text style={styles.introTitle}>ხარაჩოს კომპონენტები</Text>
            <Text style={styles.introCopy}>
              გაიცანით კომპონენტები შემოწმებამდე — არასავალდებულოა, შეგიძლიათ გამოტოვოთ.
            </Text>
          </View>

          <FlatList
            ref={listRef}
            data={SCAFFOLD_HELP}
            keyExtractor={item => item.key}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <View style={[styles.page, { width: SCREEN_W }]}>
                <View style={styles.card}>
                  <View style={styles.illustrationWrap}>
                    <QuestionAvatar illustrationKey={item.key} size={180} />
                  </View>
                  <Text style={styles.name}>{item.name}</Text>
                  <View style={styles.divider} />
                  <Text style={styles.copy}>{item.oneLiner}</Text>
                </View>
              </View>
            )}
          />

          <View style={styles.dots}>
            {SCAFFOLD_HELP.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <Pressable
            onPress={goNext}
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.btnText}>
              {isLast ? 'შემოწმების დაწყება' : `შემდეგი · ${index + 1}/${total}`}
            </Text>
            {!isLast ? (
              <ArrowRight size={18} color={theme.colors.white} strokeWidth={2} style={{ marginLeft: 6 }} />
            ) : null}
          </Pressable>
        </View>
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    headerSide: {
      width: 38,
      alignItems: 'flex-start',
    },
    headerSideRight: {
      alignItems: 'flex-end',
    },
    guidePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.accentSoft,
    },
    guidePillText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.accent,
    },
    intro: {
      paddingHorizontal: 28,
      paddingTop: 8,
      paddingBottom: 16,
      alignItems: 'center',
      gap: 6,
    },
    introTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.ink,
      textAlign: 'center',
    },
    introCopy: {
      fontSize: 13,
      lineHeight: 19,
      color: theme.colors.inkSoft,
      textAlign: 'center',
    },
    page: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 8,
    },
    card: {
      flex: 1,
      backgroundColor: theme.colors.card,
      borderRadius: 24,
      paddingVertical: 28,
      paddingHorizontal: 22,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    illustrationWrap: {
      marginBottom: 4,
    },
    name: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.colors.ink,
      textAlign: 'center',
      paddingHorizontal: 4,
    },
    divider: {
      width: 40,
      height: 3,
      borderRadius: 2,
      backgroundColor: theme.colors.accent,
      opacity: 0.4,
    },
    copy: {
      fontSize: 15,
      color: theme.colors.inkSoft,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: 4,
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 16,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.colors.accentSoft,
    },
    dotActive: {
      width: 22,
      backgroundColor: theme.colors.accent,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 8,
      backgroundColor: theme.colors.surface,
    },
    btn: {
      flexDirection: 'row',
      backgroundColor: theme.colors.accent,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 4,
    },
    btnText: {
      color: theme.colors.white,
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
