# Skill Registry

**Project**: neumaticos-app
**Updated**: Mon Apr 20 2026

## Available Skills

### SDD Phases
| Skill | Description | Trigger |
|-------|------------|---------|
| sdd-init | Initialize SDD context | `sdd init` |
| sdd-explore | Investigate ideas | Explore tasks |
| sdd-propose | Create change proposal | New feature requests |
| sdd-spec | Write specifications | Spec writing tasks |
| sdd-design | Technical design | Design tasks |
| sdd-tasks | Task breakdown | Implementation planning |
| sdd-apply | Implementation | Coding tasks |
| sdd-verify | Verification | Testing/validation |
| sdd-archive | Archive completed | Closing changes |

### Utility Skills
| Skill | Description |
|-------|------------|
| go-testing | Go test patterns |
| skill-creator | Create new skills |
| skill-registry | Update this registry |

## Project Context

- **Stack**: Angular 21 + Ionic + Capacitor
- **Test Runner**: Vitest via `ng test`
- **Formatter**: Prettier
- **Type Check**: tsc (strict)

## Notes

- No test files exist; create `.spec.ts` manually or configure schematics
- ESLint not installed - consider adding `typescript-eslint`