import { loadToolMap } from "../config/loadToolMap.js";
import { toolMap } from '../config/loadToolMap.js';
import { ToolHandler } from '../config/loadToolMap.js';
import { RepoContext } from './toolHandlers.js';
import { YAMLConfig } from "../handlers/onPullRequestOpened.js";

type GenerateReviewFn = (
    config: YAMLConfig,
    owner: string,
    repo: string,
    pullNumber: number,
    commitId: string,
    files: any[],
    availableTools: string,
    messages: any[]
) => Promise<any>;

export async function runAgent(config: YAMLConfig, octokit, owner: string, repo: string, pullNumber: number, commitId: string, files: any[], generateReview: GenerateReviewFn) {
    const toolUnionString = loadToolMap(); // array
    const repoContext: RepoContext = { octokit, owner, repo };

    const messages: any[] = [];
    messages.push({ role: 'user', content: 'Please follow the system instructions.' });

    let llmResponse = await generateReview(config, owner, repo, pullNumber, commitId, files, toolUnionString, messages);

    if (llmResponse) {
        messages.push({ role: 'assistant', content: JSON.stringify(llmResponse) });
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {

        if (!llmResponse) {
            console.error("No response from LLM");
            break;
        }
  
        if (llmResponse.type === "final_review") {
            return llmResponse.content;
        }
  
        if (llmResponse.type === "request_tool") {
            const toolHandler: ToolHandler | undefined = toolMap.get(llmResponse.tool);

            if (!toolHandler) { 
                console.error(`Tool ${llmResponse.tool} not found`);
                break;
            }
  
            const toolResult = await toolHandler(repoContext, ...llmResponse.args);

            if (toolResult) {
                messages.push({ role: 'user', content: toolResult });
            } else {
                console.error(`Tool ${llmResponse.tool} returned no result`);
                break;
            }
  
            llmResponse = await generateReview(config, owner, repo, pullNumber, commitId, files, toolUnionString, messages);
            
            if (llmResponse) {
                messages.push({ role: 'assistant', content: JSON.stringify(llmResponse) });
            } else {
                console.error(`Error: trouble getting response from model`);
                break;
            }
        }
    }
  

}