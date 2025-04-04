import { CommittersDetails } from './interfaces'

import * as _ from 'lodash'
import * as input from './shared/getInputs'



function isUserNotInAllowList(committer) {

    const usernameAllowListPatterns: string[] = input.getUsernameAllowList().split(',')
    const domainAllowList: string[] = input.getDomainAllowList().split(',')

    for(let pattern of domainAllowList) {
        pattern = pattern.trim()
        if(!pattern) continue
        if(!pattern.startsWith('@')) pattern = '@' + pattern
        if(committer.email.endsWith(pattern)) {
            return true
        }
    }

    return usernameAllowListPatterns.filter(function (pattern) {
        pattern = pattern.trim()
        if (pattern.includes('*')) {
            const regex = _.escapeRegExp(pattern).split('\\*').join('.*')

            return new RegExp(regex).test(committer.name)
        }
        return pattern === committer
    }).length > 0
}

export function checkAllowList(committers: CommittersDetails[]): CommittersDetails[] {
    const committersAfterAllowListCheck: CommittersDetails[] = committers.filter(committer => committer && !(isUserNotInAllowList !== undefined && isUserNotInAllowList(committer)))
    return committersAfterAllowListCheck
}