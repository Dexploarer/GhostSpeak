/**
 * Translation resources for GhostSpeak Protocol
 */

import { enTranslations } from './en';
import { zhTranslations } from './zh';
import type { TranslationResource } from '../index';

export const translations: Record<string, TranslationResource> = {
  'en-US': enTranslations,
  'zh-CN': zhTranslations,
  // Additional translations will be added here
};

// Re-export individual translations
export { enTranslations, zhTranslations };

// Translation utility functions
export function getAvailableLanguages(): string[] {
  return Object.keys(translations);
}

export function hasTranslation(locale: string): boolean {
  return locale in translations;
}

export function getTranslationResource(locale: string): TranslationResource | undefined {
  return translations[locale];
}