// DocumentDetails — the reusable, type-aware screen reached by TAPPING A SAVED
// record in a list. One presentational shell; the `type` prop + which optional
// sections are passed decide what shows. This is the non-celebratory sibling of
// FlowSuccessScreen: no check disc, a real top bar with back, visible action
// chips (Edit · Duplicate · Delete), sticky scroll tabs, read-only info, a
// type-specific content slot, and the editable/view-only signature + certificate
// lists reused verbatim from components/success. Footer = Share PDF.
//
// Each route is a thin data loader that resolves the props (mirrors how the
// FlowSuccessScreen routes work). See components/document-details/AGENTS.md.
import { useMemo, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Share2 } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { Button } from '../primitives/Button';
import { IconButton } from '../primitives/IconButton';
import { useTheme, type Theme } from '../../lib/theme';
import { SuccessSignatureSection } from '../success/SuccessSignatureSection';
import { SuccessCertificateSection } from '../success/SuccessCertificateSection';
import { DocumentDetailsHeader } from './DocumentDetailsHeader';
import { DocumentActionChips } from './DocumentActionChips';
import { DocumentTabs, type DocumentTabItem } from './DocumentTabs';
import { DocumentInfoSection } from './DocumentInfoSection';
import type { DocumentDetailsProps } from './types';

export function DocumentDetails(props: DocumentDetailsProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const tabsHeight = useRef(48);

  const tabs = useMemo<DocumentTabItem[]>(() => {
    const list: DocumentTabItem[] = [
      { id: 'info', label: t('details.tabs.info') },
      { id: 'content', label: props.contentTab },
    ];
    if (props.signatures) list.push({ id: 'sig', label: t('details.tabs.signatures') });
    if (props.certificates) list.push({ id: 'cert', label: t('details.tabs.certificates') });
    return list;
  }, [t, props.contentTab, props.signatures, props.certificates]);

  const [activeId, setActiveId] = useState('info');

  const sectionLayout = (id: string) => (e: LayoutChangeEvent) => {
    offsets.current[id] = e.nativeEvent.layout.y;
  };

  const scrollToSection = (id: string) => {
    const y = offsets.current[id];
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - tabsHeight.current - 8), animated: true });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const threshold = e.nativeEvent.contentOffset.y + tabsHeight.current + 12;
    let next = tabs[0].id;
    for (const tab of tabs) {
      const y = offsets.current[tab.id];
      if (y != null && y <= threshold) next = tab.id;
    }
    if (next !== activeId) setActiveId(next);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topbar}>
        <IconButton
          icon={ChevronLeft}
          variant="outline"
          size="md"
          onPress={props.onBack}
          a11yLabel={t('details.a11y.back')}
        />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        {/* index 0 — header + action chips (scroll away) */}
        <View style={styles.headerBlock}>
          <DocumentDetailsHeader
            tileIcon={props.tileIcon}
            title={props.title}
            typeLabel={props.typeLabel}
            status={props.status}
          />
          <DocumentActionChips
            onEdit={props.onEdit}
            onDuplicate={props.onDuplicate}
            onDelete={props.onDelete}
            editing={props.editing}
            duplicating={props.duplicating}
          />
        </View>

        {/* index 1 — sticky tabs */}
        <View onLayout={(e) => { tabsHeight.current = e.nativeEvent.layout.height; }}>
          <DocumentTabs tabs={tabs} activeId={activeId} onPress={scrollToSection} />
        </View>

        {/* index 2+ — sections */}
        <View style={styles.section} onLayout={sectionLayout('info')}>
          <DocumentInfoSection rows={props.info} />
        </View>

        <View style={styles.section} onLayout={sectionLayout('content')}>
          <Text style={styles.sectionLabel}>{props.contentLabel}</Text>
          {props.children}
        </View>

        {props.signatures ? (
          <View style={styles.section} onLayout={sectionLayout('sig')}>
            <SuccessSignatureSection
              mode={props.signatures.mode}
              signatures={props.signatures.state}
              creatorName={props.signatures.creatorName}
              participants={props.signatures.participants}
            />
          </View>
        ) : null}

        {props.certificates ? (
          <View style={styles.section} onLayout={sectionLayout('cert')}>
            <SuccessCertificateSection
              items={props.certificates.items}
              onAdd={props.certificates.onAdd}
              onOpen={props.certificates.onOpen}
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={props.pdfLocked ? t('success.actions.sharePdfLocked') : t('details.actions.sharePdf')}
          onPress={props.onSharePdf}
          loading={props.sharing}
          size="xl"
          leftIcon={Share2}
          style={{ alignSelf: 'stretch', justifyContent: 'center' }}
        />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    topbar: { flexDirection: 'row', paddingHorizontal: 24, paddingTop: 6 },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 24 },
    headerBlock: { paddingHorizontal: 24 },
    section: { paddingHorizontal: 24, marginTop: 16 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.inkFaint,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    footer: {
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.hairline,
      backgroundColor: theme.colors.background,
    },
  });
}
