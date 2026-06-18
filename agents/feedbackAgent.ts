import { callModel } from "./callModel.js";
import { feedbackReviewPrompt } from "../config/systemPrompts.js";
import { YAMLConfig, FileData } from "../types/index.js";

export async function runFeedbackAgent(
    config: YAMLConfig,
    owner: string,
    repo: string,
    pullNumber: number,
    commitId: string,
    files: FileData[],
    primaryReview: any
): Promise<any> {

    console.log("Running feedback agent...\n\n");
    if (!config.feedback?.enabled) {
        console.log("Feedback agent is disabled, returning primary review...\n\n");
        return primaryReview;
    }

    const feedbackConfig: YAMLConfig = {
        ...config,
        model: config.feedback.model
    };

    const systemPrompt = feedbackReviewPrompt(owner, repo, pullNumber, commitId, files, primaryReview, config.reviewer_instructions);
    const messages = [{ role: 'user', content: 'Please verify the primary review and return your assessment.' }];

    const response = await callModel(feedbackConfig, systemPrompt, messages);

    if (response?.type === "final_review" && response.content) {
        return response.content;
    }

    console.error("Feedback agent returned unexpected format, falling back to primary review");
    return primaryReview;
}
