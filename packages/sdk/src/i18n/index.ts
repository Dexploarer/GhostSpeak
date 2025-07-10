/**
 * GhostSpeak Protocol Internationalization Framework
 * 
 * Provides comprehensive i18n support for the TypeScript SDK and developer tools.
 * Supports multiple languages, cultural adaptations, and developer experience localization.
 */

export interface LocaleConfig {
  /** Locale identifier (e.g., 'en-US', 'zh-CN', 'ja-JP') */
  locale: string;
  /** Human-readable locale name */
  name: string;
  /** RTL support flag */
  rtl: boolean;
  /** Number format preferences */
  numberFormat: Intl.NumberFormatOptions;
  /** Date format preferences */
  dateFormat: Intl.DateTimeFormatOptions;
  /** Currency preferences for transaction displays */
  currency: string;
  /** Decimal separator for large numbers */
  decimalSeparator: string;
  /** Timezone preference */
  timezone: string;
}

export interface TranslationResource {
  /** Translation keys and values */
  [key: string]: string | TranslationResource;
}

export interface I18nOptions {
  /** Default locale */
  defaultLocale: string;
  /** Available locales */
  locales: LocaleConfig[];
  /** Translation resources */
  resources: Record<string, TranslationResource>;
  /** Fallback locale for missing translations */
  fallbackLocale: string;
  /** Enable interpolation */
  interpolation: boolean;
  /** Enable pluralization */
  pluralization: boolean;
}

class GhostSpeakI18n {
  private currentLocale: string;
  private options: I18nOptions;
  private cache: Map<string, string> = new Map();

  constructor(options: I18nOptions) {
    this.options = options;
    this.currentLocale = options.defaultLocale;
  }

  /**
   * Set the current locale
   */
  setLocale(locale: string): void {
    if (!this.options.locales.find(l => l.locale === locale)) {
      throw new Error(`Unsupported locale: ${locale}`);
    }
    this.currentLocale = locale;
    this.cache.clear();
  }

  /**
   * Get the current locale
   */
  getLocale(): string {
    return this.currentLocale;
  }

  /**
   * Get locale configuration
   */
  getLocaleConfig(locale?: string): LocaleConfig | undefined {
    const targetLocale = locale || this.currentLocale;
    return this.options.locales.find(l => l.locale === targetLocale);
  }

  /**
   * Translate a key with optional interpolation
   */
  t(key: string, values?: Record<string, any>): string {
    const cacheKey = `${this.currentLocale}:${key}:${JSON.stringify(values || {})}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let translation = this.getTranslation(key, this.currentLocale) || 
                     this.getTranslation(key, this.options.fallbackLocale) || 
                     key;

    if (values && this.options.interpolation) {
      translation = this.interpolate(translation, values);
    }

    this.cache.set(cacheKey, translation);
    return translation;
  }

  /**
   * Pluralization support
   */
  plural(key: string, count: number, values?: Record<string, any>): string {
    if (!this.options.pluralization) {
      return this.t(key, { ...values, count });
    }

    const pluralKey = this.getPluralKey(key, count);
    return this.t(pluralKey, { ...values, count });
  }

  /**
   * Format number according to locale
   */
  formatNumber(value: number): string {
    const config = this.getLocaleConfig();
    if (!config) return value.toString();

    return new Intl.NumberFormat(config.locale, config.numberFormat).format(value);
  }

  /**
   * Format date according to locale
   */
  formatDate(date: Date): string {
    const config = this.getLocaleConfig();
    if (!config) return date.toISOString();

    return new Intl.DateTimeFormat(config.locale, config.dateFormat).format(date);
  }

  /**
   * Format currency according to locale
   */
  formatCurrency(amount: number, currency?: string): string {
    const config = this.getLocaleConfig();
    const targetCurrency = currency || config?.currency || 'USD';

    return new Intl.NumberFormat(this.currentLocale, {
      style: 'currency',
      currency: targetCurrency,
    }).format(amount);
  }

  private getTranslation(key: string, locale: string): string | undefined {
    const resource = this.options.resources[locale];
    if (!resource) return undefined;

    return this.getNestedValue(resource, key);
  }

  private getNestedValue(obj: TranslationResource, path: string): string | undefined {
    const keys = path.split('.');
    let current: any = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return typeof current === 'string' ? current : undefined;
  }

  private interpolate(template: string, values: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return values[key]?.toString() || match;
    });
  }

  private getPluralKey(key: string, count: number): string {
    if (count === 0) return `${key}.zero`;
    if (count === 1) return `${key}.one`;
    return `${key}.other`;
  }
}

// Default locale configurations
export const SUPPORTED_LOCALES: LocaleConfig[] = [
  {
    locale: 'en-US',
    name: 'English (United States)',
    rtl: false,
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 9 },
    dateFormat: { year: 'numeric', month: 'short', day: 'numeric' },
    currency: 'USD',
    decimalSeparator: '.',
    timezone: 'America/New_York'
  },
  {
    locale: 'zh-CN',
    name: '中文 (简体)',
    rtl: false,
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 9 },
    dateFormat: { year: 'numeric', month: 'short', day: 'numeric' },
    currency: 'CNY',
    decimalSeparator: '.',
    timezone: 'Asia/Shanghai'
  },
  {
    locale: 'ja-JP',
    name: '日本語',
    rtl: false,
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 9 },
    dateFormat: { year: 'numeric', month: 'short', day: 'numeric' },
    currency: 'JPY',
    decimalSeparator: '.',
    timezone: 'Asia/Tokyo'
  },
  {
    locale: 'ko-KR',
    name: '한국어',
    rtl: false,
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 9 },
    dateFormat: { year: 'numeric', month: 'short', day: 'numeric' },
    currency: 'KRW',
    decimalSeparator: '.',
    timezone: 'Asia/Seoul'
  },
  {
    locale: 'es-ES',
    name: 'Español',
    rtl: false,
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 9 },
    dateFormat: { year: 'numeric', month: 'short', day: 'numeric' },
    currency: 'EUR',
    decimalSeparator: ',',
    timezone: 'Europe/Madrid'
  },
  {
    locale: 'fr-FR',
    name: 'Français',
    rtl: false,
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 9 },
    dateFormat: { year: 'numeric', month: 'short', day: 'numeric' },
    currency: 'EUR',
    decimalSeparator: ',',
    timezone: 'Europe/Paris'
  },
  {
    locale: 'de-DE',
    name: 'Deutsch',
    rtl: false,
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 9 },
    dateFormat: { year: 'numeric', month: 'short', day: 'numeric' },
    currency: 'EUR',
    decimalSeparator: ',',
    timezone: 'Europe/Berlin'
  },
  {
    locale: 'ru-RU',
    name: 'Русский',
    rtl: false,
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 9 },
    dateFormat: { year: 'numeric', month: 'short', day: 'numeric' },
    currency: 'RUB',
    decimalSeparator: ',',
    timezone: 'Europe/Moscow'
  },
  {
    locale: 'ar-SA',
    name: 'العربية',
    rtl: true,
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 9 },
    dateFormat: { year: 'numeric', month: 'short', day: 'numeric' },
    currency: 'SAR',
    decimalSeparator: '.',
    timezone: 'Asia/Riyadh'
  },
  {
    locale: 'hi-IN',
    name: 'हिन्दी',
    rtl: false,
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 9 },
    dateFormat: { year: 'numeric', month: 'short', day: 'numeric' },
    currency: 'INR',
    decimalSeparator: '.',
    timezone: 'Asia/Kolkata'
  }
];

// Global i18n instance
let globalI18n: GhostSpeakI18n | null = null;

/**
 * Initialize the global i18n instance
 */
export function initI18n(options?: Partial<I18nOptions>): GhostSpeakI18n {
  const defaultOptions: I18nOptions = {
    defaultLocale: 'en-US',
    locales: SUPPORTED_LOCALES,
    resources: {},
    fallbackLocale: 'en-US',
    interpolation: true,
    pluralization: true,
    ...options
  };

  globalI18n = new GhostSpeakI18n(defaultOptions);
  return globalI18n;
}

/**
 * Get the global i18n instance
 */
export function getI18n(): GhostSpeakI18n {
  if (!globalI18n) {
    throw new Error('I18n not initialized. Call initI18n() first.');
  }
  return globalI18n;
}

/**
 * Convenience function for translation
 */
export function t(key: string, values?: Record<string, any>): string {
  return getI18n().t(key, values);
}

/**
 * Convenience function for pluralization
 */
export function plural(key: string, count: number, values?: Record<string, any>): string {
  return getI18n().plural(key, count, values);
}

export { GhostSpeakI18n };