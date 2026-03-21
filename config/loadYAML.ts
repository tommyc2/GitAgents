import { convertBase64ToString } from "../utils/utils.js";
import { githubApiVersion } from "./config.js";
import { parseYAML } from "../utils/utils.js";

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
    
    const response  = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: owner,
        repo: repo,
        path: 'agents.config.yaml',
        ref: defaultBranch
    });

    if (response.status == 200){
        const data = response.data;
        const content: string = convertBase64ToString(data.content)
        const fullYamlConfig = parseYAML(content) as Record<string, any>;
        
        const { project, global_config, model, code_review, dependency_review, feedback } = fullYamlConfig;

        return {
            project,
            global_config,
            model,
            code_review,
            dependency_review,
            feedback
        };
    }
    else {
        console.error(`Failed to fetch YAML file: ${response.status}`);
        return null;
    }
}
