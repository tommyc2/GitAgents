import OpenAI from "openai";
import dotenv from "dotenv";
import { codeReviewPrompt } from "../config/systemPrompts.js";

dotenv.config();

export interface CodeReviewResponse {
    owner: string;
    repo: string;
    pull_number: number;
    commit_id: string;
    body: string;
    event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT";
    comments: {
        path: string;
        position: number;
        body: string;
    }[];
    headers: {
        "X-GitHub-Api-Version": string;
    };
}

export const openAIClient = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'] as string
});

export async function generateCodeReview(
    owner: string,
    repo: string,
    pullNumber: number,
    commitId: string,
    fileURLs: string[]
) {
    const output = await openAIClient.responses.create({
        model: 'gpt-5.2-2025-12-11', // hardcoded for now, will change later to opus etc
        input: codeReviewPrompt(owner, repo, pullNumber, commitId, fileURLs)
    });
    return JSON.parse(output.output_text) as CodeReviewResponse;
}