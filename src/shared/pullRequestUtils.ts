import { context } from '@actions/github'

/**
 * Determines if the current PR is from a fork
 * @returns true if PR is from a fork, false otherwise
 */
export function isPullRequestFromFork(): boolean {
  try {
    const isFork = context.payload.pull_request?.head?.repo?.fork ?? false
    return isFork
  } catch (error) {
    // Fallback to false if context is not available (e.g., in tests or non-PR events)
    return false
  }
}
