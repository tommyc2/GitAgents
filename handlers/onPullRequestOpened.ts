import { githubApiVersion, packageManifestFiles } from "../config/config.js";
import { onManifestChange } from "./onManifestChange.js";
import { fetchYAMLConfig } from "../config/loadYAML.js";
import { runAgent } from "../agents/runAgent.js";
import { generateCodeReview } from "../agents/codeReview.js";

interface FileData {
    data: any; // raw file data from GitHub API
    content: any; // content of the file
}
export interface YAMLConfig {
    project?: string;
    model: any;
    global_config: any;
    code_review: any;
    dependency_review: any;
}

const userRepoManifestFileData: FileData[] = [];

export async function onPullRequestOpened({ octokit, payload }) {

    /// YAML Config Check //////////////////////////////////////////////////////////
    const yamlConfig = await fetchYAMLConfig(octokit, payload.repository.owner.login, payload.repository.name);
    if (!yamlConfig) {
        console.error("Failed to load YAML config");
        throw new Error("Failed to load YAML config");
    }
    const { project, global_config, model, code_review, dependency_review } = yamlConfig;
    console.log("----- YAML Config -----\n",
        { project, global_config, model, code_review, dependency_review },
        "--------------------------------\n");

    const config: YAMLConfig = {
        project: project,
        model: model,
        global_config: global_config,
        code_review: code_review,
        dependency_review: dependency_review
    }
    ////////////////////////////////////////////////////////////////////////////////

    console.log(`PR Opened : No.${payload.number} from ${payload.repository.full_name}`);
    
    const owner: string = payload.repository.owner.login;
    const repo: string = payload.repository.name;
    const pullNumber: number = payload.number;
    const commitId: string = payload.pull_request.head.sha;

    const response = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
        owner: owner,
        repo: repo,
        pull_number: pullNumber,
        headers: {
            'X-GitHub-Api-Version': githubApiVersion
        }
    });

    //console.log(JSON.stringify(response));
    if (response) {
        const data = response.data;
        console.log("Response: ", response);
        const files: FileData[] = [];

        
        const { token } = await octokit.auth({ type: "installation" }); // https://stackoverflow.com/questions/60161028/how-do-you-authenticate-a-github-app-in-node-js

        console.log("Token: ", token);

        for (const file of data) {
            if (file) {
                const response = await fetch(file.contents_url, {
                    headers: {
                        'X-GitHub-Api-Version': `${githubApiVersion}`,
                        'Authorization': `Bearer ${token}`,
                    }
                });
                const json = await response.json() as { content: string };

                const cleanedBase64 = json.content.replace(/\s+/g, '')
                
                const plaintext = Buffer.from(cleanedBase64, 'base64').toString('utf-8'); // https://stackoverflow.com/questions/26721893/convert-buffer-base64-utf8-encoding-node-js

                const fileData: FileData = {
                    data: file, //  note: data object from the response (e.g. data [{filename etc...}])
                    content: plaintext
                };

                files.push(fileData);
            }
        }
        console.log("---- Files ----\n", files);

        //////// Dependency Checker /////////////////////////
        for (const file of files) {
            if (packageManifestFiles.includes(file.data.filename)) {
                console.log("Package manifest file found: ", file.data.filename);
                userRepoManifestFileData.push(file);
            }
        }

        if (userRepoManifestFileData.length > 0) {
            await onManifestChange(config, octokit, owner, repo, pullNumber,commitId, userRepoManifestFileData);
        }
         ///////////////////////////////////////////////////

        const codeReviewResponse = await runAgent(config, octokit, owner, repo, pullNumber, commitId, files, generateCodeReview);

        //console.log(" ----- Code Review ------\n", codeReviewResponse);

        await octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews', codeReviewResponse);
    }
}