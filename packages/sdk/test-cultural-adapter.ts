import { initCulturalAdapter, getCulturalAdapter } from './src/i18n/cultural-adapters.ts';

async function testCulturalAdapter() {
  console.log('🌍 Testing Cultural Adaptation Features...\n');

  // Test US culture
  console.log('🇺🇸 US Cultural Context:');
  const usAdapter = initCulturalAdapter('en-US');
  const usContext = usAdapter.getContext();
  console.log('- Directness Level:', usContext.communication.directnessLevel);
  console.log('- Formality Level:', usContext.communication.formalityLevel);
  console.log('- Working Hours:', `${usContext.business.workingHours.start}:00 - ${usContext.business.workingHours.end}:00`);
  console.log('- Weekend Days:', usContext.business.weekendDays);
  console.log('- Colors - Success:', usContext.ui.colorPreferences.success);
  console.log('- Text Direction:', usContext.ui.textDirection);
  console.log('- Is Working Hours:', usAdapter.isWorkingHours());
  console.log('- Is Weekend:', usAdapter.isWeekend());

  // Test message adaptation
  const usMessage = usAdapter.adaptMessageTone('Transaction failed', 'error');
  console.log('- Adapted Error Message:', usMessage);

  // Test Chinese culture
  console.log('\n🇨🇳 Chinese Cultural Context:');
  usAdapter.setContext('zh-CN');
  const cnContext = usAdapter.getContext();
  console.log('- Directness Level:', cnContext.communication.directnessLevel);
  console.log('- Formality Level:', cnContext.communication.formalityLevel);
  console.log('- Working Hours:', `${cnContext.business.workingHours.start}:00 - ${cnContext.business.workingHours.end}:00`);
  console.log('- Weekend Days:', cnContext.business.weekendDays);
  console.log('- Colors - Success:', cnContext.ui.colorPreferences.success);
  console.log('- Text Direction:', cnContext.ui.textDirection);
  console.log('- Layout Density:', cnContext.ui.layoutDensity);
  console.log('- Use Honorifics:', cnContext.communication.useHonorifics);

  // Test message adaptation for Chinese context
  const cnMessage = usAdapter.adaptMessageTone('Transaction failed', 'error');
  console.log('- Adapted Error Message:', cnMessage);

  // Test Japanese culture
  console.log('\n🇯🇵 Japanese Cultural Context:');
  usAdapter.setContext('ja-JP');
  const jpContext = usAdapter.getContext();
  console.log('- Directness Level:', jpContext.communication.directnessLevel);
  console.log('- Formality Level:', jpContext.communication.formalityLevel);
  console.log('- Use Honorifics:', jpContext.communication.useHonorifics);
  console.log('- Greeting Style:', jpContext.communication.greetingStyle);
  console.log('- Meeting Duration:', jpContext.business.meetingPreferences.preferredDuration + ' minutes');
  console.log('- Punctuality Importance:', jpContext.business.meetingPreferences.punctualityImportance);

  // Test message adaptation for Japanese context
  const jpMessage = usAdapter.adaptMessageTone('Transaction completed successfully', 'success');
  console.log('- Adapted Success Message:', jpMessage);

  // Test Arabic culture (RTL)
  console.log('\n🇸🇦 Arabic Cultural Context:');
  usAdapter.setContext('ar-SA');
  const arContext = usAdapter.getContext();
  console.log('- Text Direction:', arContext.ui.textDirection);
  console.log('- Weekend Days:', arContext.business.weekendDays);
  console.log('- Working Hours:', `${arContext.business.workingHours.start}:00 - ${arContext.business.workingHours.end}:00`);
  console.log('- Holiday Calendar:', arContext.business.holidayCalendar);

  // Test German culture
  console.log('\n🇩🇪 German Cultural Context:');
  usAdapter.setContext('de-DE');
  const deContext = usAdapter.getContext();
  console.log('- Directness Level:', deContext.communication.directnessLevel);
  console.log('- Formality Level:', deContext.communication.formalityLevel);
  console.log('- Documentation Style:', deContext.business.documentationStyle);
  console.log('- Error Verbosity:', deContext.technical.errorVerbosity);
  console.log('- Punctuality Importance:', deContext.business.meetingPreferences.punctualityImportance);

  // Test developer notification formatting
  console.log('\n📱 Developer Notification Formatting:');
  const notification = usAdapter.formatDeveloperNotification(
    'Build Failed',
    'The build process encountered an error in the TypeScript compilation step.',
    'error'
  );
  console.log('- Title:', notification.title);
  console.log('- Message:', notification.message);
  console.log('- Urgency:', notification.urgency);

  console.log('\n✅ Cultural adaptation test completed!');
}

testCulturalAdapter().catch(console.error);