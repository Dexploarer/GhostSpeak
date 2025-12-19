# Security Policy

## Reporting a Vulnerability

We take the security of GhostSpeak Protocol seriously. If you discover a security vulnerability,
please report it responsibly.

### Contact Information

- **Email:** [dexploarer@gmail.com](mailto:dexploarer@gmail.com)
- **GitHub:** [dexploarer](https://github.com/dexploarer)

### Guidelines

1. **Do not** disclose the vulnerability publicly until it has been addressed
2. Provide detailed information about the vulnerability
3. Include steps to reproduce if possible
4. Allow reasonable time for us to address the issue

### Response Timeline

- **Acknowledgment:** Within 48 hours
- **Initial Assessment:** Within 7 days
- **Resolution Target:** Within 30 days for critical issues

### Scope

This policy applies to:

- GhostSpeak smart contracts (Solana programs)
- SDK and client libraries
- Web application interfaces

### Out of Scope

- Third-party dependencies (report to upstream maintainers)
- Social engineering attacks
- Denial of service through spam

## Verified Builds

This program supports Solana verified builds. To verify:

```bash
# Install solana-verify
cargo install solana-verify

# Verify the deployed program
solana-verify verify-from-repo -u devnet \
  --program-id 4bJJNn4HgjZMZE59kRH4QBLbWa2NeZnUyf7AsThUWCGK \
  https://github.com/dexploarer/GhostSpeak
```

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers who report valid
vulnerabilities.
