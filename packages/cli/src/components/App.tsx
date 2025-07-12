import { Box, Text, useInput, useApp } from 'ink';
import BigText from 'ink-big-text';
import Divider from 'ink-divider';
import Gradient from 'ink-gradient';
import Spinner from 'ink-spinner';
import React, { useState, useEffect } from 'react';

import { AgentManager } from './AgentManager.js';
import { ChannelManager } from './ChannelManager.js';
import { DeveloperTools } from './DeveloperTools.js';
import { MainMenu } from './MainMenu.js';
import { MarketplaceView } from './MarketplaceView.js';
import { StatusDashboard } from './StatusDashboard.js';

import type { ConfigManager as ConfigManagerType } from '../core/ConfigManager.js';
import type { Logger } from '../core/Logger.js';

export interface GhostSpeakAppProps {
  config: ConfigManagerType;
  logger: Logger;
  network: string;
  verbose: boolean;
  quiet: boolean;
}

export type AppView =
  | 'main'
  | 'agents'
  | 'channels'
  | 'marketplace'
  | 'developer'
  | 'status'
  | 'loading';

export interface AppState {
  currentView: AppView;
  loading: boolean;
  error: string | null;
  selectedAgent: string | null;
  selectedChannel: string | null;
}

export const GhostSpeakApp: React.FC<GhostSpeakAppProps> = ({
  config,
  logger,
  network,
  verbose,
  quiet,
}) => {
  const { exit } = useApp();

  const [state, setState] = useState<AppState>({
    currentView: 'main',
    loading: false,
    error: null,
    selectedAgent: null,
    selectedChannel: null,
  });

  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'error'
  >('connecting');

  // Initialize connection to Solana network
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        setState(prev => ({ ...prev, loading: true }));

        // Simulate network connection
        await new Promise(resolve => setTimeout(resolve, 1500));

        setConnectionStatus('connected');
        setState(prev => ({ ...prev, loading: false }));

        if (verbose) {
          logger.ui.info(`Connected to Solana ${network}`);
        }
      } catch (error) {
        setConnectionStatus('error');
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Connection failed',
        }));
      }
    };

    initializeConnection();
  }, [network, logger, verbose]);

  // Handle keyboard input
  useInput((input, key) => {
    // Global shortcuts
    if (key.escape || (key.ctrl && input === 'c')) {
      exit();
      return;
    }

    // Navigation shortcuts
    if (key.ctrl) {
      switch (input) {
        case 'm':
          setState(prev => ({ ...prev, currentView: 'main' }));
          break;
        case 'a':
          setState(prev => ({ ...prev, currentView: 'agents' }));
          break;
        case 'h':
          setState(prev => ({ ...prev, currentView: 'channels' }));
          break;
        case 'p':
          setState(prev => ({ ...prev, currentView: 'marketplace' }));
          break;
        case 'd':
          setState(prev => ({ ...prev, currentView: 'developer' }));
          break;
        case 's':
          setState(prev => ({ ...prev, currentView: 'status' }));
          break;
      }
    }
  });

  const handleViewChange = (view: AppView) => {
    setState(prev => ({ ...prev, currentView: view }));
  };

  const handleError = (error: string) => {
    setState(prev => ({ ...prev, error }));
  };

  // Loading screen
  if (state.loading || connectionStatus === 'connecting') {
    return (
      <Box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight={20}
      >
        <Gradient name="pastel">
          <BigText text="ghostspeak" font="block" />
        </Gradient>

        <Box marginY={1}>
          <Text color="cyan">
            <Spinner type="dots" /> Connecting to Solana {network}...
          </Text>
        </Box>

        <Box marginTop={2}>
          <Text color="gray">
            Initializing autonomous agent commerce protocol
          </Text>
        </Box>
      </Box>
    );
  }

  // Error screen
  if (connectionStatus === 'error' || state.error) {
    return (
      <Box flexDirection="column" padding={2}>
        <Text color="red">❌ Error</Text>
        <Text color="white">
          {state.error || 'Failed to connect to network'}
        </Text>

        <Box marginTop={2}>
          <Text color="gray">Press ESC to exit or try again</Text>
        </Box>
      </Box>
    );
  }

  // Main application interface
  return (
    <Box flexDirection="column" minHeight={25}>
      {/* Header */}
      <Box borderStyle="round" borderColor="cyan" padding={1} marginBottom={1}>
        <Box flexDirection="column" width="100%">
          <Box justifyContent="space-between">
            <Gradient name="pastel">
              <Text bold>👻 ghostspeak CLI</Text>
            </Gradient>
            <Box>
              <Text color="green">●</Text>
              <Text color="gray"> {network}</Text>
            </Box>
          </Box>

          <Box marginTop={1}>
            <Text color="gray">
              Autonomous Agent Commerce Protocol • Press Ctrl+C to exit • Ctrl+M
              for menu
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Navigation shortcuts */}
      {!quiet && (
        <Box marginBottom={1}>
          <Text color="gray">
            Shortcuts: [Ctrl+A] Agents [Ctrl+H] Channels [Ctrl+P] Marketplace{' '}
            [Ctrl+D] Dev Tools [Ctrl+S] Status
          </Text>
        </Box>
      )}

      <Divider />

      {/* Main content area */}
      <Box flexGrow={1} marginTop={1}>
        {state.currentView === 'main' && (
          <MainMenu
            onViewChange={handleViewChange}
            onError={handleError}
            network={network}
          />
        )}

        {state.currentView === 'agents' && (
          <AgentManager
            config={config}
            logger={logger}
            network={network}
            onBack={() => handleViewChange('main')}
            onError={handleError}
          />
        )}

        {state.currentView === 'channels' && (
          <ChannelManager
            config={config}
            logger={logger}
            network={network}
            onError={handleError}
          />
        )}

        {state.currentView === 'marketplace' && (
          <MarketplaceView
            config={config}
            logger={logger}
            network={network}
            onError={handleError}
          />
        )}

        {state.currentView === 'developer' && (
          <DeveloperTools
            config={config}
            logger={logger}
            network={network}
            onError={handleError}
          />
        )}

        {state.currentView === 'status' && (
          <StatusDashboard
            config={config}
            logger={logger}
            network={network}
            onError={handleError}
          />
        )}
      </Box>

      {/* Footer with status */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
        <Box justifyContent="space-between">
          <Text color="gray">Current view: {state.currentView}</Text>
          <Text color="gray">{new Date().toLocaleTimeString()}</Text>
        </Box>
      </Box>
    </Box>
  );
};
