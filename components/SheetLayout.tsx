// Shared layout for action/form sheets: pinned header + scrollable body + pinned footer.
//
// Use inside any sheet (bespoke Modal-based or BottomSheet `content` callback).
// When the body grows taller than the available space, the body scrolls while
// the header and footer stay anchored.

import { ReactNode } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from './primitives/A11yText';
import { useTheme } from '../lib/theme';
import { a11y } from '../lib/accessibility';

export interface SheetLayoutProps {
  /** Pinned-top region. Pass a node, or `{ title, onClose }` for the standard pattern. */
  header?: ReactNode | { title: string; onClose?: () => void };
  /** Scrollable body. */
  children: ReactNode;
  /** Pinned-bottom region (typically the primary action button). */
  footer?: ReactNode;
  /** Custom ScrollView component (e.g. BottomSheetScrollView). Defaults to KeyboardAwareScrollView. */
  ScrollComponent?: React.ComponentType<ScrollViewProps>;
  /** Extra props passed to the body ScrollView. */
  bodyScrollProps?: ScrollViewProps;
  /** Cap card height as fraction of screen. Default 0.85. */
  maxHeightRatio?: number;
  /** Use KeyboardAwareScrollView for the body. Default true. */
  keyboardAware?: boolean;
  /** Keep footer pinned at bottom of sheet card. Default true. */
  footerSticky?: boolean;
  /** Extra container style (rare). */
  style?: StyleProp<ViewStyle>;
  /** Padding for the scrollable body content. Default 0 horizontal, 12 top/bottom, gap 16. */
  bodyContentStyle?: StyleProp<ViewStyle>;
  /** Render the grab-handle bar at the top of the card. Default true.
   * Set false when nesting inside a parent (e.g. BottomSheetProvider) that
   * already draws a handle, to avoid stacking two handles. */
  showHandle?: boolean;
}

export function SheetLayout({
  header,
  children,
  footer,
  ScrollComponent,
  bodyScrollProps,
  maxHeightRatio = 0.85,
  keyboardAware = true,
  footerSticky = true,
  style,
  bodyContentStyle,
  showHandle = true,
}: SheetLayoutProps) {
  const { theme } = useTheme();
  const screenH = Dimensions.get('window').height;

  const Body = ScrollComponent ?? KeyboardAwareScrollView;
  const headerNode = renderHeader(header, theme);

  return (
    <View style={[styles.container, { maxHeight: screenH * maxHeightRatio, backgroundColor: theme.colors.surface }, style]}>
      {showHandle ? (
        <View style={styles.handleBar}>
          <View style={[styles.handle, { backgroundColor: theme.colors.hairline }]} />
        </View>
      ) : null}

      {headerNode ? <View style={[styles.headerWrap, { borderBottomColor: theme.colors.border }]}>{headerNode}</View> : null}

      <Body
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={footerSticky ? 80 : 0}
        {...bodyScrollProps}
        contentContainerStyle={[
          styles.bodyContent,
          bodyContentStyle,
          bodyScrollProps?.contentContainerStyle,
        ]}
        style={[styles.bodyScroll, bodyScrollProps?.style]}
      >
        {children}
      </Body>

      {footer ? (
        <View style={[styles.footerWrap, footerSticky && styles.footerSticky, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

function renderHeader(header: SheetLayoutProps['header'], theme: any) {
  if (!header) return null;
  if (typeof header === 'object' && header !== null && 'title' in header) {
    const { title, onClose } = header;
    return (
      <View style={styles.headerRow}>
        <Text size="xl" weight="bold" style={{ flex: 1 }} numberOfLines={1}>
          {title}
        </Text>
        {onClose ? (
          <Pressable
            onPress={onClose}
            hitSlop={12}
            {...a11y('დახურვა', 'ფანჯრის დახურვა', 'button')}
          >
            <Ionicons name="close" size={22} color={theme.colors.inkSoft} />
          </Pressable>
        ) : null}
      </View>
    );
  }
  return header;
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bodyScroll: {
    flexShrink: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 16,
  },
  footerWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerSticky: {
    // Footer stays at bottom; body scrolls above it.
  },
});
