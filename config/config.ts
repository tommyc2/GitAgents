// AI models, github endpoints, github api version etc.
import dotenv from "dotenv";
import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

export const githubApiVersion: string = "2022-11-28";

export class MissingApiKeyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MissingApiKeyError";
    }
}

let openAIClient: OpenAI | null = null;
let claudeClient: Anthropic | null = null;

export function getOpenAIClient(): OpenAI {
    if (!process.env['OPENAI_API_KEY']) {
        throw new MissingApiKeyError(
            "OPENAI_API_KEY is not set. Add it to your repository secrets and pass it via `env:` in your workflow to use OpenAI models."
        );
    }
    if (!openAIClient) {
        openAIClient = new OpenAI({ apiKey: process.env['OPENAI_API_KEY'] });
    }
    return openAIClient;
}

export function getClaudeClient(): Anthropic {
    if (!process.env['ANTHROPIC_API_KEY']) {
        throw new MissingApiKeyError(
            "ANTHROPIC_API_KEY is not set. Add it to your repository secrets and pass it via `env:` in your workflow to use Anthropic (Claude) models."
        );
    }
    if (!claudeClient) {
        claudeClient = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });
    }
    return claudeClient;
}
