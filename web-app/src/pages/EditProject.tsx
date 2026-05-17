import { useRef, useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getProject, updateProject, updateProjectLogo } from '@/lib/data/projects';

export default function EditProject() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id!),
    enabled: !!id,
  });

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoChanged, setLogoChanged] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setCompanyName(project.company_name ?? '');
    setAddress(project.address ?? '');
    setContactPhone(project.contact_phone ?? '');
    setLatitude(project.latitude != null ? String(project.latitude) : '');
    setLongitude(project.longitude != null ? String(project.longitude) : '');
    setLogoDataUrl(project.logo);
  }, [project]);

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogoDataUrl(reader.result as string);
      setLogoChanged(true);
    };
    reader.readAsDataURL(file);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!id || !project) throw new Error('პროექტი ვერ მოიძებნა');
      const latNum = latitude.trim() === '' ? null : Number(latitude);
      const lngNum = longitude.trim() === '' ? null : Number(longitude);
      await updateProject(id, {
        name: name.trim() || project.name,
        company_name: companyName.trim() || null,
        address: address.trim() || null,
        contact_phone: contactPhone.trim() || null,
        latitude: latNum !== null && !isNaN(latNum) ? latNum : null,
        longitude: lngNum !== null && !isNaN(lngNum) ? lngNum : null,
      });
      if (logoChanged && logoDataUrl !== project.logo) {
        await updateProjectLogo(id, logoDataUrl);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', id] });
      void qc.invalidateQueries({ queryKey: ['projects'] });
      navigate(`/projects/${id}`);
    },
  });

  if (isLoading) return <p className="text-sm text-neutral-500">იტვირთება…</p>;
  if (!project) return <p className="text-sm text-neutral-500">პროექტი ვერ მოიძებნა.</p>;

  const canSubmit = !!name.trim() && !mutation.isPending;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <Link to={`/projects/${id}`} className="text-sm text-brand-600 hover:underline">
          <ArrowLeft size={14} className="mr-1 inline" />
          {project.name}
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900 dark:text-neutral-100">პროექტის რედაქტირება</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">დეტალები</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) mutation.mutate();
            }}
          >
            <div className="space-y-1">
              <Label>ლოგო</Label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 transition hover:border-brand-400"
                >
                  {logoDataUrl ? (
                    <img src={logoDataUrl} alt="logo preview" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-lg font-bold text-neutral-400">
                      {name ? name.charAt(0).toUpperCase() : '?'}
                    </span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition hover:opacity-100">
                    <Upload size={16} className="text-white" />
                  </span>
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoSelect}
                />
                <span className="text-sm text-neutral-500">
                  {logoChanged ? 'ლოგო შეცვლილია' : 'დააჭირეთ ლოგოს შესაცვლელად'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="name">პროექტის სახელი *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="company">კომპანია</Label>
              <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="address">მისამართი</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">ტელეფონი</Label>
              <Input id="phone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="lat">გრძედი (Latitude)</Label>
                <Input id="lat" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="მაგ: 41.7151" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lng">გრძელი (Longitude)</Label>
                <Input id="lng" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="მაგ: 44.8271" />
              </div>
            </div>

            {mutation.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {mutation.error instanceof Error ? mutation.error.message : String(mutation.error)}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={!canSubmit}>
                {mutation.isPending ? 'ინახება…' : 'შენახვა'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(`/projects/${id}`)} disabled={mutation.isPending}>
                გაუქმება
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
