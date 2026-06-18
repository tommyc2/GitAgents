import { callModel } from "./callModel.js";
import { codeReviewPrompt } from "../config/systemPrompts.js";
import { YAMLConfig, CodeReviewResponse, FileData } from "../types/index.js";

export async function generateCodeReview(
    config: YAMLConfig,
    owner: string,
    repo: string,
    pullNumber: number,
    commitId: string,
    files: FileData[],
    availableTools,
    messages: any[]
) {

    const systemPrompt = codeReviewPrompt(owner, repo, pullNumber, commitId, files, availableTools, config.reviewer_instructions);
    return callModel(config, systemPrompt, messages) as Promise<CodeReviewResponse | null>;
}