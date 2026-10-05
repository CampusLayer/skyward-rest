# Contributing

## Development

Requirements:

* Node.js 20 or newer
* npm

Run:

```bash
npm install
npm test
npm run typecheck
npm run build
```

## Fixtures

Use fictional or heavily sanitized Skyward fixtures only.

Never commit:

* Usernames or passwords
* Session cookies
* SMS session tokens
* Student names or IDs
* Teacher names tied to real records
* Grades, attendance, schedules, or other real education records

## Provider adapters

Keep authentication and data parsing separate.

A provider adapter should expose typed data through the shared client surface and must not send authenticated requests to a different origin.

SSO provider credentials do not belong in skyward-rest. Browser based SSO orchestration belongs in the consuming application, such as skyward-mcp.

## Pull requests

Describe:

* Which Skyward generation or deployment style you tested
* Which role you tested, such as student, teacher, parent, or staff
* Whether authentication behavior changed
* Which sanitized fixtures cover the change
