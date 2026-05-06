import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { termsEn, termsKa, TERMS_PUBLIC_URL, type TermsBody } from '@/lib/terms';
import { cn } from '@/lib/utils';

export default function Terms() {
  const [lang, setLang] = useState<'ka' | 'en'>('ka');
  const body: TermsBody = lang === 'ka' ? termsKa : termsEn;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
          <FileText size={26} className="text-brand-600" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-neutral-900">{body.heading}</h1>
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
              <p className="text-sm leading-relaxed text-neutral-700">{s.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <a
          href={TERMS_PUBLIC_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-brand-600 hover:underline"
        >
          {body.linkLabel} →
        </a>
        <p className="mt-2 text-xs text-neutral-400">
          © 2026 Sarke 2.0 · {lang === 'ka' ? 'ყველა უფლება დაცულია' : 'All rights reserved'}
        </p>
      </div>
    </div>
  );
}
