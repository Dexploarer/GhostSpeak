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
            social: {
                github: 'https://github.com/Dexploarer/GhostSpeak',
            },
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
                        { label: 'Introduction', link: '/intro' },
                        { label: 'Quickstart Guide', link: '/guides/quickstart-guide' },
                        { label: 'Pitch Deck', link: '/general/pitch-deck' },
                    ],
                },
                {
                    label: 'Core Concepts',
                    items: [
                        { label: 'Architecture', link: '/core/architecture' },
                        { label: 'Security', link: '/core/security' },
                        { label: 'x402 Protocol', link: '/core/x402-payment-flow' },
                    ]
                },
                {
                    label: 'Guides',
                    items: [
                        { label: 'Deployment', link: '/guides/deployment' },
                        { label: 'Migration', link: '/guides/x402-migration-guide' },
                        { label: 'Testing', link: '/guides/comprehensive-testing-guide' },
                    ]
                },
                {
                    label: 'API Reference',
                    items: [
                        { label: 'API Overview', link: '/api/api' },
                        { label: 'Examples', link: '/api/x402-api-examples' },
                    ]
                },
                {
                    label: 'Reports & Analysis',
                    items: [
                        { label: 'Network Readiness', link: '/reports/network-readiness-report' },
                        { label: 'Tech Stack Review', link: '/reports/tech-stack-review-2025' },
                    ]
                }
            ],
        }),
        react(),
    ],
});
