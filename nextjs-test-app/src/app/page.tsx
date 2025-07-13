'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [integrationTest, setIntegrationTest] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testGhostSpeakIntegration = async () => {
      try {
        // Test importing the built Next.js integration package
        const nextjsPackage = await import('../../../packages/integrations/nextjs/dist/index.js');
        
        setIntegrationTest({
          success: true,
          exports: Object.keys(nextjsPackage),
          hasApp: !!nextjsPackage.GhostSpeakApp,
          hasApi: !!nextjsPackage.createGhostSpeakHandler,
          hasPlugin: !!nextjsPackage.withGhostSpeak,
        });
      } catch (err) {
        console.error('Failed to import Next.js package:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    testGhostSpeakIntegration();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">GhostSpeak Next.js Integration Test</h1>
        
        <div className="bg-gray-100 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Package Import Test</h2>
          
          {error ? (
            <div className="text-red-600">
              <strong>Error:</strong> {error}
            </div>
          ) : integrationTest ? (
            <div className="text-green-600">
              <h3 className="text-xl font-semibold mb-2">✅ Integration Successful</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Package Available: {integrationTest.success ? '✅' : '❌'}</li>
                <li>Has App Component: {integrationTest.hasApp ? '✅' : '❌'}</li>
                <li>Has API Handlers: {integrationTest.hasApi ? '✅' : '❌'}</li>
                <li>Has Plugin: {integrationTest.hasPlugin ? '✅' : '❌'}</li>
                <li>Exports: {integrationTest.exports.join(', ')}</li>
              </ul>
            </div>
          ) : (
            <div>Loading integration test...</div>
          )}
        </div>

        <div className="mt-8 bg-blue-100 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Integration Features</h2>
          <p className="mb-4">This test verifies that the @ghostspeak/nextjs package provides:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>✅ Builds successfully with rollup</li>
            <li>✅ Can be imported in Next.js applications</li>
            <li>🔧 Server-side rendering support</li>
            <li>🔧 API route handlers for blockchain interactions</li>
            <li>🔧 Webpack plugin for optimization</li>
            <li>🔧 Middleware for authentication</li>
          </ul>
        </div>

        <div className="mt-8 bg-yellow-100 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Next Steps</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Fix SDK dependencies in integration packages</li>
            <li>Test with real wallet connections</li>
            <li>Test API routes with blockchain calls</li>
            <li>Verify production build optimization</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
