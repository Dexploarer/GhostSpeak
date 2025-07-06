import { Box, Text, useInput } from 'ink';
import Divider from 'ink-divider';
import Gradient from 'ink-gradient';
import React, { useState } from 'react';

import type { AppView } from './App.js';

export interface MainMenuProps {
  onViewChange: (view: AppView) => void;
  onError: (error: string) => void;
  network: string;
}

interface MenuItem {
  label: string;
  value: AppView;
  description: string;
  icon: string;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onViewChange,
  onError,
  network,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const menuItems: MenuItem[] = [
    {
      label: 'Agent Management',
      value: 'agents',
      description: 'Register, manage, and deploy AI agents',
      icon: '🤖',
    },
    {
      label: 'Communication Channels',
      value: 'channels',
      description: 'Create and manage agent communication channels',
      icon: '💬',
    },
    {
      label: 'Agent Marketplace',
      value: 'marketplace',
      description: 'Browse and purchase agent services',
      icon: '🛒',
    },
    {
      label: 'Developer Tools',
      value: 'developer',
      description: 'Development utilities and debugging tools',
      icon: '🔧',
    },
    {
      label: 'System Status',
      value: 'status',
      description: 'View network status and health metrics',
      icon: '📊',
    },
  ];

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : menuItems.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => (prev < menuItems.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      if (menuItems[selectedIndex]) handleSelect(menuItems[selectedIndex]);
    }

    // Number shortcuts
    const num = parseInt(input, 10);
    if (num >= 1 && num <= menuItems.length) {
      if (menuItems[num - 1] !== undefined) handleSelect(menuItems[num - 1]!);
    }
  });

  const handleSelect = (item: MenuItem) => {
    try {
      onViewChange(item.value);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Navigation failed');
    }
  };

  return (
    <Box flexDirection="column" padding={2}>
      {/* Welcome Header */}
      <Box marginBottom={2}>
        <Gradient name="rainbow">
          <Text bold>🌟 Welcome to ghostspeak CLI</Text>
        </Gradient>
      </Box>

      <Box marginBottom={2}>
        <Text color="gray">
          Navigate the autonomous agent commerce protocol. Network:{' '}
          <Text color="cyan">{network}</Text>
        </Text>
      </Box>

      <Divider />

      {/* Menu Items */}
      <Box flexDirection="column" marginTop={2}>
        <Text color="cyan" bold>
          📋 Choose an option:
        </Text>

        {menuItems.map((item, index) => (
          <Box key={item.value} marginBottom={1}>
            <Box
              borderStyle={selectedIndex === index ? 'round' : 'single'}
              borderColor={selectedIndex === index ? 'cyan' : 'gray'}
              padding={1}
              width="100%"
            >
              <Box justifyContent="space-between" width="100%">
                <Box>
                  <Text color={selectedIndex === index ? 'cyan' : 'white'}>
                    {item.icon} {index + 1}. {item.label}
                  </Text>
                </Box>
                {selectedIndex === index && <Text color="cyan">{'>'}</Text>}
              </Box>

              {selectedIndex === index && (
                <Box marginTop={1}>
                  <Text color="gray">{item.description}</Text>
                </Box>
              )}
            </Box>
          </Box>
        ))}
      </Box>

      <Divider />

      {/* Instructions */}
      <Box marginTop={2}>
        <Text color="gray">
          Navigation: ↑↓ arrows or numbers 1-{menuItems.length} • Enter to
          select
        </Text>
      </Box>

      {/* Network Status Bar */}
      <Box marginTop={2} borderStyle="single" borderColor="green" padding={1}>
        <Box justifyContent="space-between">
          <Text color="green">● Connected to {network}</Text>
          <Text color="gray">Ready for agent operations</Text>
        </Box>
      </Box>

      {/* Quick Action Hints */}
      <Box marginTop={2}>
        <Text color="yellow" bold>
          💡 Quick Actions:
        </Text>
        <Box marginTop={1}>
          <Text color="gray">• Press 1 for Agent Management</Text>
          <Text color="gray">• Press 2 for Channels</Text>
          <Text color="gray">• Press 3 for Marketplace</Text>
          <Text color="gray">• Ctrl+C to exit anytime</Text>
        </Box>
      </Box>
    </Box>
  );
};
