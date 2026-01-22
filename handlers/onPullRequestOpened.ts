import { githubApiVersion } from "../config/config.js";
import { generateCodeReview } from "../agents/codeReview.js";

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
        const fileURLs: string[] = [];

        for (const file of data) {
            if (file.raw_url) {
                fileURLs.push(file.raw_url);
            }
        }
        console.log(fileURLs);
        
        const codeReviewResponse = await generateCodeReview(owner, repo, pullNumber, commitId, fileURLs);

        await octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews', codeReviewResponse);
    }
}