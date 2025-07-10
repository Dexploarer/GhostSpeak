/**
 * CLI Internationalization Support for GhostSpeak Protocol
 * Comprehensive i18n implementation with 10 language support
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supported locales
export const SUPPORTED_LOCALES = [
  'en-US', // English (United States)
  'es-ES', // Spanish (Spain)
  'zh-CN', // Chinese (Simplified)
  'ja-JP', // Japanese
  'ko-KR', // Korean
  'fr-FR', // French
  'de-DE', // German
  'pt-BR', // Portuguese (Brazil)
  'ru-RU', // Russian
  'ar-SA'  // Arabic (Saudi Arabia)
] as const;

export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

// Translation messages type
interface TranslationMessages {
  cli: {
    welcome: string;
    options: {
      verbose: string;
      quiet: string;
      noColor: string;
      config: string;
      locale: string;
      network: string;
      help: string;
    };
    commands: {
      config: {
        description: string;
        show: string;
        reset: string;
      };
      locale: {
        description: string;
        list: string;
        set: string;
      };
    };
    errors: {
      configError: string;
      localeError: string;
    };
  };
  common: {
    version: string;
    success: string;
    error: string;
    warning: string;
    info: string;
    loading: string;
  };
}

// Translation storage
let translations: Record<SupportedLocale, TranslationMessages> = {} as any;
let currentLocale: SupportedLocale = 'en-US';
let isInitialized = false;

// Default English translations
const defaultTranslations: TranslationMessages = {
  cli: {
    welcome: 'GhostSpeak CLI - Autonomous Agent Commerce Protocol',
    options: {
      verbose: 'Enable verbose output',
      quiet: 'Suppress non-essential output',
      noColor: 'Disable colored output',
      config: 'Path to configuration file',
      locale: 'Set display language',
      network: 'Target network (mainnet, devnet, testnet)',
      help: 'Display help information'
    },
    commands: {
      config: {
        description: 'Manage CLI configuration',
        show: 'Show current configuration',
        reset: 'Reset configuration to defaults'
      },
      locale: {
        description: 'Manage display language settings',
        list: 'List available languages',
        set: 'Set display language'
      }
    },
    errors: {
      configError: 'Configuration error',
      localeError: 'Locale error'
    }
  },
  common: {
    version: 'Display version information',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Information',
    loading: 'Loading'
  }
};

// Load all translations
function loadTranslations(): void {
  // For now, we'll use the default translations for all locales
  // In a real implementation, these would be loaded from separate files
  SUPPORTED_LOCALES.forEach(locale => {
    translations[locale] = createTranslationsForLocale(locale);
  });
}

// Create locale-specific translations
function createTranslationsForLocale(locale: SupportedLocale): TranslationMessages {
  switch (locale) {
    case 'es-ES':
      return {
        cli: {
          welcome: 'GhostSpeak CLI - Protocolo de Comercio de Agentes Autónomos',
          options: {
            verbose: 'Habilitar salida detallada',
            quiet: 'Suprimir salida no esencial',
            noColor: 'Deshabilitar salida coloreada',
            config: 'Ruta al archivo de configuración',
            locale: 'Establecer idioma de visualización',
            network: 'Red objetivo (mainnet, devnet, testnet)',
            help: 'Mostrar información de ayuda'
          },
          commands: {
            config: {
              description: 'Gestionar configuración del CLI',
              show: 'Mostrar configuración actual',
              reset: 'Restablecer configuración a valores predeterminados'
            },
            locale: {
              description: 'Gestionar configuración de idioma',
              list: 'Listar idiomas disponibles',
              set: 'Establecer idioma de visualización'
            }
          },
          errors: {
            configError: 'Error de configuración',
            localeError: 'Error de localización'
          }
        },
        common: {
          version: 'Mostrar información de versión',
          success: 'Éxito',
          error: 'Error',
          warning: 'Advertencia',
          info: 'Información',
          loading: 'Cargando'
        }
      };
    
    case 'zh-CN':
      return {
        cli: {
          welcome: 'GhostSpeak CLI - 自主代理商务协议',
          options: {
            verbose: '启用详细输出',
            quiet: '抑制非必要输出',
            noColor: '禁用彩色输出',
            config: '配置文件路径',
            locale: '设置显示语言',
            network: '目标网络 (mainnet, devnet, testnet)',
            help: '显示帮助信息'
          },
          commands: {
            config: {
              description: '管理CLI配置',
              show: '显示当前配置',
              reset: '重置配置为默认值'
            },
            locale: {
              description: '管理显示语言设置',
              list: '列出可用语言',
              set: '设置显示语言'
            }
          },
          errors: {
            configError: '配置错误',
            localeError: '语言设置错误'
          }
        },
        common: {
          version: '显示版本信息',
          success: '成功',
          error: '错误',
          warning: '警告',
          info: '信息',
          loading: '加载中'
        }
      };
    
    case 'ja-JP':
      return {
        cli: {
          welcome: 'GhostSpeak CLI - 自律エージェント商取引プロトコル',
          options: {
            verbose: '詳細出力を有効にする',
            quiet: '非必須出力を抑制',
            noColor: 'カラー出力を無効化',
            config: '設定ファイルのパス',
            locale: '表示言語を設定',
            network: 'ターゲットネットワーク (mainnet, devnet, testnet)',
            help: 'ヘルプ情報を表示'
          },
          commands: {
            config: {
              description: 'CLI設定を管理',
              show: '現在の設定を表示',
              reset: '設定をデフォルトにリセット'
            },
            locale: {
              description: '表示言語設定を管理',
              list: '利用可能な言語をリスト',
              set: '表示言語を設定'
            }
          },
          errors: {
            configError: '設定エラー',
            localeError: 'ロケールエラー'
          }
        },
        common: {
          version: 'バージョン情報を表示',
          success: '成功',
          error: 'エラー',
          warning: '警告',
          info: '情報',
          loading: '読み込み中'
        }
      };
    
    case 'ko-KR':
      return {
        cli: {
          welcome: 'GhostSpeak CLI - 자율 에이전트 상거래 프로토콜',
          options: {
            verbose: '자세한 출력 활성화',
            quiet: '필수가 아닌 출력 억제',
            noColor: '색상 출력 비활성화',
            config: '구성 파일 경로',
            locale: '표시 언어 설정',
            network: '대상 네트워크 (mainnet, devnet, testnet)',
            help: '도움말 정보 표시'
          },
          commands: {
            config: {
              description: 'CLI 구성 관리',
              show: '현재 구성 표시',
              reset: '구성을 기본값으로 재설정'
            },
            locale: {
              description: '표시 언어 설정 관리',
              list: '사용 가능한 언어 목록',
              set: '표시 언어 설정'
            }
          },
          errors: {
            configError: '구성 오류',
            localeError: '로케일 오류'
          }
        },
        common: {
          version: '버전 정보 표시',
          success: '성공',
          error: '오류',
          warning: '경고',
          info: '정보',
          loading: '로딩 중'
        }
      };
    
    case 'fr-FR':
      return {
        cli: {
          welcome: 'GhostSpeak CLI - Protocole de Commerce d\'Agents Autonomes',
          options: {
            verbose: 'Activer la sortie détaillée',
            quiet: 'Supprimer la sortie non essentielle',
            noColor: 'Désactiver la sortie colorée',
            config: 'Chemin vers le fichier de configuration',
            locale: 'Définir la langue d\'affichage',
            network: 'Réseau cible (mainnet, devnet, testnet)',
            help: 'Afficher les informations d\'aide'
          },
          commands: {
            config: {
              description: 'Gérer la configuration CLI',
              show: 'Afficher la configuration actuelle',
              reset: 'Réinitialiser la configuration aux valeurs par défaut'
            },
            locale: {
              description: 'Gérer les paramètres de langue d\'affichage',
              list: 'Lister les langues disponibles',
              set: 'Définir la langue d\'affichage'
            }
          },
          errors: {
            configError: 'Erreur de configuration',
            localeError: 'Erreur de localisation'
          }
        },
        common: {
          version: 'Afficher les informations de version',
          success: 'Succès',
          error: 'Erreur',
          warning: 'Avertissement',
          info: 'Information',
          loading: 'Chargement'
        }
      };
    
    case 'de-DE':
      return {
        cli: {
          welcome: 'GhostSpeak CLI - Autonomes Agenten-Handelsprotokoll',
          options: {
            verbose: 'Ausführliche Ausgabe aktivieren',
            quiet: 'Nicht-wesentliche Ausgabe unterdrücken',
            noColor: 'Farbige Ausgabe deaktivieren',
            config: 'Pfad zur Konfigurationsdatei',
            locale: 'Anzeigesprache festlegen',
            network: 'Zielnetzwerk (mainnet, devnet, testnet)',
            help: 'Hilfeinformationen anzeigen'
          },
          commands: {
            config: {
              description: 'CLI-Konfiguration verwalten',
              show: 'Aktuelle Konfiguration anzeigen',
              reset: 'Konfiguration auf Standardwerte zurücksetzen'
            },
            locale: {
              description: 'Spracheinstellungen verwalten',
              list: 'Verfügbare Sprachen auflisten',
              set: 'Anzeigesprache festlegen'
            }
          },
          errors: {
            configError: 'Konfigurationsfehler',
            localeError: 'Lokalisierungsfehler'
          }
        },
        common: {
          version: 'Versionsinformationen anzeigen',
          success: 'Erfolg',
          error: 'Fehler',
          warning: 'Warnung',
          info: 'Information',
          loading: 'Wird geladen'
        }
      };
    
    case 'pt-BR':
      return {
        cli: {
          welcome: 'GhostSpeak CLI - Protocolo de Comércio de Agentes Autônomos',
          options: {
            verbose: 'Ativar saída detalhada',
            quiet: 'Suprimir saída não essencial',
            noColor: 'Desativar saída colorida',
            config: 'Caminho para o arquivo de configuração',
            locale: 'Definir idioma de exibição',
            network: 'Rede alvo (mainnet, devnet, testnet)',
            help: 'Exibir informações de ajuda'
          },
          commands: {
            config: {
              description: 'Gerenciar configuração do CLI',
              show: 'Mostrar configuração atual',
              reset: 'Redefinir configuração para padrões'
            },
            locale: {
              description: 'Gerenciar configurações de idioma',
              list: 'Listar idiomas disponíveis',
              set: 'Definir idioma de exibição'
            }
          },
          errors: {
            configError: 'Erro de configuração',
            localeError: 'Erro de localização'
          }
        },
        common: {
          version: 'Exibir informações de versão',
          success: 'Sucesso',
          error: 'Erro',
          warning: 'Aviso',
          info: 'Informação',
          loading: 'Carregando'
        }
      };
    
    case 'ru-RU':
      return {
        cli: {
          welcome: 'GhostSpeak CLI - Протокол торговли автономных агентов',
          options: {
            verbose: 'Включить подробный вывод',
            quiet: 'Подавить несущественный вывод',
            noColor: 'Отключить цветной вывод',
            config: 'Путь к файлу конфигурации',
            locale: 'Установить язык отображения',
            network: 'Целевая сеть (mainnet, devnet, testnet)',
            help: 'Показать справочную информацию'
          },
          commands: {
            config: {
              description: 'Управление конфигурацией CLI',
              show: 'Показать текущую конфигурацию',
              reset: 'Сбросить конфигурацию до значений по умолчанию'
            },
            locale: {
              description: 'Управление настройками языка',
              list: 'Список доступных языков',
              set: 'Установить язык отображения'
            }
          },
          errors: {
            configError: 'Ошибка конфигурации',
            localeError: 'Ошибка локализации'
          }
        },
        common: {
          version: 'Показать информацию о версии',
          success: 'Успех',
          error: 'Ошибка',
          warning: 'Предупреждение',
          info: 'Информация',
          loading: 'Загрузка'
        }
      };
    
    case 'ar-SA':
      return {
        cli: {
          welcome: 'GhostSpeak CLI - بروتوكول تجارة الوكلاء المستقلين',
          options: {
            verbose: 'تمكين الإخراج المفصل',
            quiet: 'قمع الإخراج غير الضروري',
            noColor: 'تعطيل الإخراج الملون',
            config: 'المسار إلى ملف التكوين',
            locale: 'تعيين لغة العرض',
            network: 'الشبكة المستهدفة (mainnet, devnet, testnet)',
            help: 'عرض معلومات المساعدة'
          },
          commands: {
            config: {
              description: 'إدارة تكوين CLI',
              show: 'إظهار التكوين الحالي',
              reset: 'إعادة تعيين التكوين إلى الإعدادات الافتراضية'
            },
            locale: {
              description: 'إدارة إعدادات اللغة',
              list: 'قائمة اللغات المتاحة',
              set: 'تعيين لغة العرض'
            }
          },
          errors: {
            configError: 'خطأ في التكوين',
            localeError: 'خطأ في الإعدادات المحلية'
          }
        },
        common: {
          version: 'عرض معلومات الإصدار',
          success: 'نجاح',
          error: 'خطأ',
          warning: 'تحذير',
          info: 'معلومات',
          loading: 'جار التحميل'
        }
      };
    
    default:
      return defaultTranslations;
  }
}

// Detect system locale
export function detectSystemLocale(): SupportedLocale {
  const systemLocale = process.env.LANG?.split('.')[0]?.replace('_', '-') || 
                       process.env.LC_ALL?.split('.')[0]?.replace('_', '-') || 
                       'en-US';
  
  // Check if system locale is supported
  if (SUPPORTED_LOCALES.includes(systemLocale as SupportedLocale)) {
    return systemLocale as SupportedLocale;
  }
  
  // Try to match language part only
  const langCode = systemLocale.split('-')[0];
  const match = SUPPORTED_LOCALES.find(locale => locale.startsWith(langCode));
  
  return match || 'en-US';
}

// Initialize i18n
export function initCliI18n(): void {
  if (isInitialized) return;
  
  loadTranslations();
  isInitialized = true;
}

// Set current locale
export function setCliLocale(locale?: SupportedLocale): void {
  if (!isInitialized) {
    initCliI18n();
  }
  
  if (locale && SUPPORTED_LOCALES.includes(locale)) {
    currentLocale = locale;
  } else {
    currentLocale = detectSystemLocale();
  }
}

// Get current locale
export function getCliLocale(): SupportedLocale {
  return currentLocale;
}

// Translation function
export function cliT(key: string): string {
  if (!isInitialized) {
    initCliI18n();
  }
  
  const keys = key.split('.');
  let value: any = translations[currentLocale];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to English
      value = defaultTranslations;
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          return key; // Return key if translation not found
        }
      }
      break;
    }
  }
  
  return typeof value === 'string' ? value : key;
}

// Handle locale command
export function handleLocaleCommand(options: any): void {
  if (options.list) {
    console.log('\nAvailable locales:');
    SUPPORTED_LOCALES.forEach(locale => {
      const isActive = locale === currentLocale;
      const name = getLocaleName(locale);
      console.log(`  ${isActive ? '→' : ' '} ${locale} - ${name}`);
    });
  } else if (options.set) {
    const newLocale = options.set as SupportedLocale;
    if (SUPPORTED_LOCALES.includes(newLocale)) {
      setCliLocale(newLocale);
      console.log(`✅ Locale set to: ${newLocale}`);
    } else {
      console.error(`❌ Invalid locale: ${newLocale}`);
      console.log('\nAvailable locales:');
      SUPPORTED_LOCALES.forEach(locale => {
        console.log(`  - ${locale}`);
      });
    }
  } else {
    console.log(`Current locale: ${currentLocale}`);
  }
}

// Get locale display name
function getLocaleName(locale: SupportedLocale): string {
  const names: Record<SupportedLocale, string> = {
    'en-US': 'English (United States)',
    'es-ES': 'Español (España)',
    'zh-CN': '简体中文 (中国)',
    'ja-JP': '日本語 (日本)',
    'ko-KR': '한국어 (대한민국)',
    'fr-FR': 'Français (France)',
    'de-DE': 'Deutsch (Deutschland)',
    'pt-BR': 'Português (Brasil)',
    'ru-RU': 'Русский (Россия)',
    'ar-SA': 'العربية (المملكة العربية السعودية)'
  };
  
  return names[locale] || locale;
}

// Simple message formatting functions (kept for compatibility)
export function success(message: string): string {
  return `✅ ${message}`;
}

export function error(message: string): string {
  return `❌ ${message}`;
}

export function warning(message: string): string {
  return `⚠️  ${message}`;
}

export function info(message: string): string {
  return `ℹ️  ${message}`;
}

export function loading(message: string): string {
  return `⏳ ${message}`;
}

// Export all for convenience
export default {
  initCliI18n,
  setCliLocale,
  getCliLocale,
  cliT,
  handleLocaleCommand,
  detectSystemLocale,
  SUPPORTED_LOCALES,
  success,
  error,
  warning,
  info,
  loading
};