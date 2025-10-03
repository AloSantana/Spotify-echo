# AWS Bedrock Integration - Known Issues & Limitations

This document tracks known issues, limitations, and workarounds for the AWS Bedrock integration.

## Known Issues

### Critical Issues

#### None Currently

No critical issues are currently known. Please report any critical issues immediately.

### High Priority Issues

#### 1. Rate Limiting Not Enforced by AWS SDK

**Issue**: The AWS Bedrock SDK does not automatically enforce rate limits. Applications must implement their own rate limiting.

**Impact**: High - Can lead to ThrottlingException errors and service disruptions

**Workaround**: Use the built-in RateLimiter class:
```javascript
const { RateLimiter } = require('./scripts/aws-bedrock-utils');
const limiter = new RateLimiter(60); // 60 requests/minute

await limiter.acquire();
const response = await invokeModel(params);
```

**Status**: Mitigated by utility classes

#### 2. Model Availability Varies by Region

**Issue**: Not all models are available in all AWS regions. The configuration file lists general availability but actual access depends on account and region.

**Impact**: High - Tests may fail in certain regions even with valid credentials

**Workaround**: 
- Always test in your target region
- Check model availability in AWS Console
- Request model access for your region if needed

**Status**: Documented in troubleshooting guide

### Medium Priority Issues

#### 3. GitHub Copilot Model Selection

**Issue**: This integration provides testing tools but does NOT control which model GitHub Copilot uses for code suggestions.

**Impact**: Medium - Users may expect this to change Copilot behavior

**Workaround**: Contact GitHub Support to request specific model access for Copilot

**Status**: Clearly documented with disclaimers in multiple locations

#### 4. Token Count Estimates

**Issue**: Token counting is approximate and may not match exact billing. The integration uses response metadata which may differ from final charges.

**Impact**: Medium - Cost tracking may have minor discrepancies

**Workaround**: 
- Use AWS Cost Explorer for accurate billing
- Treat integration cost tracking as estimates
- Add 5-10% buffer for cost projections

**Status**: Documented in production guide

#### 5. Inference Profile ARN Support

**Issue**: Cross-region inference profiles require specific ARN formats that may change as AWS updates the service.

**Impact**: Medium - May require configuration updates after AWS changes

**Workaround**: 
- Keep configuration file updated
- Monitor AWS Bedrock announcements
- Test inference profiles before production use

**Status**: Configuration includes inference profile support

### Low Priority Issues

#### 6. Streaming Response Buffer Management

**Issue**: Streaming responses accumulate in memory. Very long responses could cause memory issues.

**Impact**: Low - Only affects very long streaming responses

**Workaround**: 
- Set reasonable max_tokens limits
- Process streaming chunks incrementally
- Monitor memory usage for long sessions

**Status**: Best practices documented

#### 7. Legacy Model Key Mapping

**Issue**: Some legacy model keys may not map correctly to current model IDs.

**Impact**: Low - Affects backward compatibility only

**Workaround**: Use BackwardCompatibility helper:
```javascript
const { BackwardCompatibility } = require('./scripts/aws-bedrock-utils');
const currentKey = BackwardCompatibility.convertLegacyModelKey(legacyKey);
```

**Status**: Utility class provides mapping

## Limitations

### AWS Service Limitations

1. **Request Size Limits**
   - Maximum request body size: 25 MB
   - Maximum context window varies by model (200K tokens for Claude 3+)
   - Maximum output tokens varies by model (4K-8K typically)

2. **Rate Limits**
   - Varies by model and account
   - Burst capacity available but limited
   - Quotas can be increased via AWS support ticket

3. **Regional Availability**
   - Not all models available in all regions
   - New models may launch in limited regions initially
   - Some models require explicit access requests

4. **Model Deprecation**
   - Older models may be deprecated over time
   - Advance notice provided but migration required
   - Deprecated models excluded from tests by default

### Integration Limitations

1. **No Direct Copilot Control**
   - Cannot control GitHub Copilot's model selection
   - Integration is for testing and development only
   - Copilot behavior managed by GitHub

2. **Testing Without Live API**
   - Unit tests use mocks and don't validate actual API behavior
   - Integration tests require valid AWS credentials
   - Cannot fully test without AWS account

3. **Cost Tracking Accuracy**
   - Estimates based on token counts
   - May not match final AWS billing exactly
   - Use AWS Cost Explorer for accurate costs

4. **Limited Offline Functionality**
   - Most features require AWS connectivity
   - Health checks need network access
   - Cannot test models offline

5. **Configuration Management**
   - Manual configuration file updates required
   - No automatic model discovery
   - Must monitor AWS for new models

## Workarounds

### Testing Without AWS Credentials

Use environment variables to skip credential-dependent tests:

```bash
# Run health check without credentials
SKIP_AWS_CHECKS=true npm run bedrock:health

# Run tests with mocks
npm test tests/unit/  # Unit tests don't need credentials
```

### Handling Regional Differences

Use region fallback logic:

```javascript
const regions = ['us-east-1', 'us-west-2', 'eu-west-1'];

async function invokeWithFallback(params) {
  for (const region of regions) {
    try {
      return await invokeModel(params, region);
    } catch (error) {
      console.log(`Failed in ${region}, trying next...`);
      if (region === regions[regions.length - 1]) {
        throw error; // Last region, rethrow
      }
    }
  }
}
```

### Managing Costs

Implement cost controls:

```javascript
const { CostTracker } = require('./scripts/aws-bedrock-monitor');

const costTracker = new CostTracker();
const maxDailyCost = 50.0;

// Before making request
const costs = costTracker.getCosts();
if (parseFloat(costs.total) > maxDailyCost) {
  throw new Error('Daily cost limit exceeded');
}

// After request
costTracker.recordCost(modelKey, inputTokens, outputTokens);
```

### Handling Model Deprecation

Use fallback model hierarchy:

```javascript
const modelHierarchy = [
  'claude-sonnet-4-5',
  'claude-3-5-sonnet-v2',
  'claude-3-sonnet',
  'claude-3-haiku'  // Fallback to fastest/cheapest
];

async function invokeWithFallback(prompt) {
  for (const modelKey of modelHierarchy) {
    try {
      return await invokeModel(modelKey, prompt);
    } catch (error) {
      if (error.message.includes('not found')) {
        continue; // Try next model
      }
      throw error; // Other error, don't retry
    }
  }
  throw new Error('No models available');
}
```

## Reporting New Issues

### Before Reporting

1. Check this document for known issues
2. Review troubleshooting guide
3. Verify issue reproduces consistently
4. Test with latest version of integration

### What to Include

1. **Environment Details**
   - Node.js version
   - AWS SDK version
   - Operating system
   - AWS region

2. **Error Information**
   - Full error message and stack trace
   - HTTP status code if applicable
   - Request ID if available
   - Timestamp

3. **Reproduction Steps**
   - Minimal code to reproduce
   - Configuration used (sanitized)
   - Expected vs actual behavior
   - Frequency of occurrence

4. **Attempted Solutions**
   - What you've already tried
   - Which workarounds were attempted
   - Results of troubleshooting steps

### Where to Report

- **Critical Issues**: Report immediately to team lead
- **Security Issues**: Follow security disclosure process
- **Bugs**: Open GitHub issue with template
- **Feature Requests**: Discuss in team channels first
- **Questions**: Check documentation and ask in team channels

## Issue Tracking

| Issue ID | Priority | Status | Resolution Target |
|----------|----------|--------|-------------------|
| None currently tracked | - | - | - |

## Version History

### Version 1.0.0 (Current)

**Fixed in This Version**:
- Initial comprehensive implementation
- Error handling with retry logic
- Rate limiting support
- Backward compatibility helpers
- Health monitoring system

**Known Issues Added**:
- All issues listed above

**Limitations Added**:
- All limitations listed above

## Maintenance Notes

### Regular Review Schedule

- **Weekly**: Check for new AWS Bedrock announcements
- **Monthly**: Review model availability and pricing
- **Quarterly**: Update configuration for new models
- **Annually**: Review and update all documentation

### Monitoring Recommendations

1. Set up alerts for:
   - High error rates (>5%)
   - Elevated latency (P95 >5s)
   - Approaching cost limits
   - Model deprecation notices

2. Regular checks:
   - AWS Service Health Dashboard
   - Bedrock service announcements
   - GitHub Copilot updates
   - SDK version updates

3. Proactive maintenance:
   - Test new models before production
   - Update documentation when issues resolved
   - Share learnings with team
   - Keep dependencies updated

## Related Documentation

- [Troubleshooting Guide](./AWS_BEDROCK_TROUBLESHOOTING.md)
- [Production Guide](./AWS_BEDROCK_PRODUCTION_GUIDE.md)
- [API Reference](./AWS_BEDROCK_API_REFERENCE.md)
- [Test Guide](./AWS_BEDROCK_COMPREHENSIVE_TEST_GUIDE.md)
