import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AuthLayout } from './auth/AuthLayout';
import { useNavigate } from 'react-router-dom';

export default function SubscribeSuccess() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    // Refresh cached subscription state so /account shows the active tier as
    // soon as the user returns from BOG.
    qc.invalidateQueries({ queryKey: ['pdf-usage'] });
    qc.invalidateQueries({ queryKey: ['payment-history'] });

    // For mobile: triggers SFAuthenticationSession to close and hand control back
    // to the app. The mobile app's _layout.tsx also listens for this URL on cold
    // start. On desktop browsers this is a no-op (unknown scheme).
    window.location.href = 'sarke://payment/success';
  }, [qc]);

  return (
    <AuthLayout>
      <Card>
        <CardHeader className="flex flex-col items-center text-center">
          <CheckCircle2 className="mb-2 h-12 w-12 text-brand-500" />
          <CardTitle>გადახდა დასრულდა</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-neutral-600">
            გამოწერა გააქტიურდა! შეგიძლიათ დახუროთ ეს ფანჯარა ან გადახვიდეთ ანგარიშის გვერდზე.
          </p>
          <Button onClick={() => navigate('/account')} className="w-full">
            ანგარიშის ნახვა
          </Button>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
