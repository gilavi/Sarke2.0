import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SubscriptionCard } from '@/components/SubscriptionCard';

export default function Home() {
  const { profile, user } = useAuth();
  const firstName = profile?.first_name?.trim() || user?.email?.split('@')[0] || '';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-neutral-900">
          მოგესალმებით{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Sarke ვებ-აპლიკაცია — მუშაობს იმავე ანგარიშებზე, რასაც მობილური აპი.
        </p>
      </header>

      <SubscriptionCard />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">პროექტები</CardTitle>
            <CardDescription>მალე დაემატება</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-600">
              პროექტების სია, მონაწილეები, რუქა და ფაილები.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">შემოწმების აქტები</CardTitle>
            <CardDescription>მალე დაემატება</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-600">
              შემოწმების აქტების ნახვა და PDF რეპორტების გამოწერა.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">სერტიფიკატები</CardTitle>
            <CardDescription>მალე დაემატება</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-600">კვალიფიკაციის სერტიფიკატები.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
