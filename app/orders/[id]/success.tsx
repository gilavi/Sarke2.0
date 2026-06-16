import { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card } from '../../../components/ui';
import { SuccessScreen } from '../../../components/success';
import { useTheme } from '../../../lib/theme';
import { ordersApi } from '../../../lib/ordersApi';
import { ORDER_DOCUMENT_TYPE_LABEL, type Order, type OrderDocumentType } from '../../../types/models';

const ORDER_SUCCESS_TITLE: Partial<Record<OrderDocumentType, string>> = {
  labor_safety_specialist: 'სპეციალისტი დანიშნულია!',
  alcohol_control: 'ალკოჰოლის კონტროლი დანიშნულია!',
  fire_safety_order: 'სახანძრო უსაფრთხოების პასუხისმგებელი პირი დანიშნულია!',
  fire_safety_order_enterprise: 'საწარმოს სახანძრო უსაფრთხოების პასუხისმგებელი პირი დანიშნულია!',
  crane_operator_order: 'კოშკურა ამწის ოპერატორი დანიშნულია!',
  crane_technical_order: 'ამწის ტექნიკური შემოწმება დანიშნულია!',
};

export default function OrderSuccessScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (id) ordersApi.getById(id).then(setOrder).catch(() => {});
  }, [id]);

  return (
    <SuccessScreen
      title={order ? (ORDER_SUCCESS_TITLE[order.documentType] ?? 'ბრძანება შეიქმნა!') : 'ბრძანება შეიქმნა!'}
      subtitle="PDF ბრძანება გაიზიარა. ასლი ავტომატურად ატვირთება."
      primary={{
        title: 'მთავარ გვერდზე',
        icon: 'home',
        onPress: () => router.replace('/(tabs)/home' as any),
      }}
      actions={[
        {
          icon: 'folder-outline',
          title: 'პროექტებზე დაბრუნება',
          subtitle: 'ნახე ყველა პროექტი',
          onPress: () => router.replace('/(tabs)/projects' as any),
        },
      ]}
    >
      <Card>
        <Text style={styles.eyebrow}>
          {order ? ORDER_DOCUMENT_TYPE_LABEL[order.documentType] : 'ბრძანება'}
        </Text>
        <Text style={[styles.eyebrow, { marginTop: 6, color: theme.colors.accent }]}>
          ბრძანება №{order?.formData.orderNumber ?? id?.slice(0, 4).toUpperCase()}
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
