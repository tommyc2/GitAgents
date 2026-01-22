/*export async function onPullRequestMerged({octokit, payload}) {

    if (payload.pull_request.merged === true) {
        const response = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
            owner: payload.repository.owner.login,
            repo: payload.repository.name,
            pull_number: payload.number,
            headers: {
                'X-GitHub-Api-Version': githubApiVersion
            }
        });
        //console.log(JSON.stringify(response));
        if (response) {
            const data = response.data
            const fileURLs = []

            for (let i = 0; i < data.length; i++) {
                fileURLs.push(data[i]['raw_url'])   
            }
            console.log(fileURLs)
            
            const output = await openAIClient.responses.create({
                model: "gpt-4.1-nano",
                input: `
                You are a coding bug detection expert.

                Analyze the modified files provided in ${fileURLs} (raw GitHub URLs). Identify any potential bugs, errors, or problematic patterns. 

                In your report, **always include this PR link**: https://github.com/${payload.repository.owner.login}/${payload.repository.name}/pull/${payload.pull_request.number}

                Use backticks around file names and code syntax without adding extra quotes inside the backticks. Return **only** a valid JSON object matching the exact structure below — with no additional text, explanations, or markdown. The JSON must be syntactically correct and directly parsable as a JavaScript object.

                {
                    owner: '${payload.repository.owner.login}',
                    repo: '${payload.repository.name}',
                    title: '<your title here>',
                    body: '<insert your detailed bug report here, referencing the PR at the top of the body>',
                    labels: [
                        'bug'
                    ],
                    headers: {
                        'X-GitHub-Api-Version': '2022-11-28'
                    }
                }
            `,
            });

            console.log(output.output_text)
            const object = JSON.parse(output.output_text)
            //console.log(object)

            await octokit.request('POST /repos/{owner}/{repo}/issues', object)
        }
    }
}
*/