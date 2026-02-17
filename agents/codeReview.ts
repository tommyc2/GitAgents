import { openAIClient } from "../config/config.js";
import { codeReviewPrompt, dependencyReviewPrompt } from "../config/systemPrompts.js";
import { claudeClient } from "../config/config.js";
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
    owner: string,
    repo: string,
    pullNumber: number,
    commitId: string,
    files: any[] // FileData[] later,
) {
    const gptResponse = await openAIClient.responses.create({
        model: 'gpt-5.2-2025-12-11', // TODO: hardcoded for now, will change later to opus etc
        input: codeReviewPrompt(owner, repo, pullNumber, commitId, files)
    });

    const claudeResponse = await claudeClient.messages.create({
        max_tokens: 1024,
        system: codeReviewPrompt(owner, repo, pullNumber, commitId, files),
        messages: [{ role: 'user', content: 'Please follow the system instructions.' }],
        model: 'claude-sonnet-4-5-20250929',// TODO: hardcoded for now, will change later to opus etc
    });
      
    console.log("\n ---- Claude Response ------\n")
    console.log(claudeResponse.content[0]);

    const outputText = claudeResponse.content[0]?.type === 'text' ? claudeResponse.content[0].text : "No response from Claude";
    const gptOutputText = gptResponse.output_text ?? "No response from GPT";

    return JSON.parse(gptOutputText) as CodeReviewResponse;

}

export async function generateDependencyReview(owner: string, repo: string, pullNumber: number, commitId: string, manifestFileData: any[]) {
    const gptResponse = await openAIClient.responses.create({
        model: 'gpt-5.2-2025-12-11', // TODO: hardcoded for now, will change later to opus etc
        input: dependencyReviewPrompt(owner, repo, pullNumber, commitId, manifestFileData)
    });

    return JSON.parse(gptResponse.output_text) as CodeReviewResponse;
}