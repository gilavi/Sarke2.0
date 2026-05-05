import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthLayout } from './auth/AuthLayout';

export default function SubscribeSuccess() {
  useEffect(() => {
    // Triggers SFAuthenticationSession to close and hand control back to the app.
    // Mobile app's _layout.tsx also listens for this URL on cold start.
    window.location.href = 'sarke://payment/success';
  }, []);

  return (
    <AuthLayout>
      <Card>
        <CardHeader className="flex flex-col items-center text-center">
          <CheckCircle2 className="mb-2 h-12 w-12 text-brand-500" />
          <CardTitle>გადახდა დასრულდა</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-neutral-600">
            გამოწერა გააქტიურდა! შეგიძლიათ დახუროთ ეს ფანჯარა.
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
