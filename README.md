# GitAgents — Multi-Agent AI Code Review (GitHub Action)

GitAgents is a GitHub Action that uses AI agents to review your pull requests. On each PR it runs a Code Review Agent and (optionally) a Dependency Review Agent, then passes their output through a Feedback Agent before posting the final review on the PR.

It supports both OpenAI and Anthropic (Claude) models. You choose the model and how the agents behave through a YAML config file in your repository.

## Quick Start

1. **Add your model API key(s)** to your repository secrets (Settings → Secrets and variables → Actions): `ANTHROPIC_API_KEY` and/or `OPENAI_API_KEY`.
2. **Add `agents.config.yaml`** to the root of your repository (see [Configuration](#configuration)).
3. **Add a workflow** at `.github/workflows/gitagents.yml`:

```yaml
name: GitAgents Code Review
on:
  pull_request:
    branches: [main]
permissions:
  pull-requests: write
  contents: read
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { ref: ${{ github.event.pull_request.head.sha }} }
      - uses: tommyc2/gitagents@v1
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

> Model API keys are passed via `env:` (the agents read them from the process environment). The GitHub token is supplied automatically through the default `github-token` input.

## Inputs


| Input          | Required | Default               | Description                                      |
| -------------- | -------- | --------------------- | ------------------------------------------------ |
| `github-token` | no       | `${{ github.token }}` | Token used to read PR files and post the review. |
| `config-path`  | no       | `agents.config.yaml`  | Path to the config file in the checked-out repo. |


## Environment variables


| Variable            | Required                    | Description                 |
| ------------------- | --------------------------- | --------------------------- |
| `ANTHROPIC_API_KEY` | when using Anthropic models | Anthropic (Claude) API key. |
| `OPENAI_API_KEY`    | when using OpenAI models    | OpenAI API key.             |


## Permissions

The job must grant the action enough scope to read the git diff and post the review:

```yaml
permissions:
  pull-requests: write   # post the review
  contents: read         # read the changed files
```

## How It Works

1. A pull request is opened and your workflow triggers on `pull_request`.
2. The action reads the event payload, builds an authenticated Octokit from `github-token`, and loads `agents.config.yaml` from the checked-out workspace (falling back to the repo's default branch via the API if it isn't present on disk).
3. The changed files are fetched **at the PR head commit** so the review reflects exactly what's proposed.
4. The Code Review Agent reviews the changed files. If dependency review is enabled and a configured manifest file changed, the Dependency Review Agent also runs.
5. The Feedback Agent verifies and refines the result (catching false positives and anything missed).
6. The final review is posted on the pull request.

## Configuration

GitAgents reads an `agents.config.yaml` from the root of your repository:

```yaml
project:
  name: "my-repo"
  description: "Brief description of the repository"

global_config:
  language: "en"

model:
  provider: "openai"
  name: "gpt-5.2-codex"
  max_tokens: 4096
  temperature: 0.2

code_review:
  tone: "concise" # "constructive", "strict", "concise", "educational"
  focus:
    - "correctness"
    - "security"
  ignore_patterns:
    - "*.min.js"
    - "dist/**"

dependency_review:
  enabled: true
  manifest_files:
    - "package-lock.json"
    - "package.json"
    # - "pom.xml"
    # - "go.mod"
    # - "requirements.txt"
  risk_tolerance: "medium" # "low", "medium", "high"

feedback:
  enabled: true
  model:
    provider: "anthropic"
    name: "claude-sonnet-4-6"
    max_tokens: 4096
    temperature: 0.1
```

The `model.name` field is required. If the config is missing or invalid, the action posts a comment on the PR explaining how to fix it.

## Project Structure

```
.
├── action.yml              # Action metadata (inputs, branding, entrypoint)
├── action/
│   └── main.ts             # Action entrypoint
├── core/                   # Transport-agnostic review pipeline
│   ├── reviewPullRequest.ts
│   ├── loadPullRequestFiles.ts
│   └── runManifestReview.ts
├── agents/
│   ├── runAgent.ts
│   ├── callModel.ts
│   ├── codeReview.ts
│   ├── dependencyReview.ts
│   ├── feedbackAgent.ts
│   └── toolHandlers.ts
├── config/
│   ├── config.ts
│   ├── systemPrompts.ts
│   ├── loadYAML.ts
│   └── loadToolMap.ts
├── types/
│   └── index.ts
├── utils/
│   └── utils.ts
├── dist/
│   └── action/index.js     # Bundled action (committed; built with ncc)
└── docs/
```

### Code Review Agent

- Location: `agents/codeReview.ts`
- Reviews all changed files in a pull request.

### Dependency Review Agent

- Location: `agents/dependencyReview.ts`
- Checks manifest files (e.g. `package.json`, `pom.xml`, `go.mod`) for dependency version conflicts or breaking changes.
- Triggered only when files listed in `dependency_review.manifest_files` are modified, and `dependency_review.enabled` is `true`.

### Feedback Agent

- Location: `agents/feedbackAgent.ts`
- Acts as a second opinion: it takes the primary agent's review, verifies it for accuracy, catches false positives, and adds anything the primary agent missed.
- Runs automatically after the Code Review Agent and the Dependency Review Agent (if enabled).

### Tool Calls

Agents can request tools to gather more information before completing their review. Currently available:


| Tool              | Description                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| `search_codebase` | Searches the repository's code via the GitHub Search API and returns the first matching file's content. |


New tools can be added by creating a handler function in `toolHandlers.ts` and registering it in `loadToolMap.ts`.

```typescript
const tools: [string, ToolHandler][] = [
    ["search_codebase", searchCodebaseTool]
];
```

## Fork pull requests

For PRs opened from forks, the default `GITHUB_TOKEN` is read-only, so posting the review will fail. Either restrict the workflow to same-repo PRs:

```yaml
jobs:
  review:
    if: github.event.pull_request.head.repo.full_name == github.repository
```

…or accept that fork PRs won't be reviewed.

## Development

- `npm run code-quality` — typecheck (`tsc --noEmit`)
- `npm run lint` — lint
- `npm run build:action` — bundle the action into `dist/action/index.js` (this artifact is committed and must be rebuilt whenever source under `action/`, `core/`, `agents/`, `config/`, `utils/`, or `types/` changes)

See `[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)` for the full setup guide.