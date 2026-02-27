# /debug - Debug Issue Workflow

## Trigger
`/debug <issue description>`

## Steps

1. **Reproduce** the issue with minimal steps
2. **Investigate** using `@agent:debug-detective`
   - Check application logs
   - Analyze git history for regression
   - Trace Spotify API calls if OAuth-related
   - Profile MongoDB queries if performance-related
3. **Fix** using `@agent:rapid-implementer`
4. **Prevent** recurrence with `@agent:testing-stability-expert`

## Example
```
/debug Spotify recommendations return empty array for new users
```
