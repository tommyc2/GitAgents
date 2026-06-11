import { convertBase64ToString } from '../utils/utils.js';
import { RepoContext } from '../types/index.js';

// Cap on the content a single read_file call returns to the model, so one huge
// file can't blow the input-token budget mid-review.
const MAX_TOOL_RESULT_CHARS = 70_000;

export async function searchCodebaseTool(context: RepoContext, query: string): Promise<string> {
    const searchResponse = await context.octokit.request('GET /search/code', {
        q: `${query}+repo:${context.owner}/${context.repo}`,
    });

    const items = searchResponse.data.items;
    if (!items || items.length === 0) {
        return `No results found for "${query}"`;
    }

    const match = items[0];
    const contentResponse = await context.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: context.owner,
        repo: context.repo,
        path: match.path,
    });

    const content = convertBase64ToString(contentResponse.data.content);

    return JSON.stringify({
        file: match.path,
        content: content,
    });
}

// Reads a file from the repository at the PR head commit. Lets agents pull full
// file contents on demand when a diff hunk in the prompt lacks context, instead
// of every file's content being pushed into the prompt upfront. Errors are
// returned as strings rather than thrown so the agent loop can hand them back
// to the model, which can recover (e.g. retry with a corrected path).
export async function readFileTool(context: RepoContext, path: string): Promise<string> {
    try {
        const { data } = await context.octokit.rest.repos.getContent({
            owner: context.owner,
            repo: context.repo,
            path,
            ref: context.commitId,
        });

        if (Array.isArray(data)) {
            return `"${path}" is a directory. Entries: ${data.map((entry) => entry.name).join(", ")}`;
        }

        // Files larger than ~1MB come back without inline content (only a download_url).
        if (data.type !== "file" || !data.content) {
            return `"${path}" has no readable content (type: ${data.type}; files over 1MB are not returned inline).`;
        }

        let content = convertBase64ToString(data.content);
        if (content.length > MAX_TOOL_RESULT_CHARS) {
            content = content.slice(0, MAX_TOOL_RESULT_CHARS)
                + `\n... [truncated: showing ${MAX_TOOL_RESULT_CHARS} of ${content.length} chars]`;
        }

        return `Contents of ${path} at ${context.commitId}:\n\`\`\`\`\n${content}\n\`\`\`\``;
    } catch (error: any) {
        if (error?.status === 404) {
            return `read_file failed: "${path}" does not exist at the PR head commit. Check the path against the changed files list.`;
        }
        return `read_file failed for "${path}": ${error?.message ?? String(error)}`;
    }
}
