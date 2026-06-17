import { readFileSync } from "fs";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { reviewPullRequest } from "../core/reviewPullRequest.js";
import { fetchYAMLConfig } from "../config/loadYAML.js";
import { parseYAML, postInformativeComment } from "../utils/utils.js";
import { missingConfigBody } from "../config/systemPrompts.js";
import { YAMLConfig, ReviewIdentifiers } from "../types/index.js";

// GitHub Action entrypoint. Reads the pull_request event from the runner, loads
// the YAML config (disk-first from the checked-out workspace, API fallback), and
// runs the transport-agnostic core review pipeline with the Action's GITHUB_TOKEN.
async function run(): Promise<void> {
    try {
        const { payload } = github.context;

        const pr = payload.pull_request;
        if (!pr) {
            core.info("Not a pull_request event; nothing to review.");
            return;
        }

        // Loop guard: ignore events triggered by a bot (e.g. our own review re-runs).
        const sender = payload.sender;
        if (sender?.type === "Bot") {
            core.info(`Skipping event triggered by bot: ${sender['login']}`);
            return;
        }

        const action = payload.action;
        if (action === "synchronize") {
            core.info(`Skipping '${action}' event (new commits); the PR was already reviewed on open.`);
            return;
        }

        const repository = payload.repository;
        if (!repository) {
            core.setFailed("Event payload is missing repository information.");
            return;
        }

        const token = core.getInput("github-token", { required: true });
        const configPath = core.getInput("config-path") || "agents.config.yaml";
        const octokit = github.getOctokit(token);

        const owner: string = repository.owner.login;
        const repo: string = repository.name;
        const pullNumber: number = pr.number;
        const commitId: string = pr['head'].sha;

        core.info(`Reviewing PR #${pullNumber} in ${owner}/${repo} @ ${commitId}`);

        // Config: prefer the checked-out workspace; fall back to the repo via the API.
        let config: YAMLConfig | null = null;
        try {
            config = parseYAML(readFileSync(configPath, "utf8")) as YAMLConfig;
            core.info(`Loaded config from ${configPath}`);
        } catch (err) {
            if (err && (err as NodeJS.ErrnoException).code === "ENOENT") {
                core.info(`No ${configPath} in workspace; fetching from the repo default branch.`);
                config = await fetchYAMLConfig(octokit, owner, repo);
            } else {
                throw err;
            }
        }

        if (!config) {
            core.warning("Failed to load YAML config.");
            await postInformativeComment(octokit, owner, repo, pullNumber, missingConfigBody);
            return;
        }

        if (!config.model?.name) {
            core.warning("YAML config is missing the required 'model.name' field.");
            await postInformativeComment(
                octokit, owner, repo, pullNumber,
                "### Invalid Configuration\n\nYour `agents.config.yaml` is missing the required `model.name` field. Please check your configuration."
            );
            return;
        }

        const ids: ReviewIdentifiers = { owner, repo, pullNumber, commitId };
        await reviewPullRequest(octokit, config, ids);

        core.info("Review complete.");
    } catch (err) {
        core.setFailed(err instanceof Error ? err.message : String(err));
    }
}

// Force-exit once run() settles: idle keep-alive sockets in the SDK/octokit HTTP
// pools keep the event loop open, leaving the Action step running until timeout.
// process.exit() honors process.exitCode, so core.setFailed failures stay non-zero.
run().finally(() => {
    process.exit();
});
