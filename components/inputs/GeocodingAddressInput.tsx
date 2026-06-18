import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react-native';
import { FloatingLabelInput } from './FloatingLabelInput';
import { forwardGeocode } from '../../lib/geocode';
import type { LatLng } from '../MapPicker';

interface Props {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /** Called with the geocoded coordinate when the typed address resolves. */
  onPin: (loc: LatLng) => void;
  required?: boolean;
  /** Required-field error — takes precedence over the geocode status helper. */
  error?: string;
  /** Helper shown when the geocoder is idle. */
  helper?: string;
  autoFocus?: boolean;
  /** Optional trailing icon (e.g. a map button) forwarded to the input. */
  rightIcon?: LucideIcon;
  onRightIconPress?: () => void;
}

/**
 * Address field that keeps the map pin in sync with what the user types: a
 * `FloatingLabelInput` plus a focused, debounced forward-geocode. On a match it
 * calls `onPin` (the location row / map then reflect the dropped pin) and
 * surfaces "searching…" / "not found" status via the input's `helper`.
 *
 * The forward-geocode only runs while the field is **focused** — when the map
 * overlay writes a reverse-geocoded address back into `value`, the field is
 * blurred, so it won't re-geocode and fight the pin the user just set.
 *
 * Geocoding is best-effort: the address stays free-text and the pin stays
 * optional, so a miss never blocks submission.
 */
export function GeocodingAddressInput({
  label,
  value,
  onChangeText,
  onPin,
  required,
  error,
  helper,
  autoFocus,
  rightIcon,
  onRightIconPress,
}: Props) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'idle' | 'searching' | 'notfound'>('idle');
  const focusedRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    abort.current?.abort();
  }, []);

  const runForward = (text: string) => {
    const q = text.trim();
    if (q.length < 5) { setStatus('idle'); return; }
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    setStatus('searching');
    forwardGeocode(q, ac.signal).then((hit) => {
      if (ac.signal.aborted) return;
      if (hit) {
        setStatus('idle');
        onPin({ latitude: hit.latitude, longitude: hit.longitude });
      } else {
        setStatus('notfound');
      }
    });
  };

  const handleChange = (text: string) => {
    onChangeText(text);
    setStatus('idle');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (focusedRef.current) runForward(text);
    }, 800);
  };

  const statusHelper =
    status === 'searching' ? t('geocode.searching')
    : status === 'notfound' ? t('geocode.notFound')
    : helper;

  return (
    <FloatingLabelInput
      label={label}
      required={required}
      value={value}
      onChangeText={handleChange}
      onFocus={() => { focusedRef.current = true; }}
      onBlur={() => { focusedRef.current = false; }}
      error={error}
      helper={statusHelper}
      autoFocus={autoFocus}
      rightIcon={rightIcon}
      onRightIconPress={onRightIconPress}
    />
  );
}
