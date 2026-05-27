import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { privacyEn, privacyKa, type PrivacyBody } from '@/lib/privacy';
import { cn } from '@/lib/utils';

export default function Privacy() {
  const [lang, setLang] = useState<'ka' | 'en'>('ka');
  const body: PrivacyBody = lang === 'ka' ? privacyKa : privacyEn;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
          <ShieldCheck size={26} className="text-brand-600" />
        </div>
        <div>
          <h1 className="font-display text-heading-1 text-neutral-900">{body.heading}</h1>
          <p className="mt-1 text-sm text-neutral-500">{body.updated}</p>
        </div>
        <div className="inline-flex rounded-full bg-neutral-100 p-1">
          {(['ka', 'en'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={cn(
                'rounded-full px-4 py-1.5 text-xs font-semibold transition-colors',
                lang === l ? 'bg-brand-500 text-white' : 'text-neutral-600 hover:text-neutral-900',
              )}
            >
              {l === 'ka' ? 'ქართული' : 'English'}
            </button>
          ))}
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-600">{body.intro}</p>
      </header>

      <div className="space-y-3">
        {body.sections.map((s, idx) => (
          <Card key={s.title}>
            <CardHeader>
              <CardTitle className="flex items-baseline gap-2 text-base">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                  {idx + 1}
                </span>
                <span>{s.title.replace(/^\d+\.\s*/, '')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                {s.body}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <p className="text-xs text-neutral-400">
          © 2026 Hubble · {lang === 'ka' ? 'ყველა უფლება დაცულია' : 'All rights reserved'}
        </p>
      </div>
    </div>
  );
}
