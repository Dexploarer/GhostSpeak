import { Box, Text, useInput } from 'ink';
import Divider from 'ink-divider';
import Spinner from 'ink-spinner';
import Table from 'ink-table';
import TextInput from 'ink-text-input';
import React, { useState, useEffect } from 'react';

import type { ConfigManager } from '../core/ConfigManager.js';
import type { Logger } from '../core/Logger.js';

export interface AgentManagerProps {
  config: ConfigManager;
  logger: Logger;
  network: string;
  onBack: () => void;
  onError: (error: string) => void;
}

type AgentView = 'list' | 'register' | 'details' | 'loading';

interface Agent {
  name: string;
  address: string;
  type: string;
  description: string;
  lastUsed: Date;
  status: 'active' | 'inactive' | 'error';
}

export const AgentManager: React.FC<AgentManagerProps> = ({
  config,
  logger,
  network,
  onBack,
  onError,
}) => {
  const [currentView, setCurrentView] = useState<AgentView>('list');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);

  // Registration form state
  const [agentName, setAgentName] = useState('');
  const [agentType, setAgentType] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [registrationStep, setRegistrationStep] = useState<
    'name' | 'type' | 'description' | 'confirm'
  >('name');

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);

      // Load from config
      const configAgents = config.listAgents();

      // Convert to display format and simulate status check
      const agentList: Agent[] = configAgents.map(({ name, agent }) => ({
        name,
        address: agent.address,
        type: agent.type,
        description: agent.description || 'No description',
        lastUsed: agent.lastUsed,
        status: Math.random() > 0.8 ? 'error' : ('active' as const), // Simulate some errors
      }));

      setAgents(agentList);
      await logger.info(`Loaded ${agentList.length} agents`);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const registerAgent = async () => {
    try {
      setLoading(true);
      await logger.info(`Registering agent: ${agentName}`);

      // Simulate agent registration on blockchain
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate a mock address for demo
      const mockAddress = `Agent${Math.random().toString(36).substring(2, 15)}`;

      // Save to config
      config.addAgent(agentName, mockAddress, agentType, agentDescription);
      await config.save();

      // Add to local state
      const newAgent: Agent = {
        name: agentName,
        address: mockAddress,
        type: agentType,
        description: agentDescription,
        lastUsed: new Date(),
        status: 'active',
      };

      setAgents(prev => [...prev, newAgent]);

      await logger.success(`Agent "${agentName}" registered successfully`);

      // Reset form
      setAgentName('');
      setAgentType('');
      setAgentDescription('');
      setRegistrationStep('name');
      setCurrentView('list');
    } catch (error) {
      onError(
        error instanceof Error ? error.message : 'Failed to register agent'
      );
    } finally {
      setLoading(false);
    }
  };

  useInput((input: string, key: { escape?: boolean }) => {
    if (key.escape || input === 'b') {
      if (currentView === 'list') {
        onBack();
      } else {
        setCurrentView('list');
      }
      return;
    }

    if (currentView === 'list') {
      if (input === 'r') {
        setCurrentView('register');
      } else if (input === 'l') {
        loadAgents();
      }
    }

    if (currentView === 'register' && registrationStep === 'confirm') {
      if (input === 'y') {
        registerAgent();
      } else if (input === 'n') {
        setCurrentView('list');
      }
    }
  });

  const renderAgentList = () => (
    <Box flexDirection="column">
      <Box marginBottom={2}>
        <Text color="cyan" bold>
          🤖 Agent Management
        </Text>
      </Box>

      <Box marginBottom={2}>
        <Text color="gray">
          Network: {network} • {agents.length} agents registered
        </Text>
      </Box>

      <Divider />

      {loading ? (
        <Box marginTop={2}>
          <Text color="cyan">
            <Spinner type="dots" /> Loading agents...
          </Text>
        </Box>
      ) : agents.length === 0 ? (
        <Box flexDirection="column" marginTop={2}>
          <Text color="yellow">📭 No agents registered</Text>
          <Text color="gray">Press 'R' to register your first agent</Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginTop={2}>
          <Table
            data={agents.map(agent => ({
              Name: agent.name,
              Type: agent.type,
              Status:
                agent.status === 'active'
                  ? '✅ Active'
                  : agent.status === 'error'
                    ? '❌ Error'
                    : '⏸️ Inactive',
              'Last Used': agent.lastUsed.toLocaleDateString(),
              Address: `${agent.address.substring(0, 8)}...`,
            }))}
          />
        </Box>
      )}

      <Divider />

      <Box marginTop={2}>
        <Text color="cyan">Actions:</Text>
        <Text color="gray">
          {' '}
          [R] Register Agent • [L] Reload • [B] Back • [ESC] Exit
        </Text>
      </Box>
    </Box>
  );

  const renderRegistrationForm = () => (
    <Box flexDirection="column">
      <Box marginBottom={2}>
        <Text color="cyan" bold>
          📝 Register New Agent
        </Text>
      </Box>

      <Box marginBottom={2}>
        <Text color="gray">
          Step{' '}
          {['name', 'type', 'description', 'confirm'].indexOf(
            registrationStep
          ) + 1}{' '}
          of 4
        </Text>
      </Box>

      <Divider />

      {registrationStep === 'name' && (
        <Box flexDirection="column" marginTop={2}>
          <Text color="white">Agent Name:</Text>
          <TextInput
            value={agentName}
            onChange={setAgentName}
            onSubmit={() => {
              if (agentName.trim()) {
                setRegistrationStep('type');
              }
            }}
            placeholder="Enter agent name (e.g., TradingBot, DataAnalyzer)"
          />
          <Text color="gray">Press Enter to continue</Text>
        </Box>
      )}

      {registrationStep === 'type' && (
        <Box flexDirection="column" marginTop={2}>
          <Text color="white">Agent Type:</Text>
          <TextInput
            value={agentType}
            onChange={setAgentType}
            onSubmit={() => {
              if (agentType.trim()) {
                setRegistrationStep('description');
              }
            }}
            placeholder="Enter agent type (e.g., trading, analytics, communication)"
          />
          <Text color="gray">Press Enter to continue</Text>
        </Box>
      )}

      {registrationStep === 'description' && (
        <Box flexDirection="column" marginTop={2}>
          <Text color="white">Description (optional):</Text>
          <TextInput
            value={agentDescription}
            onChange={setAgentDescription}
            onSubmit={() => setRegistrationStep('confirm')}
            placeholder="Brief description of agent capabilities"
          />
          <Text color="gray">Press Enter to continue (or leave empty)</Text>
        </Box>
      )}

      {registrationStep === 'confirm' && (
        <Box flexDirection="column" marginTop={2}>
          <Text color="yellow" bold>
            Confirm Registration:
          </Text>

          <Box
            borderStyle="round"
            borderColor="cyan"
            padding={1}
            marginBottom={2}
          >
            <Box flexDirection="column">
              <Text color="white">
                Name: <Text color="cyan">{agentName}</Text>
              </Text>
              <Text color="white">
                Type: <Text color="cyan">{agentType}</Text>
              </Text>
              {agentDescription && (
                <Text color="white">
                  Description: <Text color="cyan">{agentDescription}</Text>
                </Text>
              )}
              <Text color="white">
                Network: <Text color="cyan">{network}</Text>
              </Text>
            </Box>
          </Box>

          {loading ? (
            <Box>
              <Text color="green">
                <Spinner type="dots" /> Registering agent on blockchain...
              </Text>
            </Box>
          ) : (
            <Text color="gray">Press 'Y' to confirm, 'N' to cancel</Text>
          )}
        </Box>
      )}

      <Divider />

      <Box marginTop={2}>
        <Text color="gray">[ESC] Back to list</Text>
      </Box>
    </Box>
  );

  return (
    <Box flexDirection="column" padding={2}>
      {currentView === 'list' && renderAgentList()}
      {currentView === 'register' && renderRegistrationForm()}
      {currentView === 'loading' && (
        <Box>
          <Text color="cyan">
            <Spinner type="dots" /> Processing...
          </Text>
        </Box>
      )}
    </Box>
  );
};
