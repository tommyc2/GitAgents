import { githubApiVersion, packageManifestFiles } from "../config/config.js";
import { generateCodeReview } from "../agents/codeReview.js";
import { onManifestChange } from "./onManifestChange.js";

interface FileData {
    data: any; // raw file data from GitHub API
    content: any; // content of the file
}

const userRepoManifestFileData: FileData[] = [];

export async function onPullRequestOpened({ octokit, payload }) {
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
            await onManifestChange(octokit, owner, repo, pullNumber,commitId, userRepoManifestFileData);
        }
         ///////////////////////////////////////////////////

        const codeReviewResponse = await generateCodeReview(owner, repo, pullNumber, commitId, files);

        console.log(" ----- Code Review ------\n", codeReviewResponse);

        await octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews', codeReviewResponse);
    }
}