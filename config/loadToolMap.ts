import { requestModelFeedback } from '../agents/toolHandlers.js';

export type ToolHandler = (...args: unknown[]) => unknown;
export type ToolMap = Map<string, ToolHandler>;

const tools: [string, ToolHandler][] = [
    ['request_model_feedback', requestModelFeedback]
    //TODO: Add more tools here
];

const toolMap: ToolMap = new Map(tools);

export function loadToolMap(): ToolMap {
    if (toolMap.size > 0) {
        console.log('Tools loaded:', toolMap.keys());
    }
    return toolMap;
}