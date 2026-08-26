# Cloud Deployment Guide

Mako-AI is a Node.js web service that builds its React client and Express/tRPC server into one deployable process. The included `Dockerfile` builds both parts and starts `dist/index.js`; use it for Docker-compatible cloud platforms.

## Prerequisites

Apply `mako-ai-marokecho-web-release.patch` before deployment so the root source files such as `package.json`, `client/`, and `server/` exist. Confirm the production build locally before connecting a cloud provider:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

## Required environment variables

Configure the following variables in the hosting provider dashboard. Do not commit values to Git or create a production `.env` file.

| Variable | Required | Notes |
|---|---:|---|
| `NODE_ENV` | Yes | Set to `production`. |
| `BUILT_IN_FORGE_API_URL` | Yes for chat | Server-side model gateway base URL. |
| `BUILT_IN_FORGE_API_KEY` | Yes for chat | Server-side model gateway credential. |
| `JWT_SECRET` | Yes when authentication is used | Use a long, randomly generated value. |
| `DATABASE_URL` | Optional | Needed only for persistent user and workspace data. |
| `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL` | Optional | Required only when enabling OAuth. |

The application listens on the platform-provided `PORT` value. Do not set a fixed port unless the platform specifically requires one.

## GitHub Actions and GitHub Container Registry

The repository includes two workflows under `.github/workflows/`. `ci.yml` runs on pushes and pull requests to `main`, performs dependency installation, TypeScript checks, Vitest tests, the production bundle, and a Docker image build. `publish-image.yml` publishes a Docker image to GitHub Container Registry only when a version tag matching `v*.*.*` is pushed or when it is started manually from the Actions tab. It uses the built-in `GITHUB_TOKEN`; no model or database secret is stored in the repository.

To publish an image, create a release tag locally and push it:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The image is published as `ghcr.io/abdelatizarzori3-sys/mako-ai`. Configure its package visibility in GitHub according to your deployment needs, then deploy that image on any OCI-compatible platform. The application still needs its runtime environment variables, especially `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, and `JWT_SECRET`.

### GitHub Pages limitation

GitHub Pages serves the static Vite frontend only. It does not run the Express/tRPC server, protect server-side model credentials, process voice transcription, or provide the `/api/trpc` endpoints. Use the Manus deployment or an OCI-compatible Docker host for live chat, structured task handling, and voice transcription. The Pages URL is useful as a static UI preview; configure the production API origin through a server-aware deployment rather than exposing secrets in browser code.

## Docker-compatible platforms

Build and run the image locally for a pre-deployment smoke test:

```bash
docker build -t mako-ai .
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e BUILT_IN_FORGE_API_URL="https://your-model-gateway.example" \
  -e BUILT_IN_FORGE_API_KEY="replace-me" \
  -e JWT_SECRET="replace-with-a-long-random-value" \
  mako-ai
```

Verify the service after it starts:

```bash
curl http://localhost:3000/healthz
```

Expected response:

```json
{"ok":true,"service":"mako-ai"}
```

## Railway

Railway detects the root `Dockerfile`. The included `railway.toml` defines Dockerfile builds, `/healthz` monitoring, and restart behavior. Create a service from this repository, set the required variables in Railway, and deploy the `main` branch.

## Render

The root `render.yaml` defines a Docker web service named `mako-ai`. Create a Blueprint from the repository, provide the two `BUILT_IN_FORGE_*` values when prompted, and deploy. Render uses `/healthz` to check service readiness.

## Operational checks

After every cloud deployment, confirm that the application home page loads and that the health endpoint responds with HTTP 200. Then send one test message in the UI and inspect the service logs if the response is unavailable.

## Security checklist

- Keep model gateway credentials and `JWT_SECRET` in the provider secret manager.
- Do not expose `BUILT_IN_FORGE_API_KEY` as a `VITE_*` variable.
- Enable HTTPS and assign a custom domain only after the health check is stable.
- Configure database backups before enabling persistent production data.
