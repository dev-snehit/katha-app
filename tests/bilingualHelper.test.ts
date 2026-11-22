import { describe, it, expect } from 'vitest';
import { getLocalizedText } from '../src/lib/bilingualHelper';

describe('Bilingual Resolution Engine', () => {
  const item = {
    name: 'Sona Masoori Rice (Raw Old)',
    nameTe: 'సోనా మసూరి పాత బియ్యం',
    brand: 'Sri Lalitha',
    brandTe: 'శ్రీ లలిత',
  };

  it('returns Telugu text when language is TE and Telugu field is populated', () => {
    expect(getLocalizedText(item, 'name', 'TE')).toBe('సోనా మసూరి పాత బియ్యం');
    expect(getLocalizedText(item, 'brand', 'TE')).toBe('శ్రీ లలిత');
  });

  it('returns English text when language is EN even if Telugu field exists', () => {
    expect(getLocalizedText(item, 'name', 'EN')).toBe('Sona Masoori Rice (Raw Old)');
    expect(getLocalizedText(item, 'brand', 'EN')).toBe('Sri Lalitha');
  });

  it('falls back automatically to English when language is TE but Telugu field is empty or absent', () => {
    const itemWithoutTelugu = {
      name: 'Broken Rice / Tukda',
      nameTe: '',
      brand: 'Local Mill',
    };

    expect(getLocalizedText(itemWithoutTelugu, 'name', 'TE')).toBe('Broken Rice / Tukda');
    expect(getLocalizedText(itemWithoutTelugu, 'brand', 'TE')).toBe('Local Mill');
  });

  it('handles null and undefined entities gracefully', () => {
    expect(getLocalizedText(null, 'name', 'EN')).toBe('');
    expect(getLocalizedText(undefined, 'name', 'TE')).toBe('');
  });
});
