# FitPulse Godot MCP

A small, stateless MCP server using Streamable HTTP, intended for the Custom MCP connector in Grok. It exposes a narrow set of GitHub-backed tools for the `simaklaw/forma` repository.

## Tools

- `get_project_status`: repository metadata and recent Actions runs.
- `list_animation_assets`: lists scene, script, model, and animation-related files.
- `create_animation_task`: creates a GitHub issue; it does not generate an animation.
- `run_godot_validation`: dispatches the `fitpulse_godot_validate` repository event.
- `get_validation_report`: reads recent Godot-related Actions runs.

This is not a remote Godot editor. It can inspect repository assets and start CI jobs. Interactive editor control, rendered visual QA, and APK integration require additional infrastructure.

## Deployment setup

A GitHub Actions workflow cannot itself act as a continuously available public MCP endpoint. This Worker is designed to deploy to Cloudflare Workers. The first deployment still requires the account owner to authorize hosting and provide secrets; those credentials cannot be obtained from the GitHub connector.

1. Create/sign in to Cloudflare and activate Workers for your account.
2. Create a scoped Cloudflare API token with permission to edit Workers, and copy the Cloudflare account ID.
3. Create a fine-grained GitHub token scoped only to `simaklaw/forma`. Grant repository metadata read, contents write (needed for repository dispatch), issues write, and Actions read.
4. In GitHub `simaklaw/forma` → Settings → Secrets and variables → Actions, add these repository secrets:
   - `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID.
   - `CLOUDFLARE_API_TOKEN`: Cloudflare API token.
   - `FITPULSE_GITHUB_TOKEN`: the fine-grained GitHub token from step 3.
   - `MCP_BEARER_TOKEN`: a long random secret that will protect the MCP endpoint. Use a password manager to generate it.
5. Merge the deployment workflow to `main`, then run **Deploy FitPulse MCP** from Actions (or push a later change under `tools/fitpulse-mcp/`). The workflow type-checks the code, updates the Worker secrets, and deploys it.
6. In Cloudflare, find the deployed Worker URL. Verify `GET https://<worker-host>/health` returns `ok: true`.
7. In Grok's Custom MCP connector, enter `https://<worker-host>/mcp`. If Grok asks for bearer authentication, enter the same `MCP_BEARER_TOKEN`. Never put the GitHub token in Grok or in the URL.

The Worker name in `wrangler.toml` is `fitpulse-godot-mcp`. A default `workers.dev` hostname must be enabled on the Cloudflare account.

## Security

- Never commit either token or place them in issue text.
- Keep the GitHub token restricted to this repository and rotate it if exposed.
- The server creates issues and dispatches a validation workflow only when a caller with the bearer token requests it.
- This is a personal prototype; add request throttling and abuse monitoring before broader use.

## Local checks

From this directory:

```sh
npm install
npm run typecheck
npx wrangler dev
```

Do not commit local secrets.

## Current limitations

- The server does not open or manipulate the Godot editor.
- The validation action verifies project import/parsing only; it does not certify visual quality, biomechanics, or runtime behavior.
- It does not create 3D rigs, animate characters, render images, or build an Android APK by itself.
