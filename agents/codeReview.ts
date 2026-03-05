import { claudeClient, openAIClient } from "../config/config.js";
import { codeReviewPrompt } from "../config/systemPrompts.js";
import { YAMLConfig } from "../handlers/onPullRequestOpened.js";
//import { claudeClient } from "../config/config.js";

export interface CodeReviewResponse {
    owner: string;
    repo: string;
    pull_number: number;
    commit_id: string;
    body: string;
    event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT";
    comments: {
        path: string;
        line: number;
        side: "LEFT" | "RIGHT";
        body: string;
    }[];
    headers: {
        "X-GitHub-Api-Version": string;
    };
}

export async function generateCodeReview(
    config: YAMLConfig,
    owner: string,
    repo: string,
    pullNumber: number,
    commitId: string,
    files: any[], // FileData[] later,
    availableTools
) {

    let response: CodeReviewResponse | null = null;

    if (config.model.provider.toLowerCase() === 'openai') {
        const gptResponse = await openAIClient.responses.create({
            model: config.model.name as string,
            input: codeReviewPrompt(owner, repo, pullNumber, commitId, files, availableTools)
        });
        response = JSON.parse(gptResponse.output_text || "Error: trouble getting response from openai");
    }
    else if (config.model.provider.toLowerCase() === 'claude' || config.model.provider.toLowerCase() === 'anthropic') {
        const claudeResponse = await claudeClient.messages.create({
        max_tokens: 1024,
        system: codeReviewPrompt(owner, repo, pullNumber, commitId, files, availableTools),
        messages: [{ role: 'user', content: 'Please follow the system instructions.' }],
        model: config.model.name as string,// TODO: hardcoded for now, will change later to opus etc
        });
        response = JSON.parse(claudeResponse.content[0]?.type === 'text' ? claudeResponse.content[0].text : "Error: trouble getting response from claude");
    }
    // response validation
    if (!response) {
        console.error("🚨Error: trouble getting response from model");
        return null;
    }
    return response;
}