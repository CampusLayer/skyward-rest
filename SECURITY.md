# Security Policy

## Credentials and sessions

Never include real Skyward usernames, passwords, cookies, session tokens, student records, teacher records, grades, attendance data, or district information in a public issue.

If a credential or authenticated session is exposed, revoke or invalidate it through the district's normal process and sign in again.

## Authentication design

skyward-rest does not attempt to bypass district authentication controls.

Native SMS 2.0 username and password login is supported only for deployments that still expose the compatible Skyward login flow.

If a district requires SSO or MFA, callers should authenticate through the district's real browser login flow and pass the resulting Skyward session state into the library. Do not automate Google, Microsoft, ClassLink, Clever, or other identity provider passwords through this package.

## Request boundaries

Authenticated Skyward HTTP requests are restricted to the configured Skyward origin. Redirects to a different origin are rejected before cookies or session state can be forwarded.

## Reporting a vulnerability

Use GitHub private vulnerability reporting when available. Do not publish exploitable security details or real credentials in a public issue.
