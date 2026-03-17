import { claudeClient, openAIClient } from "../config/config.js";
import { YAMLConfig } from "../handlers/onPullRequestOpened.js";

export async function callModel(config: YAMLConfig, systemPrompt: string, messages: any[]): Promise<any> {
    const provider = config.model.provider.toLowerCase();

    if (provider === 'openai') {
        const response = await openAIClient.responses.create({
            model: config.model.name as string,
            input: [
                { role: "system", content: systemPrompt },
                ...messages
            ],
        });
        return JSON.parse(response.output_text || "null");
    }

    if (provider === 'claude' || provider === 'anthropic') {
        const response = await claudeClient.messages.create({
            max_tokens: config.model.max_tokens,
            system: systemPrompt,
            messages: messages,
            model: config.model.name as string
        });
        const text = response.content[0]?.type === 'text' ? response.content[0].text : null;
        if (!text) return null;
        return JSON.parse(text);
    }

    console.error(`Unsupported provider: ${config.model.provider}`);
    return null;
}
