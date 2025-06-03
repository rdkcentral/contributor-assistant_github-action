import {context} from '@actions/github'
import {setupClaCheck} from './setupClaCheck'
import {lockPullRequest} from './pullrequest/pullRequestLock'
import {updateStatus} from "./setStatus"

import * as core from '@actions/core'
import * as input from './shared/getInputs'

export async function run() {
  await updateStatus("pending", "Checking for signature...")

  try {
    core.info(`CLA Assistant GitHub Action bot has started the process`)

    /*
     * using a `string` true or false purposely as github action input cannot have a boolean value
     */
    if (
      context.payload.action === 'closed' &&
      input.lockPullRequestAfterMerge() == 'true'
    ) {
      return lockPullRequest()
    } else {
      await setupClaCheck()
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
      await updateStatus("error", error.message)
    }
  }
}

run()
