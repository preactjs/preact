# Security Policy

## Supported Versions

We actively support the following versions of Preact with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 11.x    | :white_check_mark: |
| 10.x    | :white_check_mark: |
| < 10.0  | :x:                |

## Reporting a Vulnerability

The Preact team takes security vulnerabilities seriously. We appreciate your efforts to responsibly disclose your findings.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via one of the following methods:

1. **Email**: Send an email to the maintainers through the contact information available on the [Preact website](https://preactjs.com)
2. **GitHub Security Advisories**: Use the GitHub Security Advisory feature at [https://github.com/preactjs/preact/security/advisories/new](https://github.com/preactjs/preact/security/advisories/new)

### What to Include

Please include as much of the following information as possible:

- Type of vulnerability
- Full paths of source file(s) related to the manifestation of the vulnerability
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect

- **Initial Response**: You should receive an initial response within 48 hours acknowledging your report
- **Progress Updates**: We'll keep you informed about the progress of fixing the vulnerability
- **Disclosure Timeline**: We aim to address critical vulnerabilities within 90 days
- **Credit**: We're happy to give credit to security researchers who responsibly disclose vulnerabilities

### Safe Harbor

We consider security research and vulnerability disclosure activities conducted according to this policy as:

- Authorized concerning any applicable anti-hacking laws
- Authorized concerning any relevant anti-circumvention laws
- Exempt from restrictions in our Terms of Service that would interfere with conducting security research

We will not pursue legal action against security researchers who:

- Make a good faith effort to avoid privacy violations, destruction of data, and interruption or degradation of our services
- Only interact with accounts you own or with explicit permission of the account holder
- Do not exploit a security issue beyond what is necessary to demonstrate the vulnerability

## Security Best Practices for Users

When using Preact, we recommend:

1. Always use the latest stable version
2. Regularly update dependencies
3. Follow React/Preact security best practices for preventing XSS
4. Use Content Security Policy (CSP) headers
5. Sanitize user input before rendering
6. Be cautious with `dangerouslySetInnerHTML`

## Learn More

For more information about security in Preact applications, visit:

- [Preact Documentation](https://preactjs.com)
- [React Security Best Practices](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)

Thank you for helping keep Preact and its users safe!
