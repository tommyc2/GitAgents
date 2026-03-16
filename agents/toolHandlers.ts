import { convertBase64ToString } from '../utils/utils.js';

export interface RepoContext {
    octokit: any;
    owner: string;
    repo: string;
}

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