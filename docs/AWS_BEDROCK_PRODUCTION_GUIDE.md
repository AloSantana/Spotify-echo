# AWS Bedrock Integration - Production Ready Guide

## ⚠️ Important Disclaimers

### GitHub Copilot Control

**IMPORTANT**: This AWS Bedrock integration is designed to work **alongside** GitHub Copilot, but **GitHub Copilot controls which model it uses internally**. The AWS Bedrock integration provides:

1. **Testing Infrastructure**: Tools to validate AWS Bedrock model access
2. **Model Management**: Session tracking and model switching for development workflows
3. **Monitoring**: Visibility into model usage and performance
4. **Development Tools**: Command-line utilities for model testing and debugging

**What This Integration Does**:
- ✅ Tests AWS Bedrock model availability
- ✅ Validates IAM permissions and credentials
- ✅ Provides model switching for development workflows
- ✅ Tracks model usage and session statistics
- ✅ Generates reports on model performance

**What This Integration Does NOT Do**:
- ❌ Control which model GitHub Copilot uses for code suggestions
- ❌ Replace GitHub Copilot's model selection logic
- ❌ Modify GitHub Copilot's behavior or responses
- ❌ Override GitHub Copilot's API calls

### GitHub Copilot Model Selection

GitHub Copilot's model selection is controlled by:
- GitHub's backend infrastructure
- Your GitHub Copilot subscription tier
- GitHub's model availability and routing logic
- GitHub's usage policies and rate limiting

**To influence GitHub Copilot model selection**, you must:
1. Contact GitHub Support
2. Check your GitHub Copilot settings in your GitHub account
3. Review GitHub Copilot documentation for available models
4. Ensure your subscription includes access to desired models

### Use Cases for This Integration

This AWS Bedrock integration is ideal for:

1. **Development & Testing**
   - Test AWS Bedrock model access before deploying to production
   - Validate IAM permissions and credentials
   - Compare model responses for different use cases
   - Debug model-specific issues

2. **Custom Applications**
   - Build custom AI features using AWS Bedrock directly
   - Integrate AWS Bedrock models into your application logic
   - Create specialized workflows that require specific models
   - Implement fallback strategies across multiple models

3. **Monitoring & Analytics**
   - Track model usage and token consumption
   - Monitor model performance and latency
   - Generate reports on model availability
   - Analyze cost implications of different models

4. **Development Workflows**
   - Switch between models for different tasks
   - Test prompts across multiple model families
   - Validate model behavior in different regions
   - Manage model configurations centrally

## Production Deployment

### Prerequisites

1. **AWS Account Setup**
   - Valid AWS account with Bedrock access
   - IAM user or role with proper permissions
   - Models enabled in AWS Bedrock console
   - Access keys properly configured

2. **Environment Configuration**
   ```bash
   # Required
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=us-east-1
   
   # Optional
   BEDROCK_DEFAULT_MODEL=claude-sonnet-4-5
   BEDROCK_MAX_RETRIES=3
   BEDROCK_RATE_LIMIT_PER_MINUTE=60
   ```

3. **Dependencies**
   ```bash
   npm install @aws-sdk/client-bedrock-runtime
   ```

### IAM Permissions

Required IAM policy for production use:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockModelInvocation",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-*",
        "arn:aws:bedrock:*::foundation-model/amazon.titan-*",
        "arn:aws:bedrock:*::foundation-model/deepseek.*"
      ]
    },
    {
      "Sid": "BedrockModelDiscovery",
      "Effect": "Allow",
      "Action": [
        "bedrock:ListFoundationModels",
        "bedrock:GetFoundationModel"
      ],
      "Resource": "*"
    }
  ]
}
```

### Security Best Practices

1. **Credentials Management**
   - ✅ Use IAM roles instead of access keys when possible
   - ✅ Rotate credentials regularly (every 90 days)
   - ✅ Use AWS Secrets Manager for production credentials
   - ✅ Never commit credentials to version control
   - ✅ Use environment variables for configuration

2. **Least Privilege Principle**
   - Only grant permissions to models you need
   - Restrict access to specific regions if possible
   - Use Service Control Policies (SCPs) for organization-wide controls
   - Implement resource tags for cost tracking

3. **Monitoring & Auditing**
   - Enable CloudTrail logging for Bedrock API calls
   - Set up CloudWatch alarms for unusual activity
   - Monitor usage patterns and costs
   - Implement rate limiting and throttling
   - Review logs regularly for security incidents

4. **Network Security**
   - Use VPC endpoints for Bedrock when possible
   - Implement proper firewall rules
   - Use TLS 1.2 or higher for all connections
   - Consider using AWS PrivateLink for sensitive workloads

### Error Handling in Production

The integration includes comprehensive error handling:

```javascript
const { RetryHandler, BedrockErrorHandler } = require('./scripts/aws-bedrock-utils');

// Automatic retry with exponential backoff
const result = await RetryHandler.withRetry(async () => {
  return await invokeModel(params);
}, {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000
});

// Error categorization and actionable insights
try {
  await invokeModel(params);
} catch (error) {
  const errorDetails = BedrockErrorHandler.categorizeError(error);
  console.error(BedrockErrorHandler.formatError(errorDetails));
  
  // Implement fallback logic based on error category
  if (errorDetails.category === 'model_availability') {
    // Try alternative model or region
  }
}
```

### Performance Optimization

1. **Connection Pooling**
   ```javascript
   const { BedrockClientManager } = require('./scripts/aws-bedrock-utils');
   
   const clientManager = new BedrockClientManager();
   const client = clientManager.getClient('us-east-1', credentials);
   ```

2. **Rate Limiting**
   ```javascript
   const { RateLimiter } = require('./scripts/aws-bedrock-utils');
   
   const limiter = new RateLimiter(60); // 60 requests per minute
   
   await limiter.acquire();
   const response = await invokeModel(params);
   ```

3. **Caching**
   - Implement response caching for repeated queries
   - Use Redis or similar for distributed caching
   - Set appropriate TTL based on content freshness needs
   - Cache model metadata and configuration

### Monitoring & Observability

1. **Metrics to Track**
   - Request latency (p50, p95, p99)
   - Error rates by category
   - Token usage and costs
   - Model availability
   - Rate limit hits

2. **Logging Strategy**
   ```javascript
   // Structured logging example
   {
     timestamp: "2025-01-15T10:30:00Z",
     level: "info",
     event: "model_invocation",
     model_id: "anthropic.claude-sonnet-4-5",
     region: "us-east-1",
     latency_ms: 1234,
     tokens_used: 567,
     success: true
   }
   ```

3. **Alerting**
   - Error rate exceeds threshold
   - Latency spikes
   - Rate limit approaching
   - Unusual token consumption
   - Model unavailability

### Cost Management

1. **Token Tracking**
   - Monitor input and output tokens per request
   - Track cumulative usage by model
   - Set up budget alerts in AWS Cost Explorer
   - Implement usage quotas per user/application

2. **Model Selection Strategy**
   - Use smaller models for simple tasks
   - Reserve expensive models for complex operations
   - Implement model fallback hierarchy
   - Test with different models to optimize cost/quality

3. **Optimization Techniques**
   - Reduce max_tokens where possible
   - Implement prompt caching
   - Batch similar requests when feasible
   - Use streaming to reduce perceived latency

### Deployment Checklist

- [ ] AWS credentials configured and tested
- [ ] IAM permissions validated
- [ ] Models enabled in AWS Bedrock console
- [ ] Environment variables set correctly
- [ ] Error handling implemented
- [ ] Retry logic configured
- [ ] Rate limiting enabled
- [ ] Monitoring and logging set up
- [ ] Cost tracking configured
- [ ] Security review completed
- [ ] Load testing performed
- [ ] Fallback strategies implemented
- [ ] Documentation updated
- [ ] Team training completed

### Rollback Procedures

If issues occur in production:

1. **Immediate Actions**
   - Disable AWS Bedrock integration if causing critical failures
   - Switch to fallback/mock implementation
   - Check AWS Service Health Dashboard
   - Review CloudWatch logs and metrics

2. **Investigation**
   - Identify error patterns
   - Check for credential or permission issues
   - Verify model availability in region
   - Review recent changes

3. **Recovery**
   - Fix identified issues
   - Test in staging environment
   - Gradual rollout to production
   - Monitor closely after deployment

### Support & Troubleshooting

1. **Common Issues**
   - See [Troubleshooting Guide](./AWS_BEDROCK_TROUBLESHOOTING.md)
   - Check [Known Issues](./AWS_BEDROCK_KNOWN_ISSUES.md)

2. **Getting Help**
   - Internal: Check project documentation and team channels
   - AWS Support: For Bedrock-specific issues
   - GitHub Issues: For integration bugs or feature requests

3. **Escalation Path**
   - Level 1: Team lead or senior developer
   - Level 2: AWS support for service issues
   - Level 3: Architecture review for design changes

## Migration from Legacy Code

If migrating from legacy AWS Bedrock implementations:

1. **Backward Compatibility**
   ```javascript
   const { BackwardCompatibility } = require('./scripts/aws-bedrock-utils');
   
   // Convert legacy model keys
   const newKey = BackwardCompatibility.convertLegacyModelKey('claude-v2');
   
   // Normalize response format
   const response = await invokeModel(params);
   const normalized = BackwardCompatibility.normalizeResponse(response);
   ```

2. **Migration Steps**
   - Audit existing code for AWS Bedrock usage
   - Update model IDs to current format
   - Replace direct client instantiation with ClientManager
   - Add error handling and retry logic
   - Implement rate limiting
   - Update tests and documentation
   - Deploy with feature flags for gradual rollout

## Version Compatibility

| Integration Version | AWS SDK Version | Node.js Version | Status |
|---------------------|-----------------|-----------------|--------|
| 1.0.x | ^3.900.0 | >=16.x | ✅ Supported |
| 0.9.x | ^3.800.0 | >=14.x | ⚠️ Legacy |

## License & Legal

This integration is provided as-is under the project license. AWS Bedrock usage is subject to:
- AWS Service Terms
- AWS Acceptable Use Policy
- Model-specific terms and conditions
- Your organization's AWS agreement

## Additional Resources

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [AWS Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/)
- [AWS Security Best Practices](https://docs.aws.amazon.com/bedrock/latest/userguide/security-best-practices.html)
- [Model Access Request](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html)
