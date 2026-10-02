# Tabber Scraper AWS Lambda Service

A dedicated, high-performance web scraping microservice for Tabber, built to run on **AWS Lambda** (Node.js 20).

## Highlights
- **High Performance:** Bundled with `esbuild` into a single self-contained ~5 KB bundle with zero runtime dependencies.
- **Fast Cold Starts:** Boots in under ~100–150ms.
- **High Network Throughput:** Configured with 1024 MB RAM to give Lambda dedicated high CPU and outbound network bandwidth to Ultimate Guitar.
- **Universal Handler:** Compatible with AWS Lambda Function URLs, API Gateway HTTP API v2, and API Gateway REST API v1.
- **Full CORS Support:** Includes standard CORS headers and automated OPTIONS preflight handling.

---

## Directory Structure

```
scraper-lambda/
├── src/
│   ├── types.ts           # Shared TypeScript interfaces
│   ├── scraper.ts         # Fast fetch, HTML entity decoding, and parsing routines
│   └── handler.ts         # Universal AWS Lambda handler with route matching & CORS
├── dist/
│   ├── index.mjs          # Standalone bundled ESM Lambda function (~5 KB)
│   └── function.zip       # Ready-to-upload zip package (~2.5 KB)
├── scripts/
│   ├── build.mjs          # esbuild bundling script
│   └── deploy.sh          # AWS CLI deployment helper script
├── template.yaml          # AWS SAM template
├── test-local.mjs         # Local test script
└── package.json
```

---

## Commands

```bash
# Build production bundle and zip:
npm run build

# Run local integration test:
npm run test:local
```
