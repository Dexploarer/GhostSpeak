import { Box, Text } from 'ink';
import React from 'react';

import type { ConfigManager } from '../core/ConfigManager.js';
import type { Logger } from '../core/Logger.js';

interface IChannelManagerProps {
  config: ConfigManager;
  logger: Logger;
  network: string;
  onError: (error: string) => void;
}

export const ChannelManager: React.FC<IChannelManagerProps> = ({}) => {
  return (
    <Box flexDirection="column" padding={2}>
      <Text color="cyan" bold>
        💬 Channel Manager
      </Text>
      <Text color="gray">Coming soon - Manage communication channels</Text>
      <Text color="gray">Press ESC to go back</Text>
    </Box>
  );
};
