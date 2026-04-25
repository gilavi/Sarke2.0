import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

/**
 * Public base URL for the signing web app on GitHub Pages. Override at
 * build time via `app.json -> extra.signWebUrl` to point at a different
 * deployment (e.g. a PR preview).
 */
import Constants from 'expo-constants';
const SIGN_WEB_URL: string =
  (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.signWebUrl as string ??
  'https://gilavi.github.io/Sarke2.0';

export function buildSigningUrl(token: string): string {
  return `${SIGN_WEB_URL}/#/sign/${token}`;
}

/**
 * Open the native Messages app with a prefilled SMS to a remote signer.
 *
 * Returns true if the OS accepted the URI (Messages opened); false if no
 * app handles `sms:` (most likely on iOS Simulator without an iCloud
 * account, where the SMS scheme isn't registered).
 *
 * iOS uses `&body=` after `sms:NUM`, Android uses `?body=`. Both are
 * handled via the conditional separator below — the URI is a valid query
 * either way after percent-encoding.
 */
export async function openSigningSMS({
  phone,
  name,
  token,
}: {
  phone: string;
  name: string;
  token: string;
}): Promise<boolean> {
  const url = buildSigningUrl(token);
  const body =
    `${name}, გთხოვთ ხელი მოაწეროთ სარკეს ინსპექციის რეპორტს:\n` +
    `${url}\n` +
    `(ლინკი 14 დღეში იწურება)`;
  const sep = Platform.OS === 'ios' ? '&' : '?';
  const sms = `sms:${phone}${sep}body=${encodeURIComponent(body)}`;
  try {
    const can = await Linking.canOpenURL(sms);
    if (!can) return false;
    await Linking.openURL(sms);
    return true;
  } catch {
    return false;
  }
}
