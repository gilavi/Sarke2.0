import { XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthLayout } from './auth/AuthLayout';

export default function SubscribeFail() {
  return (
    <AuthLayout>
      <Card>
        <CardHeader className="flex flex-col items-center text-center">
          <XCircle className="mb-2 h-12 w-12 text-danger" />
          <CardTitle>გადახდა ვერ მოხერხდა</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-neutral-600">
            გადახდა გაუქმდა ან მოხდა შეცდომა. დახურეთ ეს ფანჯარა Sarke-ში დასაბრუნებლად.
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
