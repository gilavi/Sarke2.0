import { describe, it, expect } from 'vitest';
import {
  BRIEFING_TOPIC_KEYS,
  BRIEFING_TOPIC_LABELS_KA,
  LEGACY_BRIEFING_TOPIC_LABELS_KA,
  KNOWN_BRIEFING_TOPIC_KEYS,
  ALL_BRIEFING_TOPIC_LABELS_KA,
} from '../../lib/briefingTopics';
import { buildBriefingPdfHtml } from '../../lib/briefingPdf';
import ka from '../../locales/ka.json';
import en from '../../locales/en.json';
import type { Briefing, Project } from '../../types/models';

describe('briefing topic catalog', () => {
  it('has the 15 document topics + free-text other, other last, all unique', () => {
    expect(BRIEFING_TOPIC_KEYS).toHaveLength(16);
    expect(BRIEFING_TOPIC_KEYS[BRIEFING_TOPIC_KEYS.length - 1]).toBe('other');
    expect(new Set(BRIEFING_TOPIC_KEYS).size).toBe(BRIEFING_TOPIC_KEYS.length);
  });

  it('gives every catalog key a non-empty Georgian label', () => {
    for (const key of BRIEFING_TOPIC_KEYS) {
      expect(BRIEFING_TOPIC_LABELS_KA[key], key).toBeTruthy();
    }
  });

  it('known keys = catalog + the 3 legacy keys', () => {
    expect(KNOWN_BRIEFING_TOPIC_KEYS).toEqual([
      ...BRIEFING_TOPIC_KEYS,
      ...Object.keys(LEGACY_BRIEFING_TOPIC_LABELS_KA),
    ]);
    expect(Object.keys(LEGACY_BRIEFING_TOPIC_LABELS_KA)).toEqual(['scaffold_safety', 'ppe', 'fire_safety']);
  });
});

describe('catalog ↔ locales parity (no drift between the PDF map and the app)', () => {
  const kaTopics = (ka as any).briefings.topics as Record<string, string>;
  const enTopics = (en as any).briefings.topics as Record<string, string>;

  it('ka.json mirrors BRIEFING_TOPIC_LABELS_KA exactly for every catalog key', () => {
    for (const key of BRIEFING_TOPIC_KEYS) {
      expect(kaTopics[key], `ka.briefings.topics.${key}`).toBe(BRIEFING_TOPIC_LABELS_KA[key]);
    }
  });

  it('en.json defines every catalog + legacy key (non-empty)', () => {
    for (const key of KNOWN_BRIEFING_TOPIC_KEYS) {
      expect(enTopics[key], `en.briefings.topics.${key}`).toBeTruthy();
    }
  });

  it('ka.json defines the legacy keys too (historical briefings still render)', () => {
    for (const key of Object.keys(LEGACY_BRIEFING_TOPIC_LABELS_KA)) {
      expect(kaTopics[key]).toBe(LEGACY_BRIEFING_TOPIC_LABELS_KA[key]);
    }
  });
});

describe('briefing PDF renders catalog + legacy + custom topics', () => {
  function mockBriefing(topics: string[]): Briefing {
    return {
      id: 'b1', projectId: 'p1', dateTime: '2026-07-01T09:00:00.000Z',
      topics, participants: [{ name: 'პირი 1', signature: null }],
      inspectorName: 'გიორგი ხ.', inspectorSignature: null,
      createdAt: '2026-07-01T09:30:00.000Z',
    } as unknown as Briefing;
  }
  const project = { name: 'ობიექტი', address: 'თბილისი' } as unknown as Project;

  it('renders new catalog topic labels', () => {
    const html = buildBriefingPdfHtml(
      mockBriefing(['chemical_safety', 'first_aid', 'load_handling']),
      project,
    );
    expect(html).toContain(ALL_BRIEFING_TOPIC_LABELS_KA.chemical_safety);
    expect(html).toContain(ALL_BRIEFING_TOPIC_LABELS_KA.first_aid);
    expect(html).toContain('ინსტრუქტაჟის თემატიკა');
  });

  it('still renders legacy keys + strips the custom: prefix', () => {
    const html = buildBriefingPdfHtml(
      mockBriefing(['scaffold_safety', 'custom:ჩემი თემა']),
      project,
    );
    expect(html).toContain('ხარაჩოს უსაფრთხოება');
    expect(html).toContain('ჩემი თემა');
    expect(html).not.toContain('custom:');
  });
});
