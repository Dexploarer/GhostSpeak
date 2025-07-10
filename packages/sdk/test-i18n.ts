import { initI18n } from './src/i18n/index.ts';
import { enTranslations } from './src/i18n/translations/en.ts';
import { zhTranslations } from './src/i18n/translations/zh.ts';

async function testI18n() {
  console.log('🌐 Testing GhostSpeak i18n functionality...\n');

  const i18n = initI18n({
    defaultLocale: 'en-US',
    resources: {
      'en-US': enTranslations,
      'zh-CN': zhTranslations
    }
  });

  // Test English translations
  console.log('📝 English translations:');
  console.log('- Agent:', i18n.t('common.agent'));
  console.log('- Messages:', i18n.t('common.messages'));
  console.log('- CLI Welcome:', i18n.t('cli.welcome'));
  console.log('- Number format:', i18n.formatNumber(1234567.89));
  console.log('- Date format:', i18n.formatDate(new Date()));

  // Test Chinese translations
  console.log('\n🇨🇳 Chinese translations:');
  i18n.setLocale('zh-CN');
  console.log('- Agent:', i18n.t('common.agent'));
  console.log('- Messages:', i18n.t('common.messages'));
  console.log('- CLI Welcome:', i18n.t('cli.welcome'));
  console.log('- Number format:', i18n.formatNumber(1234567.89));
  console.log('- Date format:', i18n.formatDate(new Date()));

  // Test interpolation
  console.log('\n🔄 Interpolation tests:');
  i18n.setLocale('en-US');
  console.log('- English with values:', i18n.t('cli.version', { version: '1.0.0' }));
  i18n.setLocale('zh-CN');
  console.log('- Chinese with values:', i18n.t('cli.version', { version: '1.0.0' }));

  // Test pluralization
  console.log('\n🔢 Pluralization tests:');
  i18n.setLocale('en-US');
  console.log('- 1 minute ago:', i18n.plural('time.minutesAgo', 1));
  console.log('- 5 minutes ago:', i18n.plural('time.minutesAgo', 5));
  i18n.setLocale('zh-CN');
  console.log('- 1 minute ago (Chinese):', i18n.plural('time.minutesAgo', 1));
  console.log('- 5 minutes ago (Chinese):', i18n.plural('time.minutesAgo', 5));

  // Test currency formatting
  console.log('\n💰 Currency formatting tests:');
  i18n.setLocale('en-US');
  console.log('- USD:', i18n.formatCurrency(123.45, 'USD'));
  i18n.setLocale('zh-CN');
  console.log('- CNY:', i18n.formatCurrency(123.45, 'CNY'));

  console.log('\n✅ i18n functionality test completed!');
}

testI18n().catch(console.error);