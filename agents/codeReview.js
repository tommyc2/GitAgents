import OpenAI from "openai";
import dotenv from "dotenv";
import { codeReviewPrompt } from "../config/systemPrompts.js";

dotenv.config();

export const openAIClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export async function generateCodeReview(owner, repo, pullNumber, commitId, fileURLs) {
    const output = await openAIClient.responses.create({
        model: 'gpt-5.2-codex', // hardcoded for now
        input: codeReviewPrompt(owner, repo, pullNumber, commitId, fileURLs)
    });
    return JSON.parse(output.output_text);
}