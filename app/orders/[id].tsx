// Read-only order (ბრძანება) detail screen.
//
// Orders had no detail screen — rows were display-only and the only post-create
// surface was the success screen. This screen renders the order summary (reusing
// the wizard's Step4Summary), a header "edit" action that reopens the order to
// draft and routes into the create form in edit mode (?editId=), and a share
// button for the stored PDF. See lib/documents/reopen.ts.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SquarePen, Share2, CircleAlert, Hourglass } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { A11yText as Text } from '../../components/primitives/A11yText';
import { Button } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ErrorScreen } from '../../components/ErrorScreen';
import { SkeletonListCard } from '../../components/Skeleton';
import { useTheme } from '../../lib/theme';
import { useToast } from '../../lib/toast';
import { ordersApi } from '../../lib/ordersApi';
import { projectsApi } from '../../lib/services';
import { queryClient } from '../../lib/queryClient';
import { cachedRead } from '../../lib/cachedRead';
import { qk } from '../../lib/apiHooks';
import { reopenDocument } from '../../lib/documents/reopen';
import { haptic } from '../../lib/haptics';
import { friendlyError } from '../../lib/errorMap';
import { shareStoredPdf } from '../../lib/sharePdf';
import { Step4Summary } from '../../features/order-new/Step4Summary';
import { INITIAL_FORM, type CombinedForm } from '../../features/order-new/orderFormSchema';
import { makeStyles as makeOrderStyles } from '../../features/order-new/styles';
import { ORDER_DOCUMENT_TYPE_LABEL, type Order, type Project } from '../../types/models';

export default function OrderDetailScreen() {
  const { theme } = useTheme();
  const orderStyles = useMemo(() => makeOrderStyles(theme), [theme]);
  const s = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      // cachedRead: identical online; offline serves the cached (or queued-
      // optimistic) order instead of failing into the not-found state.
      const o = await cachedRead(qk.orders.byId(id), () => ordersApi.getById(id));
      if (!o) { setNotFound(true); return; }
      setOrder(o);
      projectsApi.getById(o.projectId).then(setProject).catch(() => {});
    } catch {
      setNotFound(true);
    } finally {
      setLoaded(true);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);
  // Refetch on focus so returning to this screen reflects a just-saved edit.
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // buildFormData keeps identical field names, so the stored form_data maps
  // straight back onto CombinedForm for the summary view.
  const form = useMemo<CombinedForm>(
    () => ({ ...INITIAL_FORM, ...((order?.formData ?? {}) as Partial<CombinedForm>) }),
    [order],
  );

  // Reopen to draft and route into the create form in edit mode; generating the
  // PDF there re-completes the order.
  const onEdit = async () => {
    if (!order || reopening) return;
    setReopening(true);
    try {
      haptic.medium();
      await reopenDocument({ kind: 'order', id: order.id }, queryClient);
      router.replace(`/orders/new?editId=${order.id}&projectId=${order.projectId}` as any);
    } catch (e) {
      toast.error(friendlyError(e, 'რედაქტირება ვერ მოხერხდა'));
      setReopening(false);
    }
  };

  const onShare = async () => {
    if (!order?.pdfUrl || sharing) return;
    setSharing(true);
    try {
      await shareStoredPdf(order.pdfUrl);
    } catch (e) {
      toast.error(friendlyError(e, 'გაზიარება ვერ მოხერხდა'));
    } finally {
      setSharing(false);
    }
  };

  if (!id) {
    return <ErrorScreen onGoHome={() => router.replace('/(tabs)/home')} onRetry={() => router.back()} />;
  }

  const title = order ? (ORDER_DOCUMENT_TYPE_LABEL[order.documentType] ?? 'ბრძანება') : 'ბრძანება';

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="ბრძანება" />
        <View style={{ flex: 1, padding: 16 }}>
          <SkeletonListCard rows={6} />
        </View>
      </View>
    );
  }

  if (notFound || !order) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="ბრძანება" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <CircleAlert size={48} color={theme.colors.borderStrong} strokeWidth={1.5} />
          <Text style={{ color: theme.colors.inkFaint, fontSize: 15 }}>ბრძანება ვერ მოიძებნა</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={title}
        right={
          <Pressable
            onPress={onEdit}
            disabled={reopening}
            hitSlop={12}
            accessibilityLabel="რედაქტირება"
            style={{ paddingHorizontal: 4, opacity: reopening ? 0.5 : 1 }}
          >
            <SquarePen size={20} color={theme.colors.ink} strokeWidth={1.5} />
          </Pressable>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 12 }}
      >
        {order.status === 'draft' && (
          <View style={s.draftChip}>
            <Hourglass size={12} color={theme.colors.certTint} strokeWidth={1.5} />
            <Text style={s.draftChipText}>დრაფტი</Text>
          </View>
        )}

        <Step4Summary form={form} docType={order.documentType} project={project} s={orderStyles} />
      </ScrollView>

      {order.pdfUrl ? (
        <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Button
            title={sharing ? 'მზადდება…' : 'PDF-ის გაზიარება'}
            leftIcon={Share2}
            variant="primary"
            loading={sharing}
            onPress={onShare}
            style={{ width: '100%' }}
          />
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    draftChip: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.warnSoft,
      borderRadius: 16,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    draftChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.certTint,
    },
    footer: {
      paddingHorizontal: 24,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.hairline,
      backgroundColor: theme.colors.background,
    },
  });
}
