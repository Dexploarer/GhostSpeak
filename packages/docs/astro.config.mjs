import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
    site: 'https://dexploarer.github.io',
    base: '/GhostSpeak',
    integrations: [
        starlight({
            title: 'GhostSpeak',
            tagline: 'The Decentralized Service Commerce Protocol',
            social: [
                {
                    icon: 'github',
                    label: 'GitHub',
                    href: 'https://github.com/Dexploarer/GhostSpeak',
                },
            ],
            customCss: [
                // './src/styles/custom.css',
            ],
            defaultLocale: 'root',
            locales: {
                root: {
                    label: 'English',
                    lang: 'en',
                },
            },
            head: [],
            favicon: '/favicon.svg',
            sidebar: [
                {
                    label: 'Start Here',
                    items: [
                        // Each item here is one entry in the navigation menu.
                        { label: 'Introduction', slug: 'intro' },
                        { label: 'Quickstart Guide', slug: 'guides/quickstart-guide' },
                        { label: 'Pitch Deck', slug: 'general/pitch-deck' },
                    ],
                },
                {
                    label: 'Core Concepts',
                    items: [
                        { label: 'Architecture', slug: 'core/architecture' },
                        { label: 'Security', slug: 'core/security' },
                        { label: 'x402 Protocol', slug: 'core/x402-payment-flow' },
                    ]
                },
                {
                    label: 'Guides',
                    items: [
                        { label: 'Deployment', slug: 'guides/deployment' },
                        { label: 'Migration', slug: 'guides/x402-migration-guide' },
                        { label: 'Testing', slug: 'guides/comprehensive-testing-guide' },
                    ]
                },
                {
                    label: 'API Reference',
                    items: [
                        { label: 'API Overview', slug: 'api/api' },
                        { label: 'Examples', slug: 'api/x402-api-examples' },
                    ]
                },
                {
                    label: 'Reports & Analysis',
                    items: [
                        { label: 'Network Readiness', slug: 'reports/network-readiness-report' },
                        { label: 'Tech Stack Review', slug: 'reports/tech-stack-review-2025' },
                    ]
                }
            ],
        }),
        react(),
    ],
});
