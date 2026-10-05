# Changelog

## 2.0.0

Ground-up TypeScript rebuild.

### Changed

* Replaced the original CommonJS API with a typed client and provider architecture
* Added explicit Skyward session objects
* Added session import and export for browser-based SSO consumers
* Restricted authenticated HTTP requests to the configured Skyward origin
* Replaced `eval()` based grid parsing with safe data parsing
* Replaced Axios, Bluebird, AVA, Travis CI, and the legacy nested package structure
* Added Node.js 20+ support and native `fetch`
* Added strict TypeScript declarations

### Current SMS 2.0 compatibility

* Native password authentication for compatible deployments
* Report card parsing
* Detailed gradebook parsing
* Academic history parsing

### Architecture

v2 is intended to act as the core library underneath projects such as `skyward-mcp`. Browser SSO orchestration and MCP-specific behavior intentionally live outside this package.

---

## 1.0.1 (2019-05-06)

* Fixed `.scrapeReport` returning empty courses

## 1.0.0 (2019-03-17)

* Added scraper
* Added `.scrapeGradebook`
* Added `.scrapeHistory`
* Added `.scrapeReport`
