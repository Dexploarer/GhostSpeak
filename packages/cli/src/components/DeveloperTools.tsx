import { Box, Text } from 'ink';
import React from 'react';

import type { ConfigManager } from '../core/ConfigManager.js';
import type { Logger } from '../core/Logger.js';

export interface DeveloperToolsProps {
  config: ConfigManager;
  logger: Logger;
  network: string;
  onError: (error: string) => void;
}

export const DeveloperTools: React.FC<DeveloperToolsProps> = ({}) => {
  return (
    <Box flexDirection="column" padding={2}>
      <Text color="cyan" bold>
        🔧 Developer Tools
      </Text>
      <Text color="gray">
        Coming soon - Development utilities and debugging
      </Text>
      <Text color="gray">Press ESC to go back</Text>
    </Box>
  );
};
