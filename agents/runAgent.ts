import { loadToolMap } from "../config/loadToolMap.js";
import { generateCodeReview } from "./codeReview.js";

export async function runAgent(config, owner: string, repo: string, pullNumber: number, commitId: string, files: any[]) {
    const toolMap = loadToolMap();
    const llmResponse = await generateCodeReview(config, owner, repo, pullNumber, commitId, files, toolMap);
}