import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Home, Folder, SquarePen } from 'lucide-react-native';
import { Card } from '../../../components/ui';
import { SuccessScreen } from '../../../components/success';
import { OrderActSuccessView } from '../../../features/order-new/OrderActSuccessView';
import { isActStyleOrder } from '../../../features/order-new/orderFormSchema';
import { useTheme } from '../../../lib/theme';
import { ordersApi } from '../../../lib/ordersApi';
import { projectsApi } from '../../../lib/services';
import { cachedRead } from '../../../lib/cachedRead';
import { qk } from '../../../lib/apiHooks';
import { reopenDocument } from '../../../lib/documents/reopen';
import { queryClient } from '../../../lib/queryClient';
import { haptic } from '../../../lib/haptics';
import { ORDER_DOCUMENT_TYPE_LABEL, type Order, type OrderDocumentType, type Project } from '../../../types/models';
import { useTranslation } from 'react-i18next';

export default function OrderSuccessScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [reopening, setReopening] = useState(false);

  useEffect(() => {
    if (!id) return;
    // cachedRead: an order queued offline is served from its seeded detail
    // cache; the project read goes through the cache too so the act-style PDF
    // keeps its project name offline.
    cachedRead(qk.orders.byId(id), () => ordersApi.getById(id)).then(o => {
      setOrder(o);
      if (o) {
        cachedRead(qk.projects.byId(o.projectId), () => projectsApi.getById(o.projectId))
          .then(setProject).catch(() => {});
      }
    }).catch(() => {}).finally(() => setLoaded(true));
  }, [id]);

  // Don't render a success variant until the order is loaded — otherwise crane
  // orders briefly flash the classic SuccessScreen before swapping to the
  // act-style OrderActSuccessView (the two are picked by documentType).
  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  // Act-style orders (crane, scaffold) finish on the unified success screen:
  // add signature graphs and share the PDF on demand.
  if (order && isActStyleOrder(order.documentType)) {
    return <OrderActSuccessView order={order} project={project} />;
  }

  const ORDER_SUCCESS_TITLE: Partial<Record<OrderDocumentType, string>> = {
    labor_safety_specialist: t('orders.successTitleLaborSafetySpecialist'),
    alcohol_control: t('orders.successTitleAlcoholControl'),
    fire_safety_order: t('orders.successTitleFireSafetyOrder'),
    fire_safety_order_enterprise: t('orders.successTitleFireSafetyOrderEnterprise'),
    crane_operator_order: t('orders.successTitleCraneOperatorOrder'),
    crane_technical_order: t('orders.successTitleCraneTechnicalOrder'),
  };

  // Reopen the order to draft and route into the wizard in edit mode (hydrated
  // by ?editId). Re-generating the PDF re-completes it.
  const onEdit = async () => {
    if (!order || reopening) return;
    setReopening(true);
    try {
      haptic.medium();
      await reopenDocument({ kind: 'order', id: order.id }, queryClient);
      router.replace(`/orders/new?editId=${order.id}&projectId=${order.projectId}` as any);
    } catch {
      setReopening(false);
    }
  };

  return (
    <SuccessScreen
      title={order ? (ORDER_SUCCESS_TITLE[order.documentType] ?? t('orders.successTitle')) : t('orders.successTitle')}
      subtitle={t('orders.successSubtitle')}
      primary={{
        title: t('orders.successPrimaryAction'),
        icon: Home,
        onPress: () => router.replace('/(tabs)/home' as any),
      }}
      actions={[
        ...(order
          ? [{
              icon: SquarePen,
              title: t('orders.successEditTitle'),
              subtitle: t('orders.successEditSubtitle'),
              onPress: onEdit,
            }]
          : []),
        {
          icon: Folder,
          title: t('orders.successBackProjectsTitle'),
          subtitle: t('orders.successBackProjectsSubtitle'),
          onPress: () => router.replace('/(tabs)/projects' as any),
        },
      ]}
    >
      <Card>
        <Text style={styles.eyebrow}>
          {order ? ORDER_DOCUMENT_TYPE_LABEL[order.documentType] : t('orders.docFallback')}
        </Text>
        <Text style={[styles.eyebrow, { marginTop: 6, color: theme.colors.accent }]}>
          {t('orders.orderNumberDisplay', { number: (order?.formData as { orderNumber?: string })?.orderNumber ?? id?.slice(0, 4).toUpperCase() })}
        </Text>
      </Card>
    </SuccessScreen>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    eyebrow: {
      fontSize: 11,
      color: theme.colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: '700',
    },
  });
}
