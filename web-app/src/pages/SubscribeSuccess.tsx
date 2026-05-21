import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AuthLayout } from './auth/AuthLayout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { accountKeys } from '@/app/queryKeys';

export default function SubscribeSuccess() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    // Refresh cached subscription state so /account shows the active tier as
    // soon as the user returns from BOG.
    qc.invalidateQueries({ queryKey: accountKeys.pdfUsage() });
    qc.invalidateQueries({ queryKey: accountKeys.paymentHistory() });

    // Only trigger the custom scheme redirect when coming from the mobile app's
    // WebView (SFAuthenticationSession). The mobile Subscribe page appends
    // ?mobile=1 to the success URL so we can detect this context. On desktop
    // browsers we must NOT navigate to the custom scheme — it causes
    // ERR_UNKNOWN_URL_SCHEME and navigates the user away from the app.
    if (params.get('mobile') === '1') {
      window.location.href = 'sarke2://payment/success';
    }
  }, [qc, params]);

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
