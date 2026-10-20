# FitPulse Godot MCP

A small, stateless MCP server using Streamable HTTP, intended for the Custom MCP connector in Grok. It exposes a deliberately narrow set of GitHub-backed tools for the `simaklaw/forma` repository.

## Tools

- `get_project_status`: repository metadata and recent Actions runs.
- `list_animation_assets`: lists scene, script, model, and animation-related files.
- `create_animation_task`: creates a GitHub issue; it does not generate an animation.
- `run_godot_validation`: dispatches the `fitpulse_godot_validate` repository event.
- `get_validation_report`: reads recent Godot-related Actions runs.

This is not a remote Godot editor. It can inspect repository assets and start CI jobs. Interactive editor control, rendered visual QA, and APK integration require additional infrastructure.

## Deploy to Cloudflare Workers

A public HTTPS MCP endpoint cannot be hosted by a GitHub Actions workflow alone. Deploy this Worker to Cloudflare Workers (free tier may be sufficient; review current plan limits).

1. Create a Cloudflare account and Worker named `fitpulse-godot-mcp`.
2. In Cloudflare Worker settings, add secrets:
   - `MCP_BEARER_TOKEN`: generate a long random value; this protects the MCP endpoint.
   - `GITHUB_TOKEN`: a fine-grained GitHub token scoped only to `simaklaw/forma`. Grant repository metadata/contents/actions read and issues write, plus repository dispatch permission as needed by the selected token type.
3. Configure the Worker with the variables from `wrangler.toml`, then deploy this directory using Wrangler.
4. Verify `GET https://<worker-host>/health` returns `ok: true`.
5. In Grok's Custom MCP connector, use `https://<worker-host>/mcp`. If Grok asks for bearer authentication, enter the same `MCP_BEARER_TOKEN` as a bearer token. Never put the GitHub token into Grok or into the URL.

## Security

- Keep both secrets out of Git and issue text.
- Prefer a fine-grained token scoped to this repository only.
- Rotate `MCP_BEARER_TOKEN` if it is exposed.
- The server creates issues and dispatches a validation workflow only when a caller with the bearer token requests it.
- Add stricter input validation, request throttling, and origin/abuse monitoring before using this beyond a personal prototype.

## Local checks

From this directory:

```sh
npm install
npm run typecheck
npx wrangler dev
```

Set `MCP_BEARER_TOKEN` and `GITHUB_TOKEN` as local Wrangler secrets before testing protected tools. Do not commit them.

## Current limitations

- The server does not open or manipulate the Godot editor.
- The validation action only verifies project import/parsing unless extended with a specific test suite.
- It does not create 3D rigs, animate characters, render images, or build an Android APK by itself.
