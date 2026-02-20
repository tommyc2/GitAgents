import { openAIClient } from "../config/config.js";
import { dependencyReviewPrompt } from "../config/systemPrompts.js";

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

export async function generateDependencyReview(owner: string, repo: string, pullNumber: number, commitId: string, manifestFileData: any[]) {
    const gptResponse = await openAIClient.responses.create({
        model: 'gpt-5.2-codex', // TODO: hardcoded for now, will change later to opus etc
        input: dependencyReviewPrompt(owner, repo, pullNumber, commitId, manifestFileData)
    });

    return JSON.parse(gptResponse.output_text) as DependencyReviewResponse;
}