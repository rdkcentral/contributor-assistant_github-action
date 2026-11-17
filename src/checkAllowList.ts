import { CommittersDetails } from './interfaces'

import * as _ from 'lodash'
import * as input from './shared/getInputs'
import { getFileContent } from './persistence/persistence'
import { isPullRequestFromFork } from './shared/pullRequestUtils'

function isUserInAllowList(
  committer: CommittersDetails,
  usernameAllowListPatterns: string[],
  domainAllowList: string[]
): boolean {
  for (let pattern of domainAllowList) {
    pattern = pattern.trim()
    if (!pattern) continue
    if (!pattern.startsWith('@')) pattern = '@' + pattern
    if (committer.email && committer.email.endsWith(pattern)) {
      return true
    }
  }

  return (
    usernameAllowListPatterns.filter(function (pattern) {
      pattern = pattern.trim()
      if (pattern.includes('*')) {
        // Escape regex special chars, replace \* with .*, and anchor properly
        const regex =
          '^' + _.escapeRegExp(pattern).split('\\*').join('.*') + '$'

        return new RegExp(regex).test(committer.name)
      }
      return pattern === committer.name
    }).length > 0
  )
}

export async function checkAllowList(
  committers: CommittersDetails[],
  skipExcludeLists: boolean = false
): Promise<CommittersDetails[]> {
  // Load allowlists at runtime (not module-load time) for testability
  let usernameAllowListPatterns: string[] = skipExcludeLists
    ? []
    : input.getUsernameAllowList().split(',')
  let domainAllowList: string[] = skipExcludeLists
    ? []
    : input.getDomainAllowList().split(',')

  const domainsFile: string = input.getDomainsFile()

  if (!skipExcludeLists && domainsFile) {
    try {
      const result = await getFileContent(domainsFile)
      const jsonData = Buffer.from(result.data.content, 'base64').toString()
      let domainsFileContent = JSON.parse(jsonData)
      if (domainsFileContent && Array.isArray(domainsFileContent)) {
        domainAllowList.push(...domainsFileContent)
      }
    } catch (error) {
      if (error.status != '404') {
        throw new Error(
          `Could not retrieve whitelisted email domains. Status: ${
            error.status || 'unknown'
          }`
        )
      }
    }
  }

  const remainingCommitters: CommittersDetails[] = committers.filter(
    committer =>
      committer &&
      !isUserInAllowList(committer, usernameAllowListPatterns, domainAllowList)
  )
  return remainingCommitters
}
