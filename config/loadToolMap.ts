import { searchCodebaseTool } from '../agents/toolHandlers.js';
import { ToolHandler, ToolMap } from '../types/index.js';

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