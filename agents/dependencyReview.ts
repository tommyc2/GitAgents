import { callModel } from "./callModel.js";
import { dependencyReviewPrompt } from "../config/systemPrompts.js";
import { YAMLConfig } from "../handlers/onPullRequestOpened.js";

interface DependencyReviewResponse {
    owner: string;
    repo: string;
    pull_number: number;
    commit_id: string;
    body: string;
    event: "COMMENT";
    headers: {
        "X-GitHub-Api-Version": string;
    };
}

export async function generateDependencyReview(
    config: YAMLConfig,
    owner: string,
    repo: string,
    pullNumber: number,
    commitId: string,
    manifestFileData: any[],
    availableTools: string,
    messages: any[]
) {
    const systemPrompt = dependencyReviewPrompt(owner, repo, pullNumber, commitId, manifestFileData, availableTools);
    return callModel(config, systemPrompt, messages) as Promise<DependencyReviewResponse | null>;
}
