# Deployment Guide (GitHub Action)

GitAgents runs as a GitHub Action — there is no server to host. You add it to a
workflow in your repository, provide your model API key(s) as secrets, and it
reviews pull requests automatically.

## Prerequisites

- A GitHub repository where you can add workflows and secrets.
- An API key from **OpenAI** and/or **Anthropic**, depending on which models you
  configure:
  - OpenAI: https://developers.openai.com/api/docs/quickstart/
  - Anthropic: https://platform.claude.com/
- An `agents.config.yaml` file in the root of your repository (see below).

You do **not** need to register a GitHub App, run a server, expose a webhook, or
manage a private key. Those were requirements of the old App distribution and no
longer apply.

## 1. Add secrets

In your repository: **Settings → Secrets and variables → Actions → New repository
secret**. Add the keys for the providers you use:

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`

## 2. Add the YAML configuration

Create `agents.config.yaml` in the root of your repository:

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

The `model.name` field is required. The config is read from the checked-out
workspace first (so it respects changes in the PR head); if it isn't present on
disk, the action falls back to fetching it from the repo's default branch.

## 3. Add the workflow

Create `.github/workflows/ai-review.yml`:

```yaml
name: AI Review
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

The review runs when a PR is opened or reopened. Pushing new commits fires the
`synchronize` event, which the action skips — it won't re-read the files or post
another review. To avoid even starting a runner on each push, restrict the
trigger: `on: pull_request: types: [opened, reopened]`.

### Required permissions

The job must grant:

```yaml
permissions:
  pull-requests: write   # post the review
  contents: read         # read the changed files
```

If your repository or organization defaults to read-only `GITHUB_TOKEN`
permissions, add the block above to the workflow (or job) explicitly.

## 4. Verify

Open a pull request. The workflow should run and the agents should post a review
on the PR within a minute or two. Check the **Actions** tab for logs if nothing
appears.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `github-token` | no | `${{ github.token }}` | Token used to read PR files and post the review. |
| `config-path` | no | `agents.config.yaml` | Path to the config file in the checked-out repo. |

## Security: `pull_request` vs `pull_request_target`

- **`pull_request`** (recommended): runs with a read-only token for fork PRs and
  has no access to your secrets from forks. Safest default.
- **`pull_request_target`**: runs in the context of the base repository with
  access to secrets, even for fork PRs. Only use this if you understand the
  risks — a malicious fork can attempt to exfiltrate secrets. If you use it,
  never check out and execute untrusted PR code in the same job.

## Fork pull requests

For PRs opened from forks under `pull_request`, the `GITHUB_TOKEN` is read-only,
so the review post will fail. Restrict the workflow to same-repo PRs:

```yaml
jobs:
  review:
    if: github.event.pull_request.head.repo.full_name == github.repository
```

…or accept that fork PRs will not be reviewed.

## Troubleshooting

- **No review appears / `HTTP 403` when posting:** the job is missing
  `pull-requests: write`, or it's a fork PR with a read-only token.
- **"Missing YAML config" comment:** there is no valid `agents.config.yaml` in
  the repo root (or at `config-path`). Add one (see above).
- **"Invalid Configuration" comment:** the config is missing the required
  `model.name` field.
- **Auth errors from the model provider:** the relevant `ANTHROPIC_API_KEY` /
  `OPENAI_API_KEY` secret is missing or wrong, or not passed via `env:`.
