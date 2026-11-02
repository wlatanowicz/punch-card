# Punch Card

Bootstrapped from [micro-saas-template](https://github.com/wlatanowicz/micro-saas-template) (see [origin](docs/micro-saas-template-origin.md)): **FastAPI** on **AWS Lambda** (HTTP API + **Mangum**), **SQLModel** + **Alembic** against an **existing database** (nothing provisioned in AWS for data), a **Vite + React** SPA on **S3** + **CloudFront**, and an **Expo** mobile app that shares API/i18n packages with the SPA. CI/CD uses Serverless v3, OIDC, S3 deploy, CloudFront invalidation, and optional Cloudflare DNS.

Product notes: [docs/IDEAS.md](docs/IDEAS.md).

## Layout

- `backend/` — Serverless stack, FastAPI app, Alembic migrations
- `frontend/` — React SPA (`VITE_API_BASE_URL` injected at build time)
- `mobile/` — Expo app (`EXPO_PUBLIC_API_BASE_URL`; Expo Go via `make run-mobile`)
- `packages/` — Shared TypeScript (`@micro-saas/api-client`, `@micro-saas/i18n`) used by web and mobile
- `scripts/` — Deploy frontend to S3 + invalidate CloudFront; invoke migration Lambda; optional Cloudflare CNAME updates (frontend + API); **`collect-gha-env.sh`** builds **`.env.gha`** for GitHub Actions from AWS + prompts; **`push-gha-env.sh`** uploads **`.env.gha`** to repo Actions secrets/variables via **`gh`**
- `docs/` — Product notes, GitHub Actions OIDC setup, [micro-saas-template origin](docs/micro-saas-template-origin.md) (tracked commit for future template updates), and **[downstream template tracking](docs/downstream-template-tracking.md)**

## Prerequisites

- [uv](https://docs.astral.sh/uv/) (Python toolchain and lockfile-driven installs)
- Node.js 22+ and npm (Serverless CLI + JS workspaces: frontend, mobile, shared packages)
- Python 3.11 (matches `serverless.yml` runtime; uv will install/use it via `setup-uv` in CI)
- AWS account; optional **ACM certificate in us-east-1** only if you use a **custom frontend hostname** on CloudFront; optional **ACM certificate in the deploy region** (e.g. eu-central-1) for a **custom API hostname** on API Gateway
- PostgreSQL (or compatible) URL for `DATABASE_URL` if you use the API routes that touch the DB

## First-time checklist

1. Template origin is recorded in [docs/micro-saas-template-origin.md](docs/micro-saas-template-origin.md). `service:` in `backend/serverless.yml` is `punch-card` (stack `{service}-{stage}`).
2. Optional: set **`FRONTEND_DOMAIN_NAME`** and **`FRONTEND_ACM_CERT_ARN`** (us-east-1) together when deploying. The certificate’s SAN must include that hostname; otherwise CloudFront returns an invalid CNAME error. If you omit either, the stack uses the default **\*.cloudfront.net** URL only.
3. Optional: set **`API_DOMAIN_NAME`** and **`API_ACM_CERT_ARN`** (same region as **`AWS_REGION`**, e.g. eu-central-1) together for a custom API hostname (e.g. `api.example.com`). If **`API_DOMAIN_NAME`** is unset in GitHub Actions but **`FRONTEND_DOMAIN_NAME`** is set, deploy derives **`api.<frontend-host>`**. Omit both API vars to keep the default **execute-api** URL.
4. Set **`DATABASE_URL`** for deploy (GitHub secret and/or local env). The **migration** Lambda uses it to reach your database. Lambdas run **outside a VPC** and connect over the network URL in **`DATABASE_URL`** (ensure RDS or your Postgres host allows inbound connections from the internet or your Lambda egress IPs, as appropriate).
5. Copy `frontend/.env.example` to `frontend/.env` for local web dev and set `VITE_API_BASE_URL` to your API URL (or local server). Copy `mobile/.env.example` to `mobile/.env` and set `EXPO_PUBLIC_API_BASE_URL` (use `http://127.0.0.1:8000` in the simulator, or `http://<LAN-IP>:8000` on a physical device).
6. Configure GitHub **Actions** secrets and variables (below). Grant the OIDC role **`lambda:InvokeFunction`** on the **`migrate`** function (see [docs/github-actions-aws-oidc.md](docs/github-actions-aws-oidc.md)).

## Local backend

Dependencies live in [`backend/pyproject.toml`](backend/pyproject.toml) and [`backend/uv.lock`](backend/uv.lock). Runtime deps include **Alembic** (used by the **`migrate`** Lambda). Test tooling stays in the **dev** dependency group.

**Integration tests** hit **real PostgreSQL** (same engine as production). When any integration test runs, pytest **clears** the `public` schema and applies **`alembic upgrade head`** once per run (disposable DB only). From the repo root:

```bash
make test-be            # Docker postgres:18 on TEST_DB_PORT (default 5433), then pytest
```

For CI or your own Postgres, point **`DATABASE_URL`** at a **throwaway** database and run pytest (**do not** use a shared dev DB with data you care about):

```bash
cd backend
uv sync --all-groups
export DATABASE_URL='postgresql://user:pass@host:5432/dbname'
export JWT_SECRET='your-test-secret-at-least-32-chars-long!'
uv run pytest
# Or from repo root: make test-be-ci
```

Lint and quick pytest **without Docker** (auth integration tests skip if `DATABASE_URL` is unset):

```bash
cd backend
uv run pytest
uv run ruff check src tests conftest.py
```

Run the API locally (set `DATABASE_URL` if you need routes that persist data):

```bash
cd backend
uv sync --all-groups
export DATABASE_URL='postgresql://user:pass@host:5432/dbname'   # optional for /api/items
PYTHONPATH=. uv run uvicorn src.main:app --reload --port 8000
```

## Database migrations

**Deploy workflow:** after `serverless deploy`, GitHub Actions runs **`scripts/invoke-migrate-lambda.sh`**, which invokes the **`migrate`** Lambda. That function runs **`alembic upgrade head`** programmatically (`command.upgrade`). The stack output **`MigrateLambdaName`** is the function to call.

**Local / manual:**

```bash
cd backend
uv sync --all-groups
export DATABASE_URL='postgresql://...'
uv run alembic upgrade head
```

After a successful deploy (CLI), from repo root:

```bash
bash scripts/invoke-migrate-lambda.sh prod eu-central-1
```

For a new migration after changing models:

```bash
uv run alembic revision --autogenerate -m "describe change"
```

## Local frontend

From the repo root (npm workspaces):

```bash
npm install
cd frontend
cp .env.example .env
# set VITE_API_BASE_URL=http://127.0.0.1:8000 in .env
npm run dev
```

## Local mobile (Expo)

Keep the API running (`make docker-start` or local uvicorn). Then:

```bash
npm install
cp mobile/.env.example mobile/.env
# Simulator: EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
# Physical device: EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:8000
make run-mobile
```

`make run-mobile` starts Expo with local MCP enabled (`EXPO_UNSTABLE_MCP_SERVER=1` and the `expo-mcp` dev dependency). Scan the QR code with Expo Go, or press `i` / `a` in that terminal to open the iOS Simulator or an Android emulator.

Cursor can check that running app through the Expo MCP server in `.cursor/mcp.json` (`https://mcp.expo.dev/mcp`). Sign in once with the same Expo account as `npx expo login` from `mobile/`. After the dev server starts, reconnect the Expo MCP server so the local tools load. Those tools can screenshot the simulator, find a view, and tap it. They do not start a billed EAS Simulator session. Local iOS checks need a simulator on macOS.

OAuth native redirects use URL schemes `punch-card` and `exp` (`AUTH_OAUTH_NATIVE_SCHEMES`). Google/Facebook still callback to the **API**; only the last hop (API → app) uses the native scheme.

JS verification:

```bash
make test-shared
make test-fe
make test-mobile
make typecheck
```

## Email notifications (registration & password recovery)

Verification codes are sent through the **`notifications`** app. Configure via `backend/.env.example`:

| Variable | Local dev | Production |
|----------|-----------|------------|
| `NOTIFICATIONS_TRANSPORT` | `local` (default in Docker Compose) | `ses` |
| `NOTIFICATIONS_FROM_EMAIL` | any placeholder | verified SES sender address |
| `NOTIFICATIONS_EML_DIR` | optional; default `backend/var/emails/` | n/a |

With **`NOTIFICATIONS_TRANSPORT=local`**, outgoing messages are written as **`.eml`** files under **`backend/var/emails/`** (gitignored) for manual review.

With **`NOTIFICATIONS_TRANSPORT=ses`**, the API calls **`ses:SendEmail`** (Lambda IAM includes SES permissions). Verify the sender domain or address in **Amazon SES in the deploy AWS account and region** (e.g. `eu-central-1`) before deploy. In GitHub Actions, **`NOTIFICATIONS_FROM_EMAIL`** defaults to **`noreply@<FRONTEND_DOMAIN_NAME>`** when **`FRONTEND_DOMAIN_NAME`** is set (override with the **`NOTIFICATIONS_FROM_EMAIL`** repository variable). SES identities are per-account and per-region; verifying a domain in one account does not apply to another.

## Deploy (CLI)

From `backend/` (requires AWS credentials and env vars as in CI):

```bash
npm ci
export DATABASE_URL='postgresql://...'
# Optional custom SPA hostname (set BOTH, cert must cover the hostname in us-east-1):
# export FRONTEND_ACM_CERT_ARN='arn:aws:acm:us-east-1:...:certificate/...'
# export FRONTEND_DOMAIN_NAME='app.yourdomain.com'
# Optional custom API hostname (set BOTH, cert must cover the hostname in the deploy region):
# export API_ACM_CERT_ARN='arn:aws:acm:eu-central-1:...:certificate/...'
# export API_DOMAIN_NAME='api.yourdomain.com'
npm run deploy -- --stage prod --region eu-central-1
```

**`npm run deploy`** runs **`predeploy`** (exports **`requirements-lambda.txt`**) then **`serverless deploy`**. Use **`npm run print`** from **`backend/`** to validate **`serverless.yml`**.

Then from repo root:

```bash
bash scripts/deploy-frontend.sh prod eu-central-1
bash scripts/update-cloudflare-api-cname.sh prod eu-central-1      # if Cloudflare token + zone are set
bash scripts/update-cloudflare-frontend-cname.sh prod eu-central-1   # if Cloudflare token + zone are set
```

Scripts accept an optional third argument: **CloudFormation stack name** (default `{service}-{stage}` from `backend/serverless.yml`).

## GitHub Actions

### `CI` (`.github/workflows/ci.yml`)

Runs on every push and pull request: **uv** (`uv sync`, tests, Ruff), exports `requirements-lambda.txt`, Serverless `print` on **`serverless.yml`**, JS workspace install, shared package tests, frontend unit tests, frontend build, mobile unit tests, mobile typecheck.

### `Mobile Android test` (`.github/workflows/mobile-android-test.yml`)

Builds an installable Android test APK when you run the workflow manually (`workflow_dispatch`). It does not run on push. The APK is uploaded as the **`android-test-apk`** artifact (90 days). It is a release build signed with the Expo debug keystore (`android` / `androiddebugkey`), so it can be sideloaded. That signature is not a Play App Signing key.

`EXPO_PUBLIC_API_BASE_URL` is baked in at build time, in this order: the manual **`api_base_url`** input, the **`EXPO_PUBLIC_API_BASE_URL`** repository variable, `https://` plus **`API_DOMAIN_NAME`**, then `https://api.<FRONTEND_DOMAIN_NAME>`. The job fails when none of those is set. `android.versionCode` comes from the GitHub run number so a newer APK can replace the previous install.

### `Mobile EAS build` (`.github/workflows/mobile-eas-build.yml`)

Disabled (`if: false`). The job would run `eas build --platform android --profile preview` for an internal APK. It does not run until `if: false` is removed. To turn it on:

1. Remove `if: false` from the job.
2. Add the **`EXPO_TOKEN`** secret.
3. Run `eas init` in `mobile/` and commit that app’s `extra.eas.projectId`. Project ids are per Expo project, so do not copy one from another repo.
4. Store **`EXPO_PUBLIC_API_BASE_URL`** as an EAS environment variable for the preview profile. GitHub Actions environment variables are not forwarded to the EAS build worker.
5. Generate Android credentials once with `eas credentials`. The command stays `--platform android`.

### `Mobile iOS device` (`.github/workflows/mobile-ios-device.yml`)

Disabled (`if: false`). The job would archive a signed ad hoc IPA for a physical iPhone and upload it as **`ios-device-ipa`**. It is not a TestFlight or App Store upload. The IPA installs only on devices whose UDIDs are in the provisioning profile, and that profile’s App ID must match `ios.bundleIdentifier` (`com.latanowicz.punchcard.app`). To turn it on:

1. Remove `if: false` from the job.
2. Enroll in the Apple Developer Program and register the test device.
3. Add these secrets: **`IOS_DISTRIBUTION_CERTIFICATE_BASE64`** (Apple distribution `.p12`, base64-encoded), **`IOS_DISTRIBUTION_CERTIFICATE_PASSWORD`**, **`IOS_PROVISIONING_PROFILE_BASE64`** (ad hoc `.mobileprovision`, base64-encoded), and **`IOS_TEAM_ID`**.

Do not commit the certificate or the provisioning profile.

### `Deploy` (`.github/workflows/deploy.yml`)

Runs on pushes to `main` and on `workflow_dispatch`: deploy backend → **run migrations Lambda** → optional Cloudflare API DNS → deploy frontend → optional Cloudflare frontend DNS.

| Type | Name | Purpose |
|------|------|---------|
| Secret | `AWS_ROLE_TO_ASSUME` | IAM role ARN for OIDC (`sts:AssumeRoleWithWebIdentity` from GitHub) |
| Secret | `DATABASE_URL` | Passed to Lambdas (`api`, **`migrate`**). Required for migration step if the database should be updated on deploy. |
| Secret | `FRONTEND_ACM_CERT_ARN` | Optional; ACM cert ARN (us-east-1). Required with `FRONTEND_DOMAIN_NAME` if you use a custom SPA domain. |
| Secret | `API_ACM_CERT_ARN` | Optional; ACM cert ARN (deploy region, e.g. eu-central-1). Required with `API_DOMAIN_NAME` (or derived `api.<frontend-host>`) for a custom API domain. |
| Variable | `AWS_REGION` | Optional; default `eu-central-1` |
| Variable | `FRONTEND_DOMAIN_NAME` | Optional; custom SPA hostname. Use with `FRONTEND_ACM_CERT_ARN`; leave unset for default CloudFront URL only. |
| Variable | `API_DOMAIN_NAME` | Optional; custom API hostname (e.g. `api.example.com`). When unset but `FRONTEND_DOMAIN_NAME` is set, deploy uses `api.<frontend-host>`. |
| Variable | `NOTIFICATIONS_FROM_EMAIL` | Optional; verified SES sender (e.g. `noreply@example.com`). When unset but `FRONTEND_DOMAIN_NAME` is set, deploy uses `noreply@<frontend-host>`. |
| Secret | `CLOUDFLARE_API_TOKEN` | Optional; DNS:Edit for zone |
| Secret | `CLOUDFLARE_ZONE_ID` | Optional; or use `CLOUDFLARE_ZONE_NAME` |
| Secret | `CLOUDFLARE_ZONE_NAME` | Optional; e.g. `example.com` |

OIDC trust and IAM permissions for deploy are documented in **[docs/github-actions-aws-oidc.md](docs/github-actions-aws-oidc.md)**.

### Bootstrap GitHub secrets from AWS

With credentials available (e.g. **`AWS_PROFILE`**), run:

```bash
AWS_PROFILE=your-profile ./scripts/collect-gha-env.sh
```

The script prints **`sts get-caller-identity`**, lists **RDS** instances in the configured region (endpoint, identifier) and **ISSUED ACM** certs in **us-east-1** (CloudFront) and the **deploy region** (API Gateway), and prompts for **database name**, **password**, **OIDC role ARN**, optional **frontend** / **API** domains / **Cloudflare** values. When you build **`DATABASE_URL`** from an RDS instance, it uses the instance endpoint and your password. It writes **`.env.gha`** at the repo root (gitignored) with **`shlex`-safe** quoting. If **`.env.gha` already exists**, its values are loaded first and used as defaults (press **Enter** to keep each field, **`k`** to keep **DATABASE_URL** / ACM). Use **`./scripts/collect-gha-env.sh -n`** to print the file to stdout only.

Requires **AWS CLI**, **jq**, and **Python 3**. The generated **`.env.gha`** uses **`# --- Secrets ---`** and **`# --- Variables ---`** section headers; **`push-gha-env.sh`** uploads every non-empty line under each block to GitHub **secrets** or **variables**. Run **`./scripts/push-gha-env.sh`** (needs **`gh`** and **Python 3**; **`gh`** with **repo** scope). Use **`./scripts/push-gha-env.sh -n`** first to preview. The **master password** and **OIDC role ARN** are always prompted (not returned by AWS APIs).

Optional custom CloudFront hostname is controlled by **`FRONTEND_DOMAIN_NAME`** and **`FRONTEND_ACM_CERT_ARN`** (both required together). Optional custom API Gateway hostname uses **`API_DOMAIN_NAME`** and **`API_ACM_CERT_ARN`** in the deploy region; GitHub Actions derives **`api.<frontend-host>`** when only the frontend hostname is set.

## Lambda packaging notes

- **uv** produces `backend/requirements-lambda.txt` for **`serverless-python-requirements`** (`uv export --frozen --no-dev --no-emit-project --no-hashes`). That file is gitignored; CI and `npm run predeploy` create it before deploy. **`package.individually: true`**: the **`api`** function excludes `alembic/` and **`migrate_handler.py`**; the **`migrate`** function ships `alembic/` + `alembic.ini` plus app models. Both bundles still include shared runtime wheels (including Alembic) from the same export.
- `serverless-python-requirements` bundles those dependencies; `slim: true` keeps the zip smaller. On macOS, `dockerizePip: non-linux` uses Docker for Linux-compatible wheels when needed.
- Lambda runtime already includes `boto3`; it is listed under `noDeploy` to avoid duplication.

After changing Python dependencies, run **`uv lock`** in `backend/` and commit the updated **`uv.lock`**.

GitHub Actions installs **Python via `actions/setup-python`** before **`setup-uv`**, because **`serverless-python-requirements`** shells out to **`python3.11 -m pip`**, and uv’s standalone interpreters may not ship with the `pip` module.

## License

Use freely for your own products; add a license file if you open-source the template.
