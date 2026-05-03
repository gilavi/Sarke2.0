import { useEffect, useRef, useState } from 'react';
import {
  declineSignature,
  getSigningRequest,
  submitSignature,
  SIGNER_ROLE_LABEL_KA,
  type SigningRequestPayload,
} from '../lib/api';
import { SignaturePadView, type SignaturePadHandle } from '../components/SignaturePadView';
import { Brand } from '../components/Brand';

type Stage = 'loading' | 'ready' | 'signing' | 'declining' | 'submitted' | 'declined' | 'error';

export function SignPage({ token, onNavigate }: { token: string; onNavigate: (hash: string) => void }) {
  const [stage, setStage] = useState<Stage>('loading');
  const [data, setData] = useState<SigningRequestPayload | null>(null);
  const [errorKey, setErrorKey] = useState<'invalid' | 'expired' | 'consumed' | 'network' | null>(
    null,
  );
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const padRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getSigningRequest(token);
      if (cancelled) return;
      if (!res.ok) {
        setErrorKey(res.error);
        setStage('error');
        return;
      }
      setData(res.data);
      setStage('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (stage === 'loading') {
    return (
      <div className="app">
        <Brand />
        <div className="spinner" />
      </div>
    );
  }

  if (stage === 'error') {
    return <ErrorView errorKey={errorKey ?? 'invalid'} />;
  }

  if (!data) return null;

  const safety =
    data.is_safe_for_use === false
      ? { label: '✗ არ არის უსაფრთხო ექსპლუატაციისთვის', cls: 'pill-unsafe' }
      : data.is_safe_for_use === true
        ? { label: '✓ უსაფრთხოა ექსპლუატაციისთვის', cls: 'pill-safe' }
        : null;

  const handleSign = async () => {
    if (!padRef.current || padRef.current.isEmpty()) {
      alert('გთხოვთ ხელი მოაწეროთ ყუთში');
      return;
    }
    setStage('signing');
    const blob = await padRef.current.toPngBlob();
    if (!blob) {
      alert('ვერ მოხერხდა ხელმოწერის შენახვა, სცადეთ ხელახლა');
      setStage('ready');
      return;
    }
    const res = await submitSignature(token, blob);
    if (!res.ok) {
      alert(`შეცდომა: ${res.error}`);
      setStage('ready');
      return;
    }
    setStage('submitted');
    onNavigate('#/success');
  };

  const handleDecline = async () => {
    setStage('declining');
    const res = await declineSignature(token, declineReason.trim());
    if (!res.ok) {
      alert(`შეცდომა: ${res.error}`);
      setStage('ready');
      return;
    }
    setStage('declined');
    onNavigate('#/declined');
  };

  return (
    <div className="app">
      <Brand />
      <h1 className="title">შემოწმების აქტის რეპორტის ხელის მოწერა</h1>
      <p className="subtitle">
        გამარჯობა, <strong>{data.signer_name}</strong>. {data.expert_name}-მ მოგთხოვათ ხელის
        მოწერა როგორც{' '}
        <strong>{SIGNER_ROLE_LABEL_KA[data.signer_role] ?? data.signer_role}</strong>.
      </p>

      <div className="card">
        <p className="eyebrow">შემოწმების აქტი</p>
        <p style={{ fontSize: 17, fontWeight: 700, margin: '4px 0' }}>{data.inspection_title}</p>
        {data.project_name ? <p className="meta">{data.project_name}</p> : null}
        {data.completed_at ? (
          <p className="meta">{new Date(data.completed_at).toLocaleString('ka-GE')}</p>
        ) : null}
        {safety ? (
          <div style={{ marginTop: 8 }}>
            <span className={`pill ${safety.cls}`}>{safety.label}</span>
          </div>
        ) : null}
        {data.conclusion_text ? (
          <p style={{ marginTop: 10, color: 'var(--ink)', lineHeight: 1.5 }}>
            {data.conclusion_text}
          </p>
        ) : null}
        {data.pdf_signed_url ? (
          <a
            className="pdf-link"
            href={data.pdf_signed_url}
            target="_blank"
            rel="noreferrer"
          >
            📄 PDF რეპორტის ნახვა
          </a>
        ) : null}
      </div>

      {!showDecline ? (
        <>
          <div className="label">ხელი მოაწერეთ აქ</div>
          <SignaturePadView ref={padRef} />

          <div className="button-row">
            <button
              className="button button-ghost"
              onClick={() => setShowDecline(true)}
              disabled={stage === 'signing' || stage === 'declining'}
            >
              უარის თქმა
            </button>
            <button
              className="button button-primary"
              onClick={handleSign}
              disabled={stage === 'signing' || stage === 'declining'}
            >
              {stage === 'signing' ? 'იგზავნება…' : 'ხელის მოწერა'}
            </button>
          </div>
        </>
      ) : (
        <div className="card" style={{ marginTop: 14 }}>
          <p className="eyebrow">უარი ხელის მოწერაზე</p>
          <p className="meta">
            მიუთითე მოკლე მიზეზი (არასავალდებულო) — ექსპერტი ხედავს ამ ტექსტს.
          </p>
          <textarea
            className="textarea"
            value={declineReason}
            onChange={e => setDeclineReason(e.target.value)}
            placeholder="მაგ. პრობლემები მე-3 პუნქტში"
            maxLength={500}
            rows={4}
          />
          <div className="button-row">
            <button
              className="button button-secondary"
              onClick={() => {
                setShowDecline(false);
                setDeclineReason('');
              }}
              disabled={stage === 'declining'}
            >
              გაუქმება
            </button>
            <button
              className="button button-danger"
              onClick={handleDecline}
              disabled={stage === 'declining'}
            >
              {stage === 'declining' ? 'იგზავნება…' : 'უარის დადასტურება'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorView({ errorKey }: { errorKey: 'invalid' | 'expired' | 'consumed' | 'network' }) {
  const titleByKey: Record<typeof errorKey, string> = {
    invalid: 'ლინკი არასწორია',
    expired: 'ლინკის ვადა გასულია',
    consumed: 'ლინკი უკვე გამოყენებულია',
    network: 'ქსელის შეცდომა',
  };
  const bodyByKey: Record<typeof errorKey, string> = {
    invalid: 'ეს ლინკი ვერ მოიძებნა. დარწმუნდი, რომ მთლიანად დააკოპირე.',
    expired: 'ლინკი 14 დღით მოქმედებს. დაუკავშირდი ექსპერტს ახალი ლინკისთვის.',
    consumed: 'ხელი უკვე მოწერილია ან უარი ითქვა. ექსპერტთან შეამოწმე სტატუსი.',
    network: 'შეამოწმე ინტერნეტ კავშირი და განაახლე გვერდი.',
  };
  const iconByKey: Record<typeof errorKey, string> = {
    invalid: '🔗',
    expired: '⏳',
    consumed: '✓',
    network: '⚠️',
  };
  const iconClsByKey: Record<typeof errorKey, string> = {
    invalid: 'icon-warn',
    expired: 'icon-warn',
    consumed: 'icon-success',
    network: 'icon-error',
  };
  return (
    <div className="app">
      <Brand />
      <div className="card center-card">
        <div className={`icon-circle ${iconClsByKey[errorKey]}`}>{iconByKey[errorKey]}</div>
        <h1 className="title">{titleByKey[errorKey]}</h1>
        <p className="subtitle">{bodyByKey[errorKey]}</p>
      </div>
    </div>
  );
}
