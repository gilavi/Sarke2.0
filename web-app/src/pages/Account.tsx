import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAccountUsage, updateUserName, type AccountUsage } from '@/lib/data/account';

const STATUS_LABELS: Record<string, string> = {
  free: 'უფასო',
  active: 'აქტიური',
  lapsed: 'ვადაგასული',
};

export default function Account() {
  const { user, profile, refreshProfile, signOut, updatePassword } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  const [usage, setUsage] = useState<AccountUsage | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(profile?.first_name ?? '');
    setLastName(profile?.last_name ?? '');
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    getAccountUsage(user.id)
      .then(setUsage)
      .catch((e: unknown) => setUsageError(e instanceof Error ? e.message : String(e)));
  }, [user]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingName(true);
    setNameMsg(null);
    try {
      await updateUserName(user.id, firstName.trim(), lastName.trim());
      await refreshProfile();
      setNameMsg('სახელი განახლდა.');
    } catch (err) {
      setNameMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingName(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPw.length < 8) {
      setPwMsg('პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg('პაროლები არ ემთხვევა.');
      return;
    }
    setSavingPw(true);
    try {
      await updatePassword(newPw);
      setNewPw('');
      setConfirmPw('');
      setPwMsg('პაროლი შეცვლილია.');
    } catch (err) {
      setPwMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingPw(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-neutral-900">ანგარიში</h1>
        <p className="mt-1 text-sm text-neutral-500">მართეთ პროფილი, პაროლი და გამოწერა.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">პროფილი</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveName} className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="firstName">სახელი</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={savingName}
              />
            </div>
            <div>
              <Label htmlFor="lastName">გვარი</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={savingName}
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={savingName}>
                {savingName ? 'ინახება…' : 'შენახვა'}
              </Button>
              {nameMsg && <span className="text-sm text-neutral-600">{nameMsg}</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">გამოწერა</CardTitle>
          <CardDescription>PDF-ების გენერაციის ლიმიტი და სტატუსი.</CardDescription>
        </CardHeader>
        <CardContent>
          {usageError && <p className="text-sm text-red-700">{usageError}</p>}
          {!usage && !usageError && <p className="text-sm text-neutral-500">იტვირთება…</p>}
          {usage && (
            <div className="space-y-2 text-sm text-neutral-700">
              <div>
                სტატუსი: <span className="font-semibold">{STATUS_LABELS[usage.status] ?? usage.status}</span>
              </div>
              {usage.expiresAt && (
                <div>
                  ვადა იწურება: {new Date(usage.expiresAt).toLocaleDateString('ka-GE')}
                </div>
              )}
              <div>
                გენერირებული PDF: {usage.pdfCount}
                {usage.status !== 'active' && ` / ${usage.pdfLimit}`}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">პაროლის შეცვლა</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="newPw">ახალი პაროლი</Label>
              <Input
                id="newPw"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                disabled={savingPw}
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label htmlFor="confirmPw">გაიმეორეთ</Label>
              <Input
                id="confirmPw"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                disabled={savingPw}
                autoComplete="new-password"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={savingPw}>
                {savingPw ? 'ინახება…' : 'შეცვლა'}
              </Button>
              {pwMsg && <span className="text-sm text-neutral-600">{pwMsg}</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      <div>
        <Button type="button" variant="outline" onClick={() => void handleSignOut()}>
          <LogOut size={16} className="mr-2" /> გასვლა
        </Button>
      </div>
    </div>
  );
}
