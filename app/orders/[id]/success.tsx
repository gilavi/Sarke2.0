import { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Home, Folder, SquarePen } from 'lucide-react-native';
import { Card } from '../../../components/ui';
import { SuccessScreen } from '../../../components/success';
import { useTheme } from '../../../lib/theme';
import { ordersApi } from '../../../lib/ordersApi';
import { reopenDocument } from '../../../lib/documents/reopen';
import { queryClient } from '../../../lib/queryClient';
import { haptic } from '../../../lib/haptics';
import { ORDER_DOCUMENT_TYPE_LABEL, type Order, type OrderDocumentType } from '../../../types/models';
import { useTranslation } from 'react-i18next';

export default function OrderSuccessScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [reopening, setReopening] = useState(false);

  useEffect(() => {
    if (id) ordersApi.getById(id).then(setOrder).catch(() => {});
  }, [id]);

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
          {t('orders.orderNumberDisplay', { number: order?.formData.orderNumber ?? id?.slice(0, 4).toUpperCase() })}
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
