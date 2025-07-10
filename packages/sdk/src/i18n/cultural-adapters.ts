/**
 * Cultural Adaptation Features for Global Developer Communities
 * 
 * Provides cultural context and adaptations for different regions,
 * including number formats, date formats, naming conventions, and
 * communication styles.
 */

export interface CulturalContext {
  /** Region code (e.g., 'US', 'CN', 'JP', 'DE') */
  region: string;
  /** Communication style preferences */
  communication: CommunicationStyle;
  /** Business etiquette and conventions */
  business: BusinessConventions;
  /** Technical preferences */
  technical: TechnicalPreferences;
  /** UI/UX adaptations */
  ui: UIAdaptations;
}

export interface CommunicationStyle {
  /** Directness level (1-10, 1=very indirect, 10=very direct) */
  directnessLevel: number;
  /** Formality preference */
  formalityLevel: 'casual' | 'professional' | 'formal' | 'very-formal';
  /** Emoji usage preference */
  emojiUsage: 'minimal' | 'moderate' | 'frequent';
  /** Honorifics usage */
  useHonorifics: boolean;
  /** Preferred greeting style */
  greetingStyle: 'informal' | 'formal' | 'traditional';
}

export interface BusinessConventions {
  /** Working hours (24-hour format) */
  workingHours: { start: number; end: number };
  /** Weekend days */
  weekendDays: number[]; // 0=Sunday, 6=Saturday
  /** Holiday calendar preference */
  holidayCalendar: string;
  /** Meeting scheduling preferences */
  meetingPreferences: {
    preferredDuration: number; // minutes
    bufferTime: number; // minutes between meetings
    punctualityImportance: 'low' | 'medium' | 'high' | 'critical';
  };
  /** Documentation style */
  documentationStyle: 'concise' | 'detailed' | 'comprehensive';
}

export interface TechnicalPreferences {
  /** Preferred documentation format */
  docFormat: 'markdown' | 'wiki' | 'pdf' | 'interactive';
  /** Code commenting style */
  commentingStyle: 'minimal' | 'moderate' | 'verbose';
  /** Error message preference */
  errorVerbosity: 'brief' | 'detailed' | 'exhaustive';
  /** API response format preference */
  apiResponseFormat: 'minimal' | 'standard' | 'verbose';
  /** Logging preference */
  loggingStyle: 'terse' | 'standard' | 'detailed';
}

export interface UIAdaptations {
  /** Text direction */
  textDirection: 'ltr' | 'rtl';
  /** Color associations */
  colorPreferences: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  /** Icon preferences */
  iconStyle: 'minimal' | 'standard' | 'decorative';
  /** Layout density */
  layoutDensity: 'compact' | 'comfortable' | 'spacious';
}

// Cultural context definitions
const CULTURAL_CONTEXTS: Record<string, CulturalContext> = {
  'en-US': {
    region: 'US',
    communication: {
      directnessLevel: 7,
      formalityLevel: 'professional',
      emojiUsage: 'moderate',
      useHonorifics: false,
      greetingStyle: 'informal'
    },
    business: {
      workingHours: { start: 9, end: 17 },
      weekendDays: [0, 6],
      holidayCalendar: 'us',
      meetingPreferences: {
        preferredDuration: 30,
        bufferTime: 15,
        punctualityImportance: 'high'
      },
      documentationStyle: 'detailed'
    },
    technical: {
      docFormat: 'markdown',
      commentingStyle: 'moderate',
      errorVerbosity: 'detailed',
      apiResponseFormat: 'standard',
      loggingStyle: 'standard'
    },
    ui: {
      textDirection: 'ltr',
      colorPreferences: {
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6'
      },
      iconStyle: 'standard',
      layoutDensity: 'comfortable'
    }
  },

  'zh-CN': {
    region: 'CN',
    communication: {
      directnessLevel: 4,
      formalityLevel: 'formal',
      emojiUsage: 'frequent',
      useHonorifics: true,
      greetingStyle: 'formal'
    },
    business: {
      workingHours: { start: 9, end: 18 },
      weekendDays: [0, 6],
      holidayCalendar: 'chinese',
      meetingPreferences: {
        preferredDuration: 45,
        bufferTime: 15,
        punctualityImportance: 'critical'
      },
      documentationStyle: 'comprehensive'
    },
    technical: {
      docFormat: 'interactive',
      commentingStyle: 'verbose',
      errorVerbosity: 'exhaustive',
      apiResponseFormat: 'verbose',
      loggingStyle: 'detailed'
    },
    ui: {
      textDirection: 'ltr',
      colorPreferences: {
        success: '#52C41A',
        warning: '#FAAD14',
        error: '#FF4D4F',
        info: '#1890FF'
      },
      iconStyle: 'decorative',
      layoutDensity: 'compact'
    }
  },

  'ja-JP': {
    region: 'JP',
    communication: {
      directnessLevel: 3,
      formalityLevel: 'very-formal',
      emojiUsage: 'moderate',
      useHonorifics: true,
      greetingStyle: 'traditional'
    },
    business: {
      workingHours: { start: 9, end: 18 },
      weekendDays: [0, 6],
      holidayCalendar: 'japanese',
      meetingPreferences: {
        preferredDuration: 60,
        bufferTime: 30,
        punctualityImportance: 'critical'
      },
      documentationStyle: 'comprehensive'
    },
    technical: {
      docFormat: 'wiki',
      commentingStyle: 'verbose',
      errorVerbosity: 'detailed',
      apiResponseFormat: 'standard',
      loggingStyle: 'detailed'
    },
    ui: {
      textDirection: 'ltr',
      colorPreferences: {
        success: '#389E0D',
        warning: '#D48806',
        error: '#CF1322',
        info: '#096DD9'
      },
      iconStyle: 'minimal',
      layoutDensity: 'comfortable'
    }
  },

  'de-DE': {
    region: 'DE',
    communication: {
      directnessLevel: 8,
      formalityLevel: 'formal',
      emojiUsage: 'minimal',
      useHonorifics: true,
      greetingStyle: 'formal'
    },
    business: {
      workingHours: { start: 8, end: 17 },
      weekendDays: [0, 6],
      holidayCalendar: 'german',
      meetingPreferences: {
        preferredDuration: 45,
        bufferTime: 15,
        punctualityImportance: 'critical'
      },
      documentationStyle: 'comprehensive'
    },
    technical: {
      docFormat: 'pdf',
      commentingStyle: 'verbose',
      errorVerbosity: 'exhaustive',
      apiResponseFormat: 'verbose',
      loggingStyle: 'detailed'
    },
    ui: {
      textDirection: 'ltr',
      colorPreferences: {
        success: '#52C41A',
        warning: '#FAAD14',
        error: '#FF4D4F',
        info: '#1890FF'
      },
      iconStyle: 'minimal',
      layoutDensity: 'spacious'
    }
  },

  'ar-SA': {
    region: 'SA',
    communication: {
      directnessLevel: 5,
      formalityLevel: 'formal',
      emojiUsage: 'moderate',
      useHonorifics: true,
      greetingStyle: 'traditional'
    },
    business: {
      workingHours: { start: 8, end: 16 },
      weekendDays: [5, 6], // Friday-Saturday weekend
      holidayCalendar: 'islamic',
      meetingPreferences: {
        preferredDuration: 60,
        bufferTime: 30,
        punctualityImportance: 'medium'
      },
      documentationStyle: 'detailed'
    },
    technical: {
      docFormat: 'markdown',
      commentingStyle: 'moderate',
      errorVerbosity: 'detailed',
      apiResponseFormat: 'standard',
      loggingStyle: 'standard'
    },
    ui: {
      textDirection: 'rtl',
      colorPreferences: {
        success: '#52C41A',
        warning: '#FAAD14',
        error: '#FF4D4F',
        info: '#1890FF'
      },
      iconStyle: 'standard',
      layoutDensity: 'comfortable'
    }
  }
};

class CulturalAdapter {
  private currentContext: CulturalContext;

  constructor(locale: string) {
    this.currentContext = this.getContextForLocale(locale);
  }

  /**
   * Get cultural context for a locale
   */
  getContextForLocale(locale: string): CulturalContext {
    return CULTURAL_CONTEXTS[locale] || CULTURAL_CONTEXTS['en-US'];
  }

  /**
   * Set cultural context
   */
  setContext(locale: string): void {
    this.currentContext = this.getContextForLocale(locale);
  }

  /**
   * Get current cultural context
   */
  getContext(): CulturalContext {
    return this.currentContext;
  }

  /**
   * Adapt message tone based on cultural context
   */
  adaptMessageTone(message: string, type: 'info' | 'warning' | 'error' | 'success'): string {
    const { communication } = this.currentContext;
    
    let adaptedMessage = message;

    // Add formality markers
    if (communication.formalityLevel === 'very-formal') {
      adaptedMessage = this.addFormalityMarkers(adaptedMessage);
    }

    // Add honorifics if needed
    if (communication.useHonorifics) {
      adaptedMessage = this.addHonorifics(adaptedMessage);
    }

    // Adjust directness
    if (communication.directnessLevel < 5) {
      adaptedMessage = this.softenMessage(adaptedMessage, type);
    }

    return adaptedMessage;
  }

  /**
   * Get culturally appropriate colors
   */
  getColors(): UIAdaptations['colorPreferences'] {
    return this.currentContext.ui.colorPreferences;
  }

  /**
   * Get text direction
   */
  getTextDirection(): 'ltr' | 'rtl' {
    return this.currentContext.ui.textDirection;
  }

  /**
   * Get working hours for the culture
   */
  getWorkingHours(): { start: number; end: number } {
    return this.currentContext.business.workingHours;
  }

  /**
   * Check if current time is within working hours
   */
  isWorkingHours(date: Date = new Date()): boolean {
    const hours = date.getHours();
    const { start, end } = this.getWorkingHours();
    return hours >= start && hours < end;
  }

  /**
   * Get weekend days
   */
  getWeekendDays(): number[] {
    return this.currentContext.business.weekendDays;
  }

  /**
   * Check if date is a weekend
   */
  isWeekend(date: Date = new Date()): boolean {
    return this.getWeekendDays().includes(date.getDay());
  }

  /**
   * Format developer notification based on cultural preferences
   */
  formatDeveloperNotification(
    title: string, 
    message: string, 
    type: 'info' | 'warning' | 'error' | 'success'
  ): { title: string; message: string; urgency: 'low' | 'medium' | 'high' } {
    const adaptedTitle = this.adaptMessageTone(title, type);
    const adaptedMessage = this.adaptMessageTone(message, type);
    
    // Determine urgency based on cultural context
    let urgency: 'low' | 'medium' | 'high' = 'medium';
    
    if (type === 'error') {
      urgency = 'high';
    } else if (type === 'warning') {
      urgency = this.currentContext.business.meetingPreferences.punctualityImportance === 'critical' ? 'high' : 'medium';
    } else if (type === 'success') {
      urgency = 'low';
    }

    return {
      title: adaptedTitle,
      message: adaptedMessage,
      urgency
    };
  }

  private addFormalityMarkers(message: string): string {
    // Add formal prefixes/suffixes based on culture
    if (this.currentContext.region === 'JP') {
      return `${message}です。`;
    }
    return message;
  }

  private addHonorifics(message: string): string {
    // Add appropriate honorifics
    if (this.currentContext.region === 'JP') {
      return message.replace(/\byou\b/gi, 'you (様)');
    }
    return message;
  }

  private softenMessage(message: string, type: string): string {
    if (type === 'error') {
      // Soften error messages for indirect cultures
      return message.replace(/failed/gi, 'encountered an issue')
                   .replace(/error/gi, 'unexpected situation')
                   .replace(/invalid/gi, 'needs attention');
    }
    return message;
  }
}

// Global cultural adapter instance
let globalCulturalAdapter: CulturalAdapter | null = null;

/**
 * Initialize cultural adapter
 */
export function initCulturalAdapter(locale: string): CulturalAdapter {
  globalCulturalAdapter = new CulturalAdapter(locale);
  return globalCulturalAdapter;
}

/**
 * Get global cultural adapter
 */
export function getCulturalAdapter(): CulturalAdapter {
  if (!globalCulturalAdapter) {
    throw new Error('Cultural adapter not initialized. Call initCulturalAdapter() first.');
  }
  return globalCulturalAdapter;
}

/**
 * Set cultural context for global adapter
 */
export function setCulturalContext(locale: string): void {
  if (globalCulturalAdapter) {
    globalCulturalAdapter.setContext(locale);
  }
}

export { CulturalAdapter };