import { claudeClient, openAIClient } from "../config/config.js";
import { codeReviewPrompt } from "../config/systemPrompts.js";
import { YAMLConfig } from "../handlers/onPullRequestOpened.js";
//import { claudeClient } from "../config/config.js";

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

    let response: CodeReviewResponse | null = null;

    if (config.model.provider.toLowerCase() === 'openai') {
        const gptResponse = await openAIClient.responses.create({
            model: config.model.name as string,
            input: [
                { role: "system", content: codeReviewPrompt(owner, repo, pullNumber, commitId, files, availableTools) },
                ...messages
            ],      
        });
        response = JSON.parse(gptResponse.output_text || "Error: trouble getting response from openai");
    }

    else if (config.model.provider.toLowerCase() === 'claude' || config.model.provider.toLowerCase() === 'anthropic') {
        const claudeResponse = await claudeClient.messages.create({
            max_tokens: 1024, //TODO: make this configurable later
            system: codeReviewPrompt(owner, repo, pullNumber, commitId, files, availableTools),
            messages: messages,
            model: config.model.name as string
        });
        response = JSON.parse(claudeResponse.content[0]?.type === 'text' ? claudeResponse.content[0].text : "Error: trouble getting response from claude");
    }
    // response validation
    if (!response) {
        console.error("Error: trouble getting response from model");
        return null;
    }
    return response;
}