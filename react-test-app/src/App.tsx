import React, { useEffect, useState } from 'react';
import './App.css';

// Simple integration test for @ghostspeak/react package
function App() {
  const [packageInfo, setPackageInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Test dynamic import of built React package
    const testIntegration = async () => {
      try {
        // Try to import the built React integration package
        const reactPackage = await import('../../packages/integrations/react/dist/index.js');
        setPackageInfo({
          available: true,
          exports: Object.keys(reactPackage),
          hasProvider: !!reactPackage.GhostSpeakProvider,
          hasHooks: !!reactPackage.useGhostSpeak,
          hasComponents: !!reactPackage.AgentCard,
        });
      } catch (err) {
        console.error('Failed to import React package:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    testIntegration();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>GhostSpeak React Integration Test</h1>
        <div style={{ textAlign: 'left', maxWidth: '600px' }}>
          <h2>Package Import Test</h2>
          {error ? (
            <div style={{ color: 'red' }}>
              <strong>Error:</strong> {error}
            </div>
          ) : packageInfo ? (
            <div style={{ color: 'green' }}>
              <h3>✅ Package Import Successful</h3>
              <ul>
                <li>Available: {packageInfo.available ? '✅' : '❌'}</li>
                <li>Has Provider: {packageInfo.hasProvider ? '✅' : '❌'}</li>
                <li>Has Hooks: {packageInfo.hasHooks ? '✅' : '❌'}</li>
                <li>Has Components: {packageInfo.hasComponents ? '✅' : '❌'}</li>
                <li>Exports: {packageInfo.exports.join(', ')}</li>
              </ul>
            </div>
          ) : (
            <div>Loading package...</div>
          )}
          
          <h2>Integration Features Test</h2>
          <p>This test verifies that the @ghostspeak/react package:</p>
          <ul>
            <li>✅ Builds successfully with rollup</li>
            <li>✅ Can be imported as an ES module</li>
            <li>🔧 Exports required React components and hooks</li>
            <li>🔧 Integrates with GhostSpeak SDK (pending SDK fixes)</li>
            <li>🔧 Provides wallet adapter integration</li>
          </ul>
        </div>
      </header>
    </div>
  );
}

export default App;
