/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgentCard } from '@/components/agents/AgentCard'
import { createMockAgent } from '../test-utils'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('AgentCard', () => {
  it('renders agent information correctly', () => {
    const mockAgent = createMockAgent({
      name: 'Test Agent',
      address: 'test-agent-address',
      metadata: {
        name: 'Test Agent',
        description: 'A test agent for unit testing',
        avatar: 'https://example.com/avatar.png',
      },
      capabilities: ['testing', 'development', 'debugging'],
      pricing: BigInt(2500000000), // 2.5 SOL
      isActive: true,
      reputation: {
        score: 4.8,
        totalJobs: 42,
        totalReviews: 38,
        successRate: 0.95,
        avgResponseTime: 1.5,
        onTimeDelivery: 0.98,
      },
    })

    render(<AgentCard agent={mockAgent} />)

    // Check agent name
    expect(screen.getByText('Test Agent')).toBeInTheDocument()

    // Check agent address (formatted - check for the actual rendered text)
    expect(screen.getByText('test...ress')).toBeInTheDocument()

    // Check description
    expect(screen.getByText('A test agent for unit testing')).toBeInTheDocument()

    // Check capabilities (first 3 + count)
    expect(screen.getByText('testing')).toBeInTheDocument()
    expect(screen.getByText('development')).toBeInTheDocument()
    expect(screen.getByText('debugging')).toBeInTheDocument()

    // Check reputation score
    expect(screen.getByText('4.8')).toBeInTheDocument()
    expect(screen.getByText('(42 jobs)')).toBeInTheDocument()

    // Check pricing (just check that SOL is present)
    expect(screen.getByText(/SOL/)).toBeInTheDocument()

    // Check active status
    expect(screen.getByText('Active')).toBeInTheDocument()

    // Check action buttons
    expect(screen.getByText('View Details')).toBeInTheDocument()
    expect(screen.getByText('Hire Agent')).toBeInTheDocument()
  })

  it('renders inactive agent correctly', () => {
    const mockAgent = createMockAgent({
      name: 'Inactive Agent',
      isActive: false,
    })

    render(<AgentCard agent={mockAgent} />)

    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('renders agent without avatar', () => {
    const mockAgent = createMockAgent({
      name: 'No Avatar Agent',
      metadata: {
        name: 'No Avatar Agent',
        description: 'Agent without avatar',
        avatar: undefined,
      },
    })

    const { container } = render(<AgentCard agent={mockAgent} />)

    // Should render Bot icon SVG instead of avatar
    const botIcon = container.querySelector('svg.lucide-bot')
    expect(botIcon).toBeInTheDocument()
  })

  it('handles many capabilities correctly', () => {
    const mockAgent = createMockAgent({
      name: 'Multi-Capability Agent',
      capabilities: ['web3', 'solana', 'rust', 'typescript', 'react', 'testing'],
    })

    render(<AgentCard agent={mockAgent} />)

    // Should show first 3 capabilities
    expect(screen.getByText('web3')).toBeInTheDocument()
    expect(screen.getByText('solana')).toBeInTheDocument()
    expect(screen.getByText('rust')).toBeInTheDocument()

    // Should show +3 more indicator
    expect(screen.getByText('+3')).toBeInTheDocument()
  })

  it('renders correct navigation links', () => {
    const mockAgent = createMockAgent({
      address: 'test-agent-123',
    })

    render(<AgentCard agent={mockAgent} />)

    // Check detail link
    const detailLink = screen.getByText('View Details')
    expect(detailLink.closest('a')).toHaveAttribute('href', '/agents/test-agent-123')

    // Check hire link
    const hireLink = screen.getByText('Hire Agent')
    expect(hireLink.closest('a')).toHaveAttribute('href', '/agents/test-agent-123/hire')
  })

  it('formats large numbers in reputation correctly', () => {
    const mockAgent = createMockAgent({
      reputation: {
        score: 4.2,
        totalJobs: 1250,
        totalReviews: 1100,
        successRate: 0.98,
        avgResponseTime: 0.5,
        onTimeDelivery: 0.99,
      },
    })

    render(<AgentCard agent={mockAgent} />)

    expect(screen.getByText('4.2')).toBeInTheDocument()
    expect(screen.getByText('(1.3K jobs)')).toBeInTheDocument() // Should format large numbers
  })

  it('formats SOL pricing correctly', () => {
    const mockAgent = createMockAgent({
      pricing: BigInt(500000000), // 0.5 SOL
    })

    render(<AgentCard agent={mockAgent} />)

    // Check that SOL pricing is displayed (might be formatted as 0.5000 SOL)
    expect(screen.getByText(/0\.5.*SOL/)).toBeInTheDocument()
  })

  it('handles empty or minimal data gracefully', () => {
    const mockAgent = createMockAgent({
      name: 'Minimal Agent',
      metadata: {
        name: 'Minimal Agent',
        description: '',
      },
      capabilities: [],
      reputation: {
        score: 0,
        totalJobs: 0,
        totalReviews: 0,
        successRate: 0,
        avgResponseTime: 0,
        onTimeDelivery: 0,
      },
    })

    render(<AgentCard agent={mockAgent} />)

    expect(screen.getByText('Minimal Agent')).toBeInTheDocument()
    expect(screen.getByText('0.0')).toBeInTheDocument()
    expect(screen.getByText('(0 jobs)')).toBeInTheDocument()
  })
})
