import { claudeClient, openAIClient } from "../config/config.js";
import { YAMLConfig } from "../handlers/onPullRequestOpened.js";
import { stripCodeFences } from "../utils/utils.js";

export async function callModel(config: YAMLConfig, systemPrompt: string, messages: any[]): Promise<any> {
    const modelName = (config.model.name as string) || "";
    const provider = config.model.provider
        ? config.model.provider.toLowerCase()
        : modelName.startsWith("claude") ? "claude" : "openai";

    try {
        if (provider === 'openai') {
            const response = await openAIClient.responses.create({
                model: config.model.name as string,
                input: [
                    { role: "system", content: systemPrompt },
                    ...messages
                ],
            });
            return JSON.parse(stripCodeFences(response.output_text || "null"));
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
            return JSON.parse(stripCodeFences(text));
        }
    } catch (error) {
        console.error(`callModel error (provider: ${provider}, model: ${config.model.name}):`, error);
        return null;
    }

    console.error(`Unsupported provider: ${config.model.provider}`);
    return null;
}
