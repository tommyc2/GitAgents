import { searchCodebaseTool, readFileTool } from '../agents/toolHandlers.js';
import { ToolHandler, ToolMap } from '../types/index.js';

// Note for user: Add more tools here. `usage` is injected into the agent
// prompts (see loadToolUsage) so the model knows each tool's argument order.
const tools: { name: string; handler: ToolHandler; usage: string }[] = [
    {
        name: "search_codebase",
        handler: searchCodebaseTool,
        usage: `"search_codebase" — args: ["<query>"]. Searches the repository's code and returns the first matching file's content.`,
    },
    {
        name: "read_file",
        handler: readFileTool,
        usage: `"read_file" — args: ["<repo-relative file path>"]. Returns the file's full content at the PR head commit. Use when a diff hunk lacks enough surrounding context to review confidently.`,
    },
];

export const toolMap: ToolMap = new Map(tools.map((t) => [t.name, t.handler]));

// Union of tool names (e.g. `"search_codebase" | "read_file"`), embedded in the
// JSON response shape in the prompts.
export function loadToolMap(): string {
    let union = "";
    if (toolMap.size > 0) {
        console.log('Tools loaded:', toolMap.keys());
        union =  Array.from(toolMap.keys()).map(key => `"${key}"`).join(" | ");
    }
    return union || "No tools loaded.";

}

// One usage line per tool, embedded in the prompts under "Available tools".
export function loadToolUsage(): string {
    return tools.map((t) => `- ${t.usage}`).join("\n");
}
