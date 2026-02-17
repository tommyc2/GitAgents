// AI models, github endpoints, github api version etc.
import dotenv from "dotenv";
import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

export const githubApiVersion: string = "2022-11-28";

export const openAIClient = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'] as string
});

export const claudeClient = new Anthropic({
    apiKey: process.env['ANTHROPIC_API_KEY'] as string, // https://github.com/anthropics/anthropic-sdk-typescript
});

export const packageManifestFiles = ['package.json'];