import { convertBase64ToString } from "../utils/utils.js";
import { githubApiVersion } from "./config.js";
import { parseYAML } from "../utils/utils.js";
import { YAMLConfig } from "../types/index.js";

export async function fetchYAMLConfig(octokit,
    owner: string,
    repo: string) {

    const repoResponse = await octokit.request('GET /repos/{owner}/{repo}', {
        owner: owner,
        repo: repo,
        headers: {
            'X-GitHub-Api-Version': githubApiVersion
        }
    });
    
    const defaultBranch = repoResponse.data.default_branch || 'main';
    
    let response;
    try {
        response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: 'agents.config.yaml',
            ref: defaultBranch
        });
    } catch (error) {
        console.error(`Failed to fetch agents.config.yaml: ${error.message}`);
        return null;
    }

    if (response.status == 200){
        const data = response.data;
        const content: string = convertBase64ToString(data.content)
        const fullYamlConfig = parseYAML(content) as YAMLConfig;

        return fullYamlConfig;
    }
    else {
        console.error(`Failed to fetch YAML file: ${response.status}`);
        return null;
    }
}
