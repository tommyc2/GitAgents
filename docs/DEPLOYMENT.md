# User Guide for Deployment

## Prerequisites 

The setup for this application involves a few key ingredients.

- A GitHub app that is registered via GitHub. [1] https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app
- You will need to obtain a `GITHUB_APP_ID`, `GITHUB_WEBHOOK_SECRET` and a private key (.pem extension). The setup guide shows how to obtain these.

### AI Model Configuration

The developer/organisation will need a an API key from either OpenAI or Anthropic. The developer can obtain these API keys from the mentioned providers by creating a Console API account on either platform. [2] https://developers.openai.com/api/docs/quickstart/ : [3] https://platform.claude.com/login?returnTo=%2F%3F


### Port

In addition to the steps mentioned above, the developer will need to set up a Port for the Node HTTP server. A commonly used port is `8080` or `3000` for web applications. The developer must make sure that the port is not being used by any other service on their machine.

### NodeJS and TypeScript (TS)

One of the key libraries required for this application is **NodeJS**. The developer must make sure that this is installed an running on version `22.0` or above.
TypeScript must also be installed on the users machine.

## YAML Configuration File
The developer will require an `agents.config.yaml` file in the root of their repository. The template below can be used:

```yaml
project:
  name: "my-repo"
  description: "Brief description of the repository"

global_config:
  language: "en"

model:
  provider: "openai"
  name: "gpt-5.2-codex"
  max_tokens: 4096
  temperature: 0.2

code_review:
  tone: "concise" # "constructive", "strict", "concise", "educational"
  focus:
    - "correctness"
    - "security"
  ignore_patterns:
    - "*.min.js"
    - "dist/**"
    - ".tekton/**"

dependency_review:
  enabled: true
  manifest_files:
    - "package-lock.json"
    - "package.json"
    # - "pom.xml"
    # - "go.mod"
    # - "requirements.txt"
  risk_tolerance: "medium" # "low", "medium", "high"

feedback:
  enabled: true
  model:
    provider: "anthropic"
    name: "claude-sonnet-4-6"
    max_tokens: 4096
    temperature: 0.1
```

---

## Cloud Provider (AWS, Render, Railway etc)

It is recommended to host the application on a suitable Cloud Provider like Amazon AWS, Render, Railway, Heroku etc. If the user wishes to run the app locally, they must set up funneling via ngrok or Cloudflare. More information can be found here - https://ngrok.com/docs/guides/share-localhost/overview

If using AWS, it is recommended to setup an EC2 instance with 1GB of RAM minimum.

In addition to this, the developer must setup a Security Group with appropriate inbound/outbound traffic rules. [4] https://docs.aws.amazon.com/vpc/latest/userguide/creating-security-groups.html

The recommended approach is to setup a Render or Railway instance. From here, the developer can attach the GitHub Repository to Render/Railway and manually add the environment variables. A public URL can then be generated. [5] https://render.com/docs/your-first-deploy [6] https://railway.com/new/github

## Configure the application

To install and run the application, the developer must follow these exact steps:

### 1. Register the GitHub App

First, the developer must create the GitHub App. This can be done using the guide above. They must check every appropriate permission and allow write access to the repository. Permissions must be unlimited for pull requests.

### 2. Configuration

Next, the user/developer must clone the repository and install the necessary dependencies. These include the OpenAI and Anthropic SDKs. They must also add the environment variables to the project directory to handle communication between GitHub and the Client (their machine).

### Verification

Once all the above steps have been completed, it is then recommended to test out the application by simply opening a pull request. The code reviewing agent should be triggered immediately.


### Troubleshooting
There are many errors that can occur during the runtime. For example, A `HTTP 401` error means there is security check failure. The developer must verify they have the correct private key in their repository and that they are validating the payload correctly. [7] https://hookdeck.com/webhooks/platforms/guide-troubleshooting-github-webhooks

Another common error can be a `missing YAML file`. The developer must ensure that a valid, linted `agent.config.yaml` resides in their repository. Without this configuration, the GitHub App will post a PR comment on the developer's newly opened pull request recommending the developer/user to add one. This is part of the User Experience (UX), using clear messaging so that there is no ambiguity.

## Optional Additions
Developers typically package their applications with Containers. [8] https://www.docker.com/resources/what-container/These . These are lightweight, isolated environments that can be deployed to servicess like Render/Railway and even AWS. They contain their own virtual filesystem and set of permissions.




