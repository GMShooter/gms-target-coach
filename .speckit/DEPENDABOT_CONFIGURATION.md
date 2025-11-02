# Dependabot Configuration for GMShoot v2

This document explains the automated dependency management setup using GitHub Dependabot for the GMShoot project.

## Overview

Dependabot is a GitHub service that automatically creates pull requests to keep dependencies up to date. This configuration ensures:

- **Security**: Automatic updates for vulnerable dependencies
- **Stability**: Controlled update process with proper testing
- **Efficiency**: Grouped updates to reduce PR noise
- **Visibility**: Clear labeling and commit message prefixes

## Configuration Structure

### Package Managers

The configuration monitors three package ecosystems:

1. **npm** - JavaScript/TypeScript dependencies
2. **docker** - Container base images
3. **github-actions** - CI/CD workflow dependencies

### Update Schedules

| Ecosystem | Frequency | Time | Day |
|------------|----------|------|-----|
| npm | Daily | 09:00 UTC | - |
| docker | Weekly | 10:00 UTC | Sunday |
| github-actions | Weekly | 08:00 UTC | Monday |
| security | Every 6 hours | 00:00, 06:00, 12:00, 18:00 UTC | - |

### Dependency Groups

#### npm Dependencies

- **react-related**: React and related packages
- **testing-related**: Jest, Cypress, Testing Library
- **build-related**: Vite, Webpack, CRACO
- **firebase-related**: Firebase SDK and tools
- **supabase-related**: Supabase client and libraries
- **ui-related**: Tailwind CSS, Headless UI, Heroicons

#### Docker Images

- **node-related**: Node.js base images
- **cypress-related**: Cypress testing images
- **supabase-related**: Supabase CLI and services

#### GitHub Actions

- **testing-actions**: Cypress, checkout, Node setup
- **deployment-actions**: Firebase, Supabase, Docker
- **security-actions**: Code scanning, artifact upload

### Update Policies

#### Allowed Updates

All dependency types are allowed:
- `direct` - Direct dependencies
- `indirect` - Transitive dependencies
- `development` - Development dependencies

#### Ignored Updates

Certain packages have major version updates ignored to prevent breaking changes:
- `react` - Major version updates ignored
- `@tanstack/react-query` - Major version updates ignored
- `supabase` - Major version updates ignored

#### Pull Request Limits

- **Regular updates**: 5 concurrent PRs
- **Docker updates**: 3 concurrent PRs
- **GitHub Actions**: 3 concurrent PRs
- **Security updates**: 10 concurrent PRs (higher priority)

### Labels and Commit Messages

#### Commit Message Prefixes

- `deps:` - Regular dependency updates
- `docker:` - Docker image updates
- `ci:` - GitHub Actions updates
- `security:` - Security vulnerability updates

#### Pull Request Labels

- `dependencies` - All dependency updates
- `automated` - All automated updates
- `docker` - Docker-specific updates
- `github-actions` - GitHub Actions updates
- `security` - Security updates
- `high-priority` - Security updates (additional label)

### Reviewers and Assignees

All pull requests are automatically:
- **Assigned to**: `shova` (project maintainer)
- **Requested review from**: `shova` (project maintainer)

## Security Updates

### Priority Handling

Security updates receive special treatment:
- **Higher PR limit**: 10 concurrent PRs
- **More frequent checks**: Every 6 hours
- **Priority labeling**: `security` + `high-priority`
- **All update types**: Major, minor, and security updates

### Vulnerability Response

When security vulnerabilities are detected:
1. **Immediate notification**: Dependabot creates PR within 6 hours
2. **High visibility**: PR labeled with `security` and `high-priority`
3. **Automated assignment**: PR assigned to maintainer
4. **Comprehensive scope**: All packages eligible for security updates

## Best Practices

### For Maintainers

1. **Review security PRs first**: Always prioritize `security` labeled PRs
2. **Test dependency groups**: Update related packages together
3. **Monitor breaking changes**: Pay attention to major version updates
4. **Check compatibility**: Ensure new versions work with existing code

### For Developers

1. **Don't manually update**: Let Dependabot handle routine updates
2. **Test PRs locally**: Before merging dependency updates
3. **Watch for conflicts**: Resolve merge conflicts promptly
4. **Review changelogs**: Understand breaking changes in updates

## Troubleshooting

### Common Issues

#### Dependabot Not Running

1. **Check repository settings**: Ensure Dependabot is enabled
2. **Verify file location**: `.github/dependabot.yml` must be in root
3. **Check YAML syntax**: Validate YAML formatting

#### Too Many PRs

1. **Adjust schedules**: Spread updates across different times
2. **Reduce PR limits**: Lower `open-pull-requests-limit`
3. **Group dependencies**: Use dependency groups effectively

#### Breaking Changes

1. **Review ignore rules**: Add problematic packages to ignore list
2. **Pin versions**: Manually update critical dependencies
3. **Use lock files**: Ensure `package-lock.json` is committed

### Manual Intervention

Sometimes you may need to manually intervene:

#### Emergency Security Updates

```bash
# Update specific vulnerable package
npm update package-name@latest
npm audit fix
git add package.json package-lock.json
git commit -m "security: emergency update for package-name"
git push
```

#### Resolving Conflicts

```bash
# Resolve Dependabot PR conflicts
git checkout dependabot-pr-branch
git pull origin main
# Resolve conflicts
git add .
git commit -m "resolve merge conflicts"
git push
```

## Monitoring and Maintenance

### Dashboard Monitoring

Monitor Dependabot activity through:
1. **GitHub Insights**: Dependencies tab in repository
2. **Pull requests**: Filter by `dependencies` label
3. **Security alerts**: GitHub Security tab for vulnerabilities

### Configuration Updates

When updating the configuration:

1. **Test YAML**: Use online YAML validator
2. **Update documentation**: Keep this file in sync
3. **Communicate changes**: Notify team of configuration updates
4. **Monitor effects**: Watch for unexpected behavior after changes

## Integration with CI/CD

### GitHub Actions Integration

Dependabot works seamlessly with existing GitHub Actions:
1. **Automatic testing**: PRs trigger existing test workflows
2. **Quality gates**: Tests must pass before merge
3. **Security scanning**: Additional security checks on PRs

### Docker Integration

Docker updates integrate with containerized development:
1. **Image updates**: Base images kept current
2. **Security patches**: Vulnerable images updated quickly
3. **Build verification**: Docker builds tested in CI

## Advanced Configuration

### Custom Update Strategies

For specific packages requiring special handling:

```yaml
# Example: Custom update strategy for critical package
- package-ecosystem: "npm"
  allow:
    - dependency-name: "critical-package"
  ignore:
    - dependency-name: "critical-package"
      update-types: ["version-update:semver-major"]
```

### Conditional Updates

For environment-specific dependencies:

```yaml
# Example: Different strategies for different environments
- package-ecosystem: "npm"
  directory: "/production"
  schedule:
    interval: "monthly"
  allow:
    - dependency-type: "production"
```

## Performance Considerations

### Optimization Tips

1. **Group related updates**: Reduces PR frequency
2. **Use appropriate schedules**: Avoid peak development hours
3. **Set reasonable limits**: Prevent PR overload
4. **Monitor build times**: Ensure updates don't slow CI

### Resource Usage

Dependabot resource usage:
- **API rate limits**: GitHub API limits apply
- **Build minutes**: Each PR consumes CI resources
- **Storage**: PRs temporarily increase repository size

## Security Best Practices

### Vulnerability Management

1. **Regular audits**: `npm audit` in CI pipeline
2. **Automated fixes**: `npm audit fix` where safe
3. **Dependency review**: Evaluate new packages before adding
4. **Security scanning**: Additional tools beyond Dependabot

### Compliance

For projects with specific compliance requirements:
1. **License checking**: Verify dependency licenses
2. **Supply chain security**: Monitor transitive dependencies
3. **Vulnerability disclosure**: Follow responsible disclosure

## Conclusion

This Dependabot configuration provides:
- **Automated security**: Proactive vulnerability management
- **Controlled updates**: Balanced stability and currency
- **Developer efficiency**: Reduced manual dependency management
- **Quality assurance**: Integrated testing and review process

Regular monitoring and maintenance of this configuration ensures continued effectiveness and security for the GMShoot project.