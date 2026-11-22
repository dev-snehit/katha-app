import { SupportedLanguage } from '../contracts';

/**
 * Returns the localized text for a given entity and field.
 * Rule: If language is 'TE' and entity[field + 'Te'] has a non-empty string, return it.
 * Otherwise, fall back cleanly to entity[field] (English).
 */
export function getLocalizedText(
  entity: Record<string, any> | null | undefined,
  field: string,
  lang: SupportedLanguage
): string {
  if (!entity) return '';

  if (lang === 'TE') {
    const teluguVal = entity[`${field}Te`];
    if (typeof teluguVal === 'string' && teluguVal.trim().length > 0) {
      return teluguVal;
    }
  }

  const englishVal = entity[field];
  return typeof englishVal === 'string' ? englishVal : '';
}
