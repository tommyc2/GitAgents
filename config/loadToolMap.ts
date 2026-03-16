import { searchCodebaseTool } from '../agents/toolHandlers.js';

export type ToolHandler = (...args: unknown[]) => unknown;
export type ToolMap = Map<string, ToolHandler>;

const tools: [string, ToolHandler][] = [
    //TODO: Add more tools here
    ["search_codebase", searchCodebaseTool]
];

export const toolMap: ToolMap = new Map(tools);

export function loadToolMap(): string {
    let union = "";
    if (toolMap.size > 0) {
        console.log('Tools loaded:', toolMap.keys());
        union =  Array.from(toolMap.keys()).map(key => `"${key}"`).join(" | ");
    }
    return union || "No tools loaded.";

}