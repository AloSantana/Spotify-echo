# /plan - Task Planning Workflow

## Trigger
`/plan <goal description>`

## Steps

1. **Research** using `@agent:deep-research`
2. **Architecture** using `@agent:architect`
3. **Break down** into specific subtasks
4. **Assign** to appropriate agents
5. **Create** GitHub issues or PR description

## Output Format
```markdown
## Implementation Plan: <feature>

### Phase 1: Foundation
- [ ] Task 1 (@agent:architect)
- [ ] Task 2 (@agent:api-developer)

### Phase 2: Implementation
- [ ] Task 3 (@agent:rapid-implementer)

### Phase 3: Quality
- [ ] Task 4 (@agent:testing-stability-expert)
- [ ] Task 5 (@agent:code-reviewer)
- [ ] Task 6 (@agent:docs-master)
```
