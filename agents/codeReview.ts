import { callModel } from "./callModel.js";
import { codeReviewPrompt } from "../config/systemPrompts.js";
import { YAMLConfig, CodeReviewResponse } from "../types/index.js";

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