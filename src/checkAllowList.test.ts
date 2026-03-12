import { checkAllowList } from './checkAllowList'
import * as input from './shared/getInputs'
import { CommittersDetails } from './interfaces'
import { getFileContent } from './persistence/persistence'

jest.mock('./shared/getInputs')
jest.mock('./persistence/persistence')

const mockedGetUsernameAllowList = jest.mocked(input.getUsernameAllowList)
const mockedGetDomainAllowList = jest.mocked(input.getDomainAllowList)
const mockedGetDomainsFile = jest.mocked(input.getDomainsFile)
const mockedGetFileContent = jest.mocked(getFileContent)

describe('checkAllowList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetUsernameAllowList.mockReturnValue('')
    mockedGetDomainAllowList.mockReturnValue('')
    mockedGetDomainsFile.mockReturnValue('')
  })

  describe('Exact username matching', () => {
    it('should filter out committer with exact username match', async () => {
      mockedGetUsernameAllowList.mockReturnValue('dependabot,bot-user,copilot')

      const committers: CommittersDetails[] = [
        { name: 'copilot', id: 123, email: '[email protected]' },
        { name: 'real-user', id: 456, email: '[email protected]' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('real-user')
    })

    it('should be case-sensitive for exact username matches', async () => {
      mockedGetUsernameAllowList.mockReturnValue('Copilot')

      const committers: CommittersDetails[] = [
        { name: 'copilot', id: 123, email: '[email protected]' },
        { name: 'Copilot', id: 456, email: '[email protected]' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('copilot')
    })

    it('should handle multiple exact matches', async () => {
      mockedGetUsernameAllowList.mockReturnValue(
        'dependabot, semantic-release-bot, copilot'
      )

      const committers: CommittersDetails[] = [
        { name: 'dependabot', id: 1, email: '[email protected]' },
        { name: 'copilot', id: 2, email: '[email protected]' },
        { name: 'user1', id: 3, email: '[email protected]' },
        { name: 'semantic-release-bot', id: 4, email: '[email protected]' },
        { name: 'user2', id: 5, email: '[email protected]' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(2)
      expect(result.map(c => c.name)).toEqual(['user1', 'user2'])
    })

    it('should handle spaces in allowlist', async () => {
      mockedGetUsernameAllowList.mockReturnValue('  bot-user  ,  another-bot  ')

      const committers: CommittersDetails[] = [
        { name: 'bot-user', id: 1, email: '[email protected]' },
        { name: 'another-bot', id: 2, email: '[email protected]' },
        { name: 'real-user', id: 3, email: '[email protected]' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('real-user')
    })

    it('should not match partial usernames', async () => {
      mockedGetUsernameAllowList.mockReturnValue('bot')

      const committers: CommittersDetails[] = [
        { name: 'bot', id: 1, email: '[email protected]' },
        { name: 'bot-user', id: 2, email: '[email protected]' },
        { name: 'my-bot', id: 3, email: '[email protected]' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(2)
      expect(result.map(c => c.name)).toEqual(['bot-user', 'my-bot'])
    })
  })

  describe('Wildcard username matching', () => {
    it('should match wildcards at end of pattern', async () => {
      mockedGetUsernameAllowList.mockReturnValue('dependabot*')

      const committers: CommittersDetails[] = [
        { name: 'dependabot', id: 1, email: '[email protected]' },
        { name: 'dependabot[bot]', id: 2, email: '[email protected]' },
        { name: 'dependabot-preview', id: 3, email: '[email protected]' },
        { name: 'my-dependabot', id: 4, email: '[email protected]' },
        { name: 'real-user', id: 5, email: '[email protected]' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(2)
      expect(result.map(c => c.name)).toEqual(['my-dependabot', 'real-user'])
    })

    it('should match wildcards at beginning of pattern', async () => {
      mockedGetUsernameAllowList.mockReturnValue('*-bot')

      const committers: CommittersDetails[] = [
        { name: 'my-bot', id: 1, email: '[email protected]' },
        { name: 'another-bot', id: 2, email: '[email protected]' },
        { name: 'bot', id: 3, email: '[email protected]' },
        { name: 'bot-user', id: 4, email: '[email protected]' },
        { name: 'real-user', id: 5, email: '[email protected]' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(3)
      expect(result.map(c => c.name)).toEqual(['bot', 'bot-user', 'real-user'])
    })

    it('should match wildcards in middle of pattern', async () => {
      mockedGetUsernameAllowList.mockReturnValue('github-*[bot]')

      const committers: CommittersDetails[] = [
        { name: 'github-copilot[bot]', id: 1, email: '[email protected]' },
        { name: 'github-actions[bot]', id: 2, email: '[email protected]' },
        { name: 'github-bot', id: 3, email: '[email protected]' },
        { name: 'real-user', id: 4, email: '[email protected]' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(2)
      expect(result.map(c => c.name)).toEqual(['github-bot', 'real-user'])
    })

    it('should handle multiple wildcards in one pattern', async () => {
      mockedGetUsernameAllowList.mockReturnValue('*bot*')

      const committers: CommittersDetails[] = [
        { name: 'mybot', id: 1, email: '[email protected]' },
        { name: 'bot-user', id: 2, email: '[email protected]' },
        { name: 'user-bot-test', id: 3, email: '[email protected]' },
        { name: 'real-user', id: 4, email: '[email protected]' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('real-user')
    })

    it('should handle multiple wildcard patterns', async () => {
      mockedGetUsernameAllowList.mockReturnValue(
        'dependabot*, *[bot], semantic-*'
      )

      const committers: CommittersDetails[] = [
        { name: 'dependabot', id: 1, email: '[email protected]' },
        { name: 'dependabot-preview', id: 2, email: '[email protected]' },
        { name: 'github-actions[bot]', id: 3, email: '[email protected]' },
        { name: 'semantic-release', id: 4, email: '[email protected]' },
        { name: 'real-user', id: 5, email: '[email protected]' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('real-user')
    })

    it('should escape regex special characters', async () => {
      mockedGetUsernameAllowList.mockReturnValue('bot.name*')

      const committers: CommittersDetails[] = [
        { name: 'bot.name', id: 1, email: '[email protected]' },
        { name: 'bot.name-test', id: 2, email: '[email protected]' },
        { name: 'botXname', id: 3, email: '[email protected]' },
        { name: 'real-user', id: 4, email: '[email protected]' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(2)
      expect(result.map(c => c.name)).toEqual(['botXname', 'real-user'])
    })
  })

  describe('Email domain matching', () => {
    it('should match email domain with @ prefix', async () => {
      mockedGetDomainAllowList.mockReturnValue('@example.com')

      const committers: CommittersDetails[] = [
        { name: 'user1', id: 1, email: 'user1@example.com' },
        { name: 'user2', id: 2, email: 'user2@test.org' },
        { name: 'user3', id: 3, email: 'user3@another.net' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(2)
      expect(result.map(c => c.name)).toEqual(['user2', 'user3'])
    })

    it('should auto-add @ prefix if missing', async () => {
      mockedGetDomainAllowList.mockReturnValue('example.com')

      const committers: CommittersDetails[] = [
        { name: 'user1', id: 1, email: 'user1@example.com' },
        { name: 'user2', id: 2, email: 'user2@test.org' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('user2')
    })

    it('should handle multiple email domains', async () => {
      mockedGetDomainAllowList.mockReturnValue(
        '@example.com, @test.org, @bot.io'
      )

      const committers: CommittersDetails[] = [
        { name: 'user1', id: 1, email: 'user1@example.com' },
        { name: 'user2', id: 2, email: 'user2@test.org' },
        { name: 'user3', id: 3, email: 'user3@bot.io' },
        { name: 'user4', id: 4, email: 'user4@keep.me' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('user4')
    })

    it('should handle committers without email field', async () => {
      mockedGetDomainAllowList.mockReturnValue('@example.com')

      const committers: CommittersDetails[] = [
        { name: 'user1', id: 1, email: 'user1@example.com' },
        { name: 'user2', id: 2 },
        { name: 'user3', id: 3, email: undefined }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(2)
      expect(result.map(c => c.name)).toEqual(['user2', 'user3'])
    })

    it('should not match subdomain emails', async () => {
      mockedGetDomainAllowList.mockReturnValue('@example.com')

      const committers: CommittersDetails[] = [
        { name: 'user1', id: 1, email: 'user1@example.com' },
        { name: 'user2', id: 2, email: 'user2@sub.example.com' },
        { name: 'user3', id: 3, email: 'user3@users.noreply.example.com' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(2)
      expect(result.map(c => c.name)).toEqual(['user2', 'user3'])
    })

    it('should not match partial domain names', async () => {
      mockedGetDomainAllowList.mockReturnValue('@example.com')

      const committers: CommittersDetails[] = [
        { name: 'user1', id: 1, email: 'user1@example.com' },
        { name: 'user2', id: 2, email: 'user2@example.company' },
        { name: 'user3', id: 3, email: 'user3@anotherexample.com' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(2)
      expect(result.map(c => c.name)).toEqual(['user2', 'user3'])
    })

    it('should skip empty domain patterns', async () => {
      mockedGetDomainAllowList.mockReturnValue('  , @example.com ,  ')

      const committers: CommittersDetails[] = [
        { name: 'user1', id: 1, email: 'user1@example.com' },
        { name: 'user2', id: 2, email: 'user2@test.org' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('user2')
    })

    it('should treat uppercase domains as distinct values', async () => {
      mockedGetDomainAllowList.mockReturnValue('@example.com')

      const committers: CommittersDetails[] = [
        { name: 'lowercase-user', id: 1, email: 'user@example.com' },
        { name: 'uppercase-user', id: 2, email: 'user@EXAMPLE.COM' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('uppercase-user')
    })
  })

  describe('Combined username and email domain matching', () => {
    it('should filter by both username and email domain', async () => {
      mockedGetUsernameAllowList.mockReturnValue('dependabot, copilot*')
      mockedGetDomainAllowList.mockReturnValue('@bot.example.com')

      const committers: CommittersDetails[] = [
        { name: 'dependabot', id: 1, email: 'dependabot@github.com' },
        { name: 'copilot-agent', id: 2, email: 'copilot-agent@github.com' },
        { name: 'bot-service', id: 3, email: 'bot-service@bot.example.com' },
        { name: 'real-user', id: 4, email: 'real-user@users.example.com' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('real-user')
    })

    it('should filter if either username OR email domain matches', async () => {
      mockedGetUsernameAllowList.mockReturnValue('bot-user')
      mockedGetDomainAllowList.mockReturnValue('@automated.com')

      const committers: CommittersDetails[] = [
        { name: 'bot-user', id: 1, email: 'bot-user@people.dev' },
        { name: 'real-user', id: 2, email: 'real-user@automated.com' },
        { name: 'another-user', id: 3, email: 'another-user@people.dev' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('another-user')
    })
  })

  describe('Domain file loading', () => {
    it('should load and use domains from file', async () => {
      mockedGetDomainsFile.mockReturnValue('domains.json')
      const fileContent = JSON.stringify(['@loaded-domain.com', '@another.org'])
      mockedGetFileContent.mockResolvedValue({
        data: {
          content: Buffer.from(fileContent).toString('base64')
        }
      } as any)

      const committers: CommittersDetails[] = [
        { name: 'user1', id: 1, email: 'user1@loaded-domain.com' },
        { name: 'user2', id: 2, email: 'user2@another.org' },
        { name: 'user3', id: 3, email: 'user3@keep.me' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('user3')
      expect(mockedGetFileContent).toHaveBeenCalledWith('domains.json')
    })

    it('should merge file domains with input domains', async () => {
      mockedGetDomainAllowList.mockReturnValue('@input-domain.com')
      mockedGetDomainsFile.mockReturnValue('domains.json')
      const fileContent = JSON.stringify(['@file-domain.org'])
      mockedGetFileContent.mockResolvedValue({
        data: {
          content: Buffer.from(fileContent).toString('base64')
        }
      } as any)

      const committers: CommittersDetails[] = [
        { name: 'user1', id: 1, email: 'user1@input-domain.com' },
        { name: 'user2', id: 2, email: 'user2@file-domain.org' },
        { name: 'user3', id: 3, email: 'user3@keep.me' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('user3')
    })

    it('should handle missing domain file (404)', async () => {
      mockedGetDomainsFile.mockReturnValue('domains.json')
      mockedGetFileContent.mockRejectedValue({ status: '404' })

      const committers: CommittersDetails[] = [
        { name: 'user1', id: 1, email: 'user1@keep.me' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('user1')
    })

    it('should throw on non-404 file errors', async () => {
      mockedGetDomainsFile.mockReturnValue('domains.json')
      mockedGetFileContent.mockRejectedValue({ status: '500' })

      const committers: CommittersDetails[] = [
        { name: 'user1', id: 1, email: 'user1@keep.me' }
      ]

      await expect(checkAllowList(committers)).rejects.toThrow(
        'Could not retrieve whitelisted email domains'
      )
    })

    it('should handle invalid JSON in domain file', async () => {
      mockedGetDomainsFile.mockReturnValue('domains.json')
      mockedGetFileContent.mockResolvedValue({
        data: {
          content: Buffer.from('{ invalid json }').toString('base64')
        }
      } as any)

      const committers: CommittersDetails[] = [
        { name: 'user1', id: 1, email: 'user1@keep.me' }
      ]

      await expect(checkAllowList(committers)).rejects.toThrow()
    })

    it('should handle non-array domain file content', async () => {
      mockedGetDomainsFile.mockReturnValue('domains.json')
      const fileContent = JSON.stringify({ domains: ['@example.com'] })
      mockedGetFileContent.mockResolvedValue({
        data: {
          content: Buffer.from(fileContent).toString('base64')
        }
      } as any)
      const committers: CommittersDetails[] = [
        { name: 'user1', id: 1, email: 'user1@keep.me' },
        { name: 'user2', id: 2, email: 'user2@another.dev' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(2)
    })
  })

  describe('Edge cases and security', () => {
    it('should handle empty allowlists', async () => {
      mockedGetUsernameAllowList.mockReturnValue('')
      mockedGetDomainAllowList.mockReturnValue('')

      const committers: CommittersDetails[] = [
        { name: 'user1', id: 1, email: 'user1@example.com' },
        { name: 'user2', id: 2, email: 'user2@test.org' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(2)
    })

    it('should handle null/undefined committers in array', async () => {
      mockedGetUsernameAllowList.mockReturnValue('bot')

      const committers: any[] = [
        { name: 'user1', id: 1 },
        null,
        undefined,
        { name: 'bot', id: 2 },
        { name: 'user2', id: 3 }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(2)
      expect(result.map(c => c.name)).toEqual(['user1', 'user2'])
    })

    it('should handle literal wildcard-like usernames safely', async () => {
      mockedGetUsernameAllowList.mockReturnValue('.*')

      const committers: CommittersDetails[] = [
        { name: 'user1', id: 1, email: 'user1@example.com' },
        { name: 'user2', id: 2, email: 'user2@test.org' },
        { name: '.*', id: 3, email: 'literal@tokens.dev' }
      ]

      const result = await checkAllowList(committers)

      expect(result.length).toBeLessThanOrEqual(3)
    })

    it('should handle special regex characters in exact match mode', async () => {
      mockedGetUsernameAllowList.mockReturnValue(
        'user.name, user[bot], user$123, user^test'
      )

      const committers: CommittersDetails[] = [
        { name: 'user.name', id: 1, email: 'user.name@example.com' },
        { name: 'userXname', id: 2, email: 'userxname@example.com' },
        { name: 'user[bot]', id: 3, email: 'userbot@example.com' },
        { name: 'user$123', id: 4, email: 'user123@example.com' },
        { name: 'user^test', id: 5, email: 'usertest@example.com' },
        { name: 'normal-user', id: 6, email: 'normal-user@example.com' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(2)
      expect(result.map(c => c.name)).toEqual(['userXname', 'normal-user'])
    })

    it('should handle very long allowlists without performance issues', async () => {
      const longList = Array.from({ length: 1000 }, (_, i) => `bot-${i}`).join(
        ','
      )
      mockedGetUsernameAllowList.mockReturnValue(longList)

      const committers: CommittersDetails[] = [
        { name: 'bot-500', id: 1, email: 'bot-500@example.com' },
        { name: 'real-user', id: 2, email: 'real-user@example.com' },
        { name: 'bot-999', id: 3, email: 'bot-999@example.com' }
      ]

      const start = Date.now()
      const result = await checkAllowList(committers)
      const duration = Date.now() - start

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('real-user')
      expect(duration).toBeLessThan(1000)
    })

    it('should handle empty username but valid email', async () => {
      mockedGetDomainAllowList.mockReturnValue('@bot.example.com')

      const committers: CommittersDetails[] = [
        { name: '', id: 1, email: 'service@bot.example.com' },
        { name: 'user', id: 2, email: 'user@people.dev' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('user')
    })
  })

  describe('Real-world scenarios from rdkcentral', () => {
    it('should handle copilot variants correctly', async () => {
      mockedGetUsernameAllowList.mockReturnValue(
        'copilot, Copilot, github-copilot[bot], github-copilot, copilot[bot], copilot-swe-agent[bot]'
      )

      const committers: CommittersDetails[] = [
        { name: 'copilot', id: 1, email: '[email protected]' },
        { name: 'Copilot', id: 2, email: '[email protected]' },
        { name: 'github-copilot[bot]', id: 3, email: '[email protected]' },
        { name: 'copilot[bot]', id: 4, email: '[email protected]' },
        { name: 'copilot-swe-agent[bot]', id: 5, email: '[email protected]' },
        { name: 'TB-1993', id: 6, email: '[email protected]' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('TB-1993')
    })

    it('should handle rdkcentral allowlist pattern', async () => {
      mockedGetUsernameAllowList.mockReturnValue(
        'dependabot*, dependabot[bot], dependabot, semantic-release-bot, rdkcm-rdke, rdkcm-bot, copilot, Copilot, github-copilot[bot], github-copilot, copilot[bot], copilot-swe-agent[bot]'
      )

      const committers: CommittersDetails[] = [
        { name: 'dependabot', id: 1, email: '[email protected]' },
        { name: 'dependabot[bot]', id: 2, email: '[email protected]' },
        { name: 'dependabot-preview', id: 3, email: '[email protected]' },
        { name: 'semantic-release-bot', id: 4, email: '[email protected]' },
        { name: 'rdkcm-bot', id: 5, email: '[email protected]' },
        { name: 'copilot', id: 6, email: '[email protected]' },
        { name: 'github-copilot[bot]', id: 7, email: '[email protected]' },
        { name: 'realuser123', id: 8, email: '[email protected]' }
      ]

      const result = await checkAllowList(committers)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('realuser123')
    })
  })

  describe('Advanced security tests', () => {
    it('should prevent allowlist bypass with null byte injection', async () => {
      mockedGetUsernameAllowList.mockReturnValue('bot*')

      const committers: CommittersDetails[] = [
        { name: 'bot\x00malicious', id: 1, email: '[email protected]' },
        { name: 'evil\x00bot', id: 2, email: '[email protected]' }
      ]

      const result = await checkAllowList(committers)

      expect(result.find(c => c.name === 'bot\x00malicious')).toBeUndefined()
      expect(result.find(c => c.name === 'evil\x00bot')).toBeDefined()
    })

    it('should prevent wildcard DoS with extremely long usernames', async () => {
      const longUsername = 'a'.repeat(10000) + 'bot'
      mockedGetUsernameAllowList.mockReturnValue('*bot')

      const committers: CommittersDetails[] = [
        { name: longUsername, id: 1, email: '[email protected]' }
      ]

      const start = Date.now()
      const result = await checkAllowList(committers)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(1000)
      expect(result).toHaveLength(0)
    })

    it('should handle Unicode characters in usernames safely', async () => {
      mockedGetUsernameAllowList.mockReturnValue('bot*,*bot')

      const committers: CommittersDetails[] = [
        { name: 'bot-🤖-user', id: 1, email: '[email protected]' },
        { name: '🤖-bot', id: 2, email: '[email protected]' },
        { name: 'bot', id: 3, email: '[email protected]' },
        { name: 'human', id: 4, email: '[email protected]' }
      ]

      const result = await checkAllowList(committers)

      expect(result.find(c => c.name === 'bot-🤖-user')).toBeUndefined()
      expect(result.find(c => c.name === '🤖-bot')).toBeUndefined()
      expect(result.find(c => c.name === 'bot')).toBeUndefined()
      expect(result.find(c => c.name === 'human')).toBeDefined()
    })

    it('should prevent domain bypass with look-alike domains', async () => {
      mockedGetDomainAllowList.mockReturnValue('@github.com')

      const committers: CommittersDetails[] = [
        { name: 'user1', id: 1, email: 'user@github.com' },
        { name: 'user2', id: 2, email: 'user@evil.github.com' },
        { name: 'user3', id: 3, email: 'user@github.com.evil.com' },
        { name: 'user4', id: 4, email: 'user@example.com' }
      ]

      const result = await checkAllowList(committers)

      expect(result.find(c => c.email === 'user@github.com')).toBeUndefined()
      expect(result.find(c => c.email === 'user@evil.github.com')).toBeDefined()
      expect(
        result.find(c => c.email === 'user@github.com.evil.com')
      ).toBeDefined()
      expect(result.find(c => c.email === 'user@example.com')).toBeDefined()
    })

    it('should keep GitHub privacy emails when only @github.com is allowlisted', async () => {
      mockedGetDomainAllowList.mockReturnValue('@github.com')

      const committers: CommittersDetails[] = [
        { name: 'actions-user', id: 65916846, email: 'action@github.com' },
        {
          name: 'regular-user',
          id: 12345,
          email: '12345+regular-user@users.noreply.github.com'
        },
        {
          name: 'another-user',
          id: 67890,
          email: '67890+another-user@users.noreply.github.com'
        },
        { name: 'evil-user', id: 99999, email: 'user@evil.github.com' }
      ]

      const result = await checkAllowList(committers)

      expect(result.find(c => c.name === 'actions-user')).toBeUndefined()
      expect(result.find(c => c.name === 'regular-user')).toBeDefined()
      expect(result.find(c => c.name === 'regular-user')?.email).toBe(
        '12345+regular-user@users.noreply.github.com'
      )
      expect(result.find(c => c.name === 'another-user')).toBeDefined()
      expect(result.find(c => c.name === 'evil-user')).toBeDefined()
    })

    it('should filter exact RDK CI domains and keep subdomains', async () => {
      mockedGetDomainAllowList.mockReturnValue('@code.rdkcentral.com')

      const committers: CommittersDetails[] = [
        {
          name: 'rdkcmf-jenkins',
          id: 19492671,
          email: 'github@code.rdkcentral.com'
        },
        {
          name: 'rdkcmf-jenkins-alt',
          id: 19492672,
          email: 'jenkins@code.rdkcentral.com'
        },
        { name: 'regular-user', id: 12345, email: 'regular-user@example.com' },
        { name: 'evil-user', id: 99999, email: 'user@evil.code.rdkcentral.com' }
      ]

      const result = await checkAllowList(committers)

      expect(
        result.filter(c => c.email?.endsWith('@code.rdkcentral.com'))
      ).toHaveLength(0)
      expect(result.find(c => c.name === 'regular-user')).toBeDefined()
      expect(result.find(c => c.name === 'evil-user')).toBeDefined()
    })
  })
})
