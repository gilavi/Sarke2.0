// Shared layout for action/form sheets: pinned header + scrollable body + pinned footer.
//
// Use inside any sheet (bespoke Modal-based or BottomSheet `content` callback).
// When the body grows taller than the available space, the body scrolls while
// the header and footer stay anchored.

import { ReactNode } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from './primitives/A11yText';
import { theme } from '../lib/theme';
import { a11y } from '../lib/accessibility';

export interface SheetLayoutProps {
  /** Pinned-top region. Pass a node, or `{ title, onClose }` for the standard pattern. */
  header?: ReactNode | { title: string; onClose?: () => void };
  /** Scrollable body. */
  children: ReactNode;
  /** Pinned-bottom region (typically the primary action button). */
  footer?: ReactNode;
  /** Custom ScrollView component (e.g. BottomSheetScrollView). Defaults to RN ScrollView. */
  ScrollComponent?: React.ComponentType<ScrollViewProps>;
  /** Extra props passed to the body ScrollView. */
  bodyScrollProps?: ScrollViewProps;
  /** Cap card height as fraction of screen. Default 0.85. */
  maxHeightRatio?: number;
  /** Wrap in KeyboardAvoidingView (iOS). Default true. */
  keyboardAvoid?: boolean;
  /** Extra container style (rare). */
  style?: StyleProp<ViewStyle>;
  /** Padding for the scrollable body content. Default 0 horizontal, 8 top/bottom. */
  bodyContentStyle?: StyleProp<ViewStyle>;
}

export function SheetLayout({
  header,
  children,
  footer,
  ScrollComponent,
  bodyScrollProps,
  maxHeightRatio = 0.85,
  keyboardAvoid = true,
  style,
  bodyContentStyle,
}: SheetLayoutProps) {
  const screenH = Dimensions.get('window').height;
  const Body = ScrollComponent ?? ScrollView;

  const headerNode = renderHeader(header);

  const inner = (
    <View style={[styles.container, { maxHeight: screenH * maxHeightRatio }, style]}>
      {headerNode ? <View style={styles.headerWrap}>{headerNode}</View> : null}
      <Body
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
      {footer ? <View style={styles.footerWrap}>{footer}</View> : null}
    </View>
  );

  if (!keyboardAvoid) return inner;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.kavWrap}
    >
      {inner}
    </KeyboardAvoidingView>
  );
}

function renderHeader(header: SheetLayoutProps['header']) {
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
  kavWrap: { flexShrink: 1 },
  container: {
    flexShrink: 1,
  },
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
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
    gap: 14,
  },
  footerWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.hairline,
  },
});
