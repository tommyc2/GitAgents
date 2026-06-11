import { loadToolMap } from "../config/loadToolMap.js";
import { toolMap } from '../config/loadToolMap.js';
import { ToolHandler, RepoContext, YAMLConfig, GenerateReviewFn, FileData } from '../types/index.js';

// Cap on tool round-trips per review. Each request_tool turn is a full extra
// model call that re-sends the whole conversation, so an agent stuck in a
// read-everything loop burns tokens fast. Past the cap the agent is told to
// finalize with what it has; a couple of grace turns later we give up.
const MAX_TOOL_CALLS = 8;

export async function runAgent(config: YAMLConfig, octokit, owner: string, repo: string, pullNumber: number, commitId: string, files: FileData[], generateReview: GenerateReviewFn): Promise<any> {
    const toolUnionString = loadToolMap();
    const repoContext: RepoContext = { octokit, owner, repo, commitId };

    // Debugging: surface exactly which files are handed to the LLM (filenames only,
    // not diffs) so we can confirm ignore_patterns filtering and PR file loading.
    console.log(`Files passed to the LLM (${files.length}):`, files.map((f) => f?.filename));

    const messages: any[] = [];
    messages.push({ role: 'user', content: 'Please follow the system instructions.' });

    let llmResponse = await generateReview(config, owner, repo, pullNumber, commitId, files, toolUnionString, messages);

    if (llmResponse) {
        messages.push({ role: 'assistant', content: JSON.stringify(llmResponse) });
    }

    let toolCalls = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {

        if (!llmResponse) {
            console.error("No response from LLM");
            return undefined;
        }

        else if (llmResponse.type === "final_review") {
            // Debugging: the model self-reports which files it actually read (see the
            // "files_reviewed" field added to the review prompts). Compare against the
            // "Files passed to the LLM" log above to spot files the model skipped.
            if (llmResponse.files_reviewed) {
                console.log("Files the model reported reading:", llmResponse.files_reviewed);
            }
            return llmResponse.content;
        }

        else if (llmResponse.type === "request_tool") {
            toolCalls++;

            if (toolCalls > MAX_TOOL_CALLS + 2) {
                console.error(`Agent kept requesting tools past the budget (${toolCalls} calls); giving up.`);
                return undefined;
            }

            // Tool problems (unknown tool, bad args, 404s) are fed back to the model
            // as the tool result rather than aborting the review — the model can
            // correct itself on the next turn.
            let toolResult: unknown;

            if (toolCalls > MAX_TOOL_CALLS) {
                toolResult = "Tool budget exhausted. Respond with your final_review now, using the information you already have.";
            } else {
                const toolHandler: ToolHandler | undefined = toolMap.get(llmResponse.tool);

                if (!toolHandler) {
                    console.error(`Tool ${llmResponse.tool} not found`);
                    toolResult = `Tool "${llmResponse.tool}" not found. Available tools: ${toolUnionString}`;
                } else {
                    const args = Array.isArray(llmResponse.args) ? llmResponse.args : [];
                    console.log(`Tool call ${toolCalls}/${MAX_TOOL_CALLS}: ${llmResponse.tool}(${JSON.stringify(args)})`);
                    try {
                        toolResult = await toolHandler(repoContext, ...args);
                    } catch (error) {
                        console.error(`Tool ${llmResponse.tool} threw:`, error);
                        toolResult = `Tool "${llmResponse.tool}" failed: ${error instanceof Error ? error.message : String(error)}`;
                    }
                    if (!toolResult) {
                        console.error(`Tool ${llmResponse.tool} returned no result`);
                        toolResult = `Tool "${llmResponse.tool}" returned no result.`;
                    }
                }
            }

            messages.push({ role: 'user', content: toolResult });

            llmResponse = await generateReview(config, owner, repo, pullNumber, commitId, files, toolUnionString, messages);

            if (llmResponse) {
                messages.push({
                    role: 'assistant',
                    content: JSON.stringify(llmResponse)
                });
            } else {
                console.error(`Error: trouble getting response from model`);
                return undefined;
            }
        }
        else {
            console.error("Unknown response type: ", llmResponse.type ?? "No type");
            return undefined;
        }
    }
}
