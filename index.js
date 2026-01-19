import dotenv from "dotenv";
import { App } from "octokit";
import { createNodeMiddleware } from "@octokit/webhooks";
import fs from "fs";
import http from "http";
import { onPullRequestOpened } from "./handlers/onPullRequestOpened.js";
//import { onPullRequestMerged } from "./handlers/onPullRequestMerged.js";

dotenv.config();

const appId = process.env.GITHUB_APP_ID;
const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

const privateKeyPath = process.env.GITHUB_PRIVATE_KEY;
const privateKey = fs.readFileSync(privateKeyPath, "utf8");

const port = process.env.PORT;

const app = new App({
  appId: appId,
  privateKey: privateKey,
  webhooks: {
    secret: webhookSecret
  },
});

// Event listeners
app.webhooks.on("pull_request.opened", onPullRequestOpened);
//app.webhooks.on("pull_request.closed", onPullRequestMerged);

// checking for errors on webhook trigger
app.webhooks.onError((error) => {
  if (error.name === "AggregateError") {
    console.error(`Error processing request: ${error.event}`);
  } else {
    console.error(error);
  }
});

const middleware = createNodeMiddleware(app.webhooks, { path: "/" });

const server = http.createServer(middleware);

server.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});

// Reference: https://stackoverflow.com/questions/45133138/cant-stop-local-node-server-with-ctrl-c-mac/71642495
process.on('SIGINT', () => {
  console.log("\nExiting...");
  process.exit();
});
