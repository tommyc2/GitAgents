import { callModel } from "./callModel.js";
import { codeReviewPrompt } from "../config/systemPrompts.js";
import { YAMLConfig } from "../handlers/onPullRequestOpened.js";

export interface RequestToolResponse {
    type: "request_tool";
    tool: string;
    args?: any;
}
export interface ReviewComment {
    path: string;
    line: number;
    side: "LEFT" | "RIGHT";
    body: string;
}

export interface FinalReviewResponse {
    type: "final_review";
    content: {
        owner: string;
        repo: string;
        pull_number: number;
        commit_id: string;
        body: string;
        event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT";
        comments: ReviewComment[];
        headers: {
            "X-GitHub-Api-Version": string;
        };
    };
}

export type CodeReviewResponse = RequestToolResponse | FinalReviewResponse;

export async function generateCodeReview(
    config: YAMLConfig,
    owner: string,
    repo: string,
    pullNumber: number,
    commitId: string,
    files: any[], // FileData[] later,
    availableTools,
    messages: any[] // conversation history
) {

    const systemPrompt = codeReviewPrompt(owner, repo, pullNumber, commitId, files, availableTools);
    return callModel(config, systemPrompt, messages) as Promise<CodeReviewResponse | null>;
}