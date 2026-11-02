# micro-saas-template origin

This project was bootstrapped from [micro-saas-template](https://github.com/wlatanowicz/micro-saas-template).

| Field | Value |
|-------|-------|
| Template repository | `git@github.com:wlatanowicz/micro-saas-template.git` |
| Commit (bootstrap) | `46dc7932451aa3e2cd3ae0235eb447bd6cd94f0f` |
| Commit date | 2026-11-01 |
| Commit message | `Enhance Makefile and CI configuration for frontend and mobile testing` |
| Applied to this repo | 2026-11-02 |

## Applying future template updates

1. In a clone of `micro-saas-template`, inspect changes since the bootstrap commit:

   ```bash
   git log 46dc7932451aa3e2cd3ae0235eb447bd6cd94f0f..HEAD --oneline
   git diff 46dc7932451aa3e2cd3ae0235eb447bd6cd94f0f..HEAD
   ```

2. Cherry-pick or manually port relevant changes into this repo. Skip product-specific files (e.g. product docs, i18n product strings, `serverless.yml` `service:` name). This repo uses `punch-card` for the Serverless service, npm workspace names, Expo slug/scheme (`com.latanowicz.punchcard.app`), and the local Postgres database name `punch_card`. Shared packages stay `@micro-saas/api-client` and `@micro-saas/i18n`.

3. After merging template changes, update the **Commit (bootstrap)** row above to the new baseline commit and set **Applied to this repo** to today's date.
