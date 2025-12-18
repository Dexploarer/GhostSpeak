import React from 'react'
import { getDocBySlug, fileMap } from '@/lib/docs'
import { notFound } from 'next/navigation'
import { MarkdownRenderer } from '@/components/docs/MarkdownRenderer'
import { Metadata } from 'next'

interface PageProps {
  params: Promise<{ slug: string[] }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const doc = await getDocBySlug(slug)
  return {
    title: doc?.title ? `${doc.title} | GhostSpeak Docs` : 'GhostSpeak Docs',
  }
}

export async function generateStaticParams() {
  // Filter out the empty root path which is handled by app/docs/page.tsx
  return Object.keys(fileMap)
    .filter(slug => slug !== '')
    .map(slug => ({
      slug: slug.split('/')
    }))
}

export default async function SlugPage({ params }: PageProps) {
  const { slug } = await params
  const doc = await getDocBySlug(slug)

  if (!doc) {
    notFound()
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <MarkdownRenderer content={doc.source} />
    </div>
  )
}
