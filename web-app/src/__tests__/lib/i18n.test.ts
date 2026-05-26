import { describe, it, expect } from 'vitest';
import i18n from '@/lib/i18n';

describe('i18n init', () => {
  it('initializes with Georgian as the default language', () => {
    expect(i18n.language).toBe('ka');
  });

  it('resolves Georgian nav strings', () => {
    expect(i18n.t('nav.home')).toBe('მთავარი');
    expect(i18n.t('nav.projects')).toBe('პროექტები');
    expect(i18n.t('common.save')).toBe('შენახვა');
  });

  it('resolves English strings after switching language', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('nav.home')).toBe('Home');
    expect(i18n.t('common.delete')).toBe('Delete');
    // Restore default
    await i18n.changeLanguage('ka');
  });
});
