import {getStatusContext} from './shared/getInputs'
import {context, getOctokit} from '@actions/github'

import * as core from '@actions/core'

core.info(`Using token: ${process.env.GITHUB_TOKEN}`)
const octokit = getOctokit(process.env.GITHUB_TOKEN || "")
const pullRequest = {
  owner: context.payload.repository?.owner.login || "",
  repo: context.payload.repository?.name || "",
  pull_number: context.payload.issue?.number || 0,
  sha: ""
}

async function setupManualStatusUpdate() {
  if (context.eventName != 'issue_comment') return

  // Derive pull request SHA
  const response = await octokit.pulls.get(pullRequest)
  pullRequest.sha = response.data.head.sha
}

export async function updateStatus(state: "error" | "pending" | "success" | "failure", description: string) {
  if (context.eventName != 'issue_comment') return
  await setupComplete

  // Update status on the pull request
  await octokit.repos.createCommitStatus({
    ...pullRequest,
    context: getStatusContext(),
    state,
    description,
  })
}

const setupComplete = setupManualStatusUpdate()