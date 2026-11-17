# Repository Ruleset Configuration for CLA Enforcement

## Overview

This document describes the proven working repository ruleset configuration for enforcing CLA checks as a merge blocker. This configuration was tested and validated on `rdkcentral/cmf-release-app` (ruleset ID: 13201232).

## Verified Configuration

### Ruleset Details

- **Ruleset ID**: 13201232 (cmf-release-app test instance)
- **Name**: "Test: CLA Check Enforcement"
- **Enforcement**: `active`
- **Target**: Branch-based protection
- **Created**: 2026-02-24
- **Last Updated**: 2026-02-24

### Required Status Check Configuration

**CRITICAL**: This is the exact configuration that successfully blocks merges:

```json
{
  "type": "required_status_checks",
  "parameters": {
    "strict_required_status_checks_policy": true,
    "required_status_checks": [
      {
        "context": "CLA-Lite / Check",
        "integration_id": 15368
      }
    ]
  }
}
```

### Key Parameters Explained

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `context` | `"CLA-Lite / Check"` | **EXACT** status check name created by GitHub Actions workflow |
| `integration_id` | `15368` | GitHub Actions integration ID (ensures check comes from actual workflow, not spoofed status) |
| `strict_required_status_checks_policy` | `true` | Requires branch to be up-to-date before merging |

### Branch Targeting

The ruleset applies to these branch patterns:

```json
{
  "ref_name": {
    "include": [
      "refs/heads/test-*",
      "refs/heads/test-commits",
      "refs/heads/feature/test-commits",
      "~DEFAULT_BRANCH"
    ],
    "exclude": []
  }
}
```

**Note**: `~DEFAULT_BRANCH` is a special token that resolves to the repository's default branch (e.g., `main`, `master`, or `71-gitflow-actions`).

## Verification Results

### Successful Blocking Test

**Test PR**: [rdkcentral/cmf-release-app#27](https://github.com/rdkcentral/cmf-release-app/pull/27)

**Scenario**: PR with 3 unsigned contributors:
- `unsigned@example.com` (Unsigned User)
- `bob.dev@example.org` (Bob Developer)
- `charlie@test.org` + 2 co-authors (Alice Engineer, David Designer)

**Observed Behavior**:
1. CLA-Lite workflow runs and creates check run "CLA-Lite / Check"
2. Check run fails (unsigned contributors detected)
3. GitHub blocks merge with error message:
   ```
   Repository rule violations found for refs/heads/feature/test-commits.

   Required status check 'CLA-Lite / Check' is expected.
   ```
4. "Merge pull request" button disabled
5. "Update branch" button works (rebase/merge from base branch)

### Why This Configuration Works

1. **Integration ID enforcement**: Using `integration_id: 15368` ensures the check **must** come from GitHub Actions workflow, not a spoofed commit status created via API
2. **Exact context matching**: `"CLA-Lite / Check"` matches the check run name created by the workflow job
3. **Active enforcement**: No bypass actors defined, all users subject to rule
4. **Strict policy**: Prevents outdated branches from merging

## Deployment Guide

### Step 1: Prepare Ruleset JSON

Create a file `cla-enforcement-ruleset.json`:

```json
{
  "name": "CLA Check Enforcement",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["~DEFAULT_BRANCH"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          {
            "context": "CLA-Lite / Check",
            "integration_id": 15368
          }
        ]
      }
    }
  ],
  "bypass_actors": []
}
```

### Step 2: Apply to Repository

Using GitHub CLI:

```bash
# Apply to a repository
gh api repos/OWNER/REPO/rulesets \
  --method POST \
  --input cla-enforcement-ruleset.json

# Example for rdkcentral organization
gh api repos/rdkcentral/REPO_NAME/rulesets \
  --method POST \
  --input cla-enforcement-ruleset.json
```

### Step 3: Verify Ruleset

```bash
# List all rulesets
gh api repos/OWNER/REPO/rulesets

# View specific ruleset (get ID from list command)
gh api repos/OWNER/REPO/rulesets/RULESET_ID
```

### Step 4: Test Enforcement

1. Create test branch with unsigned commits
2. Open PR to protected branch
3. Verify CLA check fails
4. Verify merge is blocked with error message
5. Sign CLA (or add to allowlist)
6. Trigger recheck via comment: `@cla-bot-lite recheck`
7. Verify check passes
8. Verify merge is now allowed

## Production Rollout Plan

### Phase 1: Low-Risk Repositories (Week 1)
- Apply to 2-3 low-activity repositories
- Monitor for false positives
- Gather feedback from contributors

### Phase 2: Medium-Risk Repositories (Week 2-3)
- Apply to active development repositories
- Ensure contributor education is in place
- Have rapid response plan for issues

### Phase 3: High-Risk Repositories (Week 4+)
- Apply to critical repositories with high PR volume
- Consider temporary bypass actors for emergency situations
- Full monitoring and alerting

### Rollback Plan

If issues occur:

```bash
# Disable ruleset (keep configuration)
gh api repos/OWNER/REPO/rulesets/RULESET_ID \
  --method PATCH \
  -f enforcement=disabled

# Or delete entirely
gh api repos/OWNER/REPO/rulesets/RULESET_ID \
  --method DELETE
```

## Integration ID Reference

| Integration | ID | Purpose |
|-------------|----|---------|
| GitHub Actions | `15368` | Workflow-based checks (used for CLA-Lite) |
| GitHub App | varies | Custom GitHub App checks (if using app-based CLA) |
| Any source | omit `integration_id` | Accept check from any source (less secure) |

**Security Note**: Always specify `integration_id: 15368` for CLA-Lite to prevent status spoofing attacks where malicious users create fake passing statuses.

## Status Check Name Reference

The action creates a **check run** (not a commit status) with these characteristics:

- **Check Suite**: Created automatically by GitHub Actions
- **Check Run Name**: Defined by workflow job name
- **Format**: `{workflow_name} / {job_name}`
- **Example**: `"CLA-Lite / Check"`
  - Workflow name: `"CLA-Lite"` (from workflow file `name:` field)
  - Job name: `"Check"` (from job ID in workflow)

**IMPORTANT**: The ruleset `context` field must match this EXACT format including spacing around `/`.

### Common Mistakes

❌ **Wrong**: `"CLA-Lite/Check"` (no spaces)
❌ **Wrong**: `"CLA-Lite/check"` (lowercase job name)
❌ **Wrong**: `"Signature / Check"` (old status context name)
✅ **Correct**: `"CLA-Lite / Check"` (exact match with spaces)

## Workflow Configuration Requirements

For rulesets to work, ensure your CLA workflow:

1. **Has a defined name**:
   ```yaml
   name: CLA-Lite
   ```

2. **Has a named job**:
   ```yaml
   jobs:
     Check:  # This becomes the job name
       name: Check  # Optional display name
   ```

3. **Runs on correct triggers**:
   ```yaml
   on:
     pull_request_target:
       types: [opened, synchronize, reopened]
     issue_comment:
       types: [created]
   ```

4. **Uses GitHub Actions token** (not PAT):
   ```yaml
   with:
     GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
   ```

## Migration from Legacy Branch Protection

If you're currently using legacy branch protection rules with commit statuses:

### Old Configuration (Commit Status)
- Status name: `"Signature / Check"`
- Created via: `updateStatus()` function
- Type: Commit status
- **Problem**: Deprecated in action v2.7.0, creates duplicate checks

### New Configuration (Check Run)
- Check name: `"CLA-Lite / Check"`
- Created via: GitHub Actions workflow check run (automatic)
- Type: Check run
- **Benefit**: Native GitHub Actions integration, better UI, single source of truth

### Migration Steps

1. Update action to v2.7.0+
2. Remove `status-context` input from workflow (deprecated)
3. Create repository ruleset (see above)
4. Test with unsigned contributor PR
5. Delete legacy branch protection rule
6. Monitor for 1 week
7. Apply to remaining repositories

## Monitoring and Alerts

### Key Metrics

Track these metrics to ensure rulesets are working correctly:

- **Merge block rate**: PRs blocked by CLA check
- **False positive rate**: Valid contributors blocked
- **Recheck success rate**: Blocked PRs that pass after recheck
- **Time to resolution**: How long contributors wait after signing CLA

### Alert Conditions

Set up alerts for:
- Ruleset disabled or deleted unexpectedly
- High false positive rate (>5%)
- Significant increase in blocked PRs
- Integration ID mismatch errors

## Troubleshooting

### Issue: Merge not blocked despite failing check

**Cause**: Integration ID mismatch or wrong context name

**Solution**:
```bash
# Check exact check run name from a PR
gh pr checks PR_NUMBER --json name,conclusion

# Verify ruleset configuration
gh api repos/OWNER/REPO/rulesets/RULESET_ID | jq '.rules[0].parameters'
```

### Issue: All PRs blocked even with passing CLA

**Cause**: Check run name doesn't match ruleset context

**Solution**: Update ruleset context to match EXACT workflow job name format

### Issue: Bypass actors not working

**Cause**: Ruleset enforcement conflicts with bypass configuration

**Solution**: Verify bypass actor IDs and types:
```json
{
  "bypass_actors": [
    {
      "actor_id": 1,
      "actor_type": "Integration",
      "bypass_mode": "always"
    }
  ]
}
```

## References

- **Test Ruleset**: [rdkcentral/cmf-release-app ruleset 13201232](https://github.com/rdkcentral/cmf-release-app/settings/rules/13201232)
- **Test PR**: [rdkcentral/cmf-release-app#27](https://github.com/rdkcentral/cmf-release-app/pull/27)
- **GitHub Docs**: [About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- **API Reference**: [Repository rulesets API](https://docs.github.com/en/rest/repos/rules)

## Appendix: Full Working Ruleset JSON

This is the complete, tested configuration from cmf-release-app:

```json
{
  "id": 13201232,
  "name": "Test: CLA Check Enforcement",
  "target": "branch",
  "source_type": "Repository",
  "source": "rdkcentral/cmf-release-app",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": [
        "refs/heads/test-*",
        "refs/heads/test-commits",
        "refs/heads/feature/test-commits",
        "~DEFAULT_BRANCH"
      ],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          {
            "context": "CLA-Lite / Check",
            "integration_id": 15368
          }
        ]
      }
    }
  ],
  "bypass_actors": [],
  "node_id": "RRS_kwDOMzDxQc4Azv-Q",
  "_links": {
    "self": {
      "href": "https://api.github.com/repos/rdkcentral/cmf-release-app/rulesets/13201232"
    },
    "html": {
      "href": "https://github.com/rdkcentral/cmf-release-app/settings/rules/13201232"
    }
  },
  "created_at": "2026-02-24T22:51:20Z",
  "updated_at": "2026-02-24T23:04:38Z"
}
```

---

**Document Version**: 1.0
**Last Updated**: 2026-02-24
**Validated Against**: contributor-assistant_github-action v2.7.0
**Test Environment**: rdkcentral/cmf-release-app PR #27
