# GitLab Tools

Internal tools for a self-hosted GitLab. The first tool loads human review comments from merge requests: inline diff notes, suggestions, and general discussion. System notes such as assignments and pushes are left out.

The default project is [emax-web-v2](http://gitlab.corp.mabnadp.com/mabna/emax-web-v2).

## Setup

Requires Node.js 20 or newer.

```powershell
cd D:\Projects\Gitlab-tools
copy .env.example .env
```

Create a GitLab personal, project, or group access token with the `read_api` scope (`Preferences → Access Tokens`), then set it in `.env`:

```
GITLAB_TOKEN=your-token
```

```powershell
npm install
npm run dev
```

Open http://localhost:5173. The API listens on http://127.0.0.1:3001.

The token is read only by the API server. The browser talks to `/api` and never sees it.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API and web app with reload |
| `npm test` | Mapper and config checks |
| `npm run typecheck` | Typecheck shared, server, and client |
| `npm run build` | Production web build |
| `npm start` | API only. Serves `client/dist` when a build exists |

## Configuration

`config/default.json` holds the GitLab host and projects. Secrets stay in `.env`.

```json
{
  "id": "emax-web-v2",
  "path": "mabna/emax-web-v2",
  "url": "http://gitlab.corp.mabnadp.com/mabna/emax-web-v2",
  "default": true
}
```

Add another object to `gitlab.projects` to expose it in the project switcher. Exactly one project should have `"default": true`.

`gitlab.maxMergeRequests` caps how many merge requests the list loads. `gitlab.maxCollectIds` caps how many merge requests are read in one collect request. The web app chunks larger lists.

Optional environment overrides: `PORT`, `HOST`, `GITLAB_BASE_URL`, `CLIENT_ORIGIN`.

## Using review comments

- The list defaults to open merge requests. Switch to merged, closed, or all.
- Select a merge request to load its comments.
- **Load comments for N merge requests** walks the merge requests currently shown, including an active text filter.
- Filter comments by text, inline or discussion, resolution, author, and file.
- Export the visible comments as JSON or CSV.

GitLab responses are cached in memory for `cache.ttlSeconds` (default 60). Refresh bypasses the cache.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness |
| `GET` | `/api/settings` | Public config, including whether a token is set |
| `GET` | `/api/projects/:projectKey` | Live GitLab project |
| `GET` | `/api/projects/:projectKey/merge-requests?state=opened` | Merge request list |
| `GET` | `/api/projects/:projectKey/merge-requests/:iid/comments` | Review threads for one merge request |
| `POST` | `/api/projects/:projectKey/review-comments` | Body `{ "iids": [1, 2], "refresh": false }` |

Add `?refresh=true` on GET routes to bypass the cache.

## Project layout

```
config/default.json          GitLab host and projects
shared/src                   API types used by the server and the web app
server/src/infrastructure    Config, cache, and the GitLab client
server/src/modules           One folder per tool
client/src                   React UI
```

## Adding a tool

1. Create `server/src/modules/<tool>/` with a router and a service.
2. Mount the router in `server/src/modules/register.ts`.
3. Put response types that the UI needs in `shared/src/index.ts`.
4. Add a screen under `client/src` that calls `/api`.

The GitLab client in `server/src/infrastructure/gitlab/client.ts` is shared. Pass a configured project from `config/default.json`; do not hard-code a project path in a module.
