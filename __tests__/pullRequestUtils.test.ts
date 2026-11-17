import { isPullRequestFromFork } from '../src/shared/pullRequestUtils'
import { context } from '@actions/github'

jest.mock('@actions/github')

describe('pullRequestUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns true when PR is from a fork', () => {
    ;(context as any).payload = {
      pull_request: {
        head: {
          repo: {
            fork: true
          }
        }
      }
    }
    expect(isPullRequestFromFork()).toBe(true)
  })

  it('returns false when PR is not from a fork', () => {
    ;(context as any).payload = {
      pull_request: {
        head: {
          repo: {
            fork: false
          }
        }
      }
    }
    expect(isPullRequestFromFork()).toBe(false)
  })

  it('returns false when context is unavailable', () => {
    ;(context as any).payload = {}
    expect(isPullRequestFromFork()).toBe(false)
  })

  it('handles null/undefined gracefully', () => {
    ;(context as any).payload = {
      pull_request: null
    }
    expect(isPullRequestFromFork()).toBe(false)
  })
})
