# /test - Run Tests Workflow

## Trigger
`/test [scope]`

## Steps

1. **JavaScript tests**: `npm test -- --coverage`
2. **Python tests**: `pytest tests/ -v --cov=scripts`
3. **Integration tests**: `npm run test:integration`
4. **Generate coverage report**
5. **Identify gaps** with `@agent:testing-stability-expert`

## Example
```
/test Add tests for the new mood playlist feature
```
