import { fetchYAMLConfig } from "../config/loadYAML.js";
import { reviewPullRequest } from "../core/reviewPullRequest.js";
import { YAMLConfig, ReviewIdentifiers } from "../types/index.js";
import { postInformativeComment } from "../utils/utils.js";
import { missingConfigBody } from "../config/systemPrompts.js";

// Webhook adapter (App transport): translates a pull_request.opened payload into
// the core review pipeline. All webhook-specific knowledge lives here; the review
// logic itself lives in core/reviewPullRequest.ts.
export async function onPullRequestOpened({ octokit, payload }) {

    const owner: string = payload.repository.owner.login;
    const repo: string = payload.repository.name;
    const pullNumber: number = payload.number;
    const commitId: string = payload.pull_request.head.sha;

    console.log(`PR Opened : No.${pullNumber} from ${payload.repository.full_name}`);

    /// YAML Config Check //////////////////////////////////////////////////////////
    const yamlConfig = await fetchYAMLConfig(octokit, owner, repo);
    if (!yamlConfig) {
        console.error("Failed to load YAML config");
        await postInformativeComment(octokit, owner, repo, pullNumber, missingConfigBody);
        return;
    }

    if (!yamlConfig.model?.name) {
        console.error("YAML config is missing required 'model.name' field");
        await postInformativeComment(octokit, owner, repo, pullNumber,
            "### Invalid Configuration\n\nYour `agents.config.yaml` is missing the required `model.name` field. Please check your configuration.");
        return;
    }

    const config: YAMLConfig = yamlConfig;
    console.log("----- YAML Config -----\n", JSON.stringify(config, null, 2), "\n--------------------------------\n");
    ////////////////////////////////////////////////////////////////////////////////

    const ids: ReviewIdentifiers = { owner, repo, pullNumber, commitId };
    await reviewPullRequest(octokit, config, ids);
}
