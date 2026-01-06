'use client'

import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'

interface ChatMarkdownProps {
  content: string
  className?: string
}

/**
 * Elegant markdown renderer for chat messages
 * Renders Caisper's markdown responses with clean, styled typography
 */
export function ChatMarkdown({ content, className = '' }: ChatMarkdownProps) {
  const components: Components = {
    // Headers - clean, subtle styling
    h1: ({ children }) => (
      <h1 className="text-xl font-semibold text-white mt-4 mb-2 first:mt-0">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-lg font-semibold text-white mt-4 mb-2 first:mt-0">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-base font-semibold text-white/90 mt-3 mb-1.5 first:mt-0">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-sm font-medium text-white/80 mt-2 mb-1 first:mt-0">{children}</h4>
    ),

    // Paragraphs
    p: ({ children }) => <p className="text-white/90 leading-relaxed mb-3 last:mb-0">{children}</p>,

    // Strong/bold text
    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,

    // Emphasis/italic
    em: ({ children }) => <em className="italic text-white/80">{children}</em>,

    // Inline code
    code: ({ children, className }) => {
      // Check if it's a code block (has language class) or inline code
      const isBlock = className?.includes('language-')
      if (isBlock) {
        return (
          <code className="block bg-black/40 rounded-lg p-3 text-sm font-mono text-lime-300 overflow-x-auto my-2">
            {children}
          </code>
        )
      }
      return (
        <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm font-mono text-lime-300">
          {children}
        </code>
      )
    },

    // Code blocks (pre)
    pre: ({ children }) => <pre className="my-2 overflow-hidden rounded-lg">{children}</pre>,

    // Links
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
      >
        {children}
      </a>
    ),

    // Unordered lists
    ul: ({ children }) => <ul className="my-2 ml-4 space-y-1">{children}</ul>,

    // Ordered lists
    ol: ({ children }) => <ol className="my-2 ml-4 space-y-1 list-decimal">{children}</ol>,

    // List items
    li: ({ children }) => (
      <li className="text-white/90 pl-1 before:content-['•'] before:text-lime-400 before:mr-2 before:font-bold list-none">
        {children}
      </li>
    ),

    // Blockquotes
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-lime-400/50 pl-4 my-3 italic text-white/70">
        {children}
      </blockquote>
    ),

    // Horizontal rules
    hr: () => <hr className="my-4 border-white/10" />,
  }

  return (
    <div className={`chat-markdown ${className}`}>
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  )
}
