<img width="200" height="200" alt="logo" src="https://github.com/user-attachments/assets/31d42525-f61c-4b5e-bc2a-760f179354b4" />

# GitAgents - A Multi-Agent Repository Management Tool
*Developed by Tommy Condon*

Git Agents is a GitHub App that uses AI agents to review your pull requests. When a PR is opened, the app can execute a Code Review Agent and (optionally) a Dependency Review Agent, passing the results through a Feedback Agent before posting the final review on GitHub.

It supports both OpenAI and Anthropic (Claude) models. You can configure which model to use and how the agents behave through a YAML config file in your repository.

## How It Works

1. Pull Request gets opened on GitHub
2. GitHub sends webhook with payload to GitHub App Server (running in index.ts)
3. Hits `onPullRequestOpened` handler in `handlers/` (which calls onManifestChange.ts if there is a dependency file modified"). This could change in the future.
4. Feedback Agent is called after an initial review by the Code Reviewing Agent/Dependency Agent is complete.
5. PR comment is posted on PR with feedback.

## Project Structure

```
.
├── index.ts
├── package.json
├── package-lock.json
├── tsconfig.json
├── .env
├── .babelrc
├── .eslintrc.cjs
│
├── agents/
│   ├── runAgent.ts
│   ├── callModel.ts
│   ├── codeReview.ts
│   ├── dependencyReview.ts
│   ├── feedbackAgent.ts
│   └── toolHandlers.ts
│
├── handlers/
│   ├── onPullRequestOpened.ts
│   └── onManifestChange.ts
│
├── config/
│   ├── config.ts
│   ├── systemPrompts.ts
│   ├── loadYAML.ts
│   └── loadToolMap.ts
│
├── types/
│   └── index.ts
│
├── utils/
│   └── utils.ts
│
├── .github/ # Optional
│   └── workflows/
│       └── ci-checks.yml
│
└── docs/
```

### Code Review Agent

- Location: `agents/codeReview.ts`
- Reviews all changed files in a pull request.
- Every time a pull request is opened, the `onPullRequestOpened` handler fetches the changed files and passes them to this agent.

### Dependency Review Agent

- Location: `agents/dependencyReview.ts`
- Checks manifest files (e.g. `package.json`, `pom.xml`, `go.mod`) for dependency version conflicts or breaking changes.
- Triggered only when the files listed in `dependency_review.manifest_files` in the user's YAML config (in their repo) are modified.`dependency_review.enabled` must also be `true`.

### Feedback Agent

- Location: `agents/feedbackAgent.ts`
- Acts as a second opinion. It takes the primary agent's review and verifies it for accuracy, catches false positives, and adds anything the primary agent missed (e.g., cosmetic bugs, missed critical bugs etc).
- Automatically runs after both the Code Review Agent and the Dependency Review Agent (if enabled in the YAML config).

### Tool Calls

Agents can request tools to gather more information before completing their review. Currently available:

| Tool | Description |
|------|-------------|
| `search_codebase` | Searches the repository's code via the GitHub Search API and returns the first matching file's content. |

New tools can be added by creating a handler function in `toolHandlers.ts` and registering it in `loadToolMap.ts`.

```typescript
const tools: [string, ToolHandler][] = [
    ["search_codebase", searchCodebaseTool]
];
```

