<div align="center">

# skyward-rest

**A modern TypeScript client library for self-hosted Skyward integrations.**

[![CI](https://github.com/caleb-mau/skyward-rest/actions/workflows/ci.yml/badge.svg)](https://github.com/caleb-mau/skyward-rest/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/node.js-20%2B-339933?logo=node.js&logoColor=white)](package.json)

</div>

## What changed in v2

Version 2 is a ground-up TypeScript rewrite of the original 2019 [skyward-rest](https://github.com/Kaelinator/skyward-rest) project.

The old implementation assumed one SMS 2.0 username and password flow and mixed authentication, scraping, parsing, and application logic together.

v2 separates those concerns:

```text
Authentication / session
        ↓
same-origin Skyward transport
        ↓
provider adapter
        ↓
typed Skyward data
```

That matters because modern districts may use native Skyward login, Microsoft or Google SSO, ClassLink, Clever, MFA, or other identity systems.

**skyward-rest does not need to own the identity provider flow.**

A consuming application can authenticate through the district's normal browser flow, then hand the resulting Skyward session state to this library.

That is the intended architecture for projects such as `skyward-mcp`.

## Current support

The first v2 adapter targets **Skyward SMS 2.0 compatibility** based on the behavior documented by the original project.

Current typed operations include:

* Report card grades
* Detailed course gradebook
* Academic history
* Native SMS 2.0 password login where the district still permits it
* Explicit session import and export
* Same-origin authenticated HTTP transport
* Role and capability metadata for future student, teacher, parent, and staff adapters

Qmlativ and broader teacher workflows are intentionally modeled as provider extensions rather than being faked as already supported.

## Install

```bash
npm install skyward-rest
```

Node.js 20 or newer is required.

## Native SMS 2.0 login

For districts that still expose the compatible Skyward login flow:

```ts
import { loginWithPassword } from "skyward-rest";

const skyward = await loginWithPassword({
  loginUrl:
    "https://skyward.example.net/scripts/wsisa.dll/WService=wsEAplus/seplog01.w",
  username: process.env.SKYWARD_USERNAME!,
  password: process.env.SKYWARD_PASSWORD!,
});

const reportCard = await skyward.getReportCard();
```

The password is used only for the authentication request. It is not retained by the client.

If the deployment appears to require SSO, the login helper throws `SkywardSsoRequiredError` instead of attempting to bypass the district login flow.

## Browser SSO and session injection

SSO orchestration belongs in the consuming application.

For example, `skyward-mcp` can open the district's real login page in a browser, let the user complete Microsoft, Google, ClassLink, Clever, MFA, or another normal SSO flow, then import the resulting Skyward session:

```ts
import {
  createSkywardClient,
  SkywardSession,
} from "skyward-rest";

const session = new SkywardSession({
  version: 1,
  generation: "sms2",
  baseUrl:
    "https://skyward.example.net/scripts/wsisa.dll/WService=wsEAplus/",
  role: "teacher",
  cookies: browserCookies,
  sms2: extractedSkywardSessionTokens,
});

const skyward = createSkywardClient({ session });
```

The important boundary is:

```text
Identity provider credentials
        stay in the browser

Skyward session state
        stays in the self-hosted application

Structured school data
        is returned by skyward-rest
```

This package does not ask for Google, Microsoft, ClassLink, Clever, or district identity provider passwords.

## Session safety

`SkywardSession` intentionally does not serialize secrets through normal JSON output.

```ts
JSON.stringify(session);
// only returns a redacted summary
```

Reading the actual cookies or session tokens requires an explicit call:

```ts
const exported = session.export();
```

That makes accidental logging less likely.

## Gradebook

```ts
const gradebook = await skyward.getGradebook({
  courseId: 97776,
  bucket: "TERM 1",
});

console.log(gradebook.course);
console.log(gradebook.score);
console.log(gradebook.gradebook);
```

## Academic history

```ts
const history = await skyward.getAcademicHistory();
```

## Report card

```ts
const report = await skyward.getReportCard();
```

## Security model

Authenticated Skyward requests are restricted to the configured Skyward origin.

A redirect to another origin is rejected before cookies or session state can be forwarded.

The old project parsed Skyward JavaScript with `eval()`. v2 does not. Embedded grid objects are extracted as bounded object literals and parsed as data.

See [SECURITY.md](SECURITY.md) for more.

## Provider architecture

The public provider boundary is designed for multiple Skyward generations and roles.

```ts
interface SkywardProvider {
  getReportCard(): Promise<ReportCourse[]>;
  getGradebook(request: GradebookRequest): Promise<Gradebook>;
  getAcademicHistory(): Promise<AcademicHistoryYear[]>;
  exportSession(): SkywardSessionExport;
}
```

Future adapters can add capabilities for:

* Student schedules and attendance
* Teacher classes and rosters
* Teacher gradebooks
* Parent access
* Qmlativ
* Official district API credentials where available

The library does not assume every authenticated Skyward identity is a student.

## Relationship to skyward-mcp

`skyward-rest` is intentionally **not** an MCP server.

The planned split is:

```text
skyward-rest
  typed Skyward client
  auth/session primitives
  provider adapters
  safe parsers

skyward-mcp
  ChatGPT / Claude MCP server
  interactive browser SSO
  role-aware tools
  teacher privacy
  write approvals
  local and self-hosted setup
```

Keeping those layers separate makes the core library reusable without coupling it to one AI client or deployment model.

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
```

Use fictional or sanitized fixtures only.

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Attribution

The original `skyward-rest` project was created by Kael Kirk / FruitsNVeggies and released under the MIT License.

The repository history and original license are preserved. See [NOTICE.md](NOTICE.md).

## License

MIT. See [LICENSE](LICENSE).
