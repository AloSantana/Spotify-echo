# Sample AWS Bedrock Integration Test Results

**Generated**: 2025-01-15T12:00:00.000Z  
**Region**: us-east-1  
**Models Tested**: Claude Sonnet 4.5, Claude Opus 4.1  

## Summary

| Metric | Count |
|--------|-------|
| Total Tests | 8 |
| ✅ Passed | 8 |
| ❌ Failed | 0 |

## Test Results

### Claude Sonnet 4.5 - Basic Invocation

**Status**: ✅ PASSED  
**Latency**: 1,234ms  
**Response Length**: 312 characters  
**Tokens**: 45 input / 78 output

### Claude Sonnet 4.5 - Streaming Invocation

**Status**: ✅ PASSED  
**Latency**: 2,156ms  
**Chunks**: 42  
**Response Length**: 487 characters

### Claude Sonnet 4.5 - Retry Logic

**Status**: ✅ PASSED  
**Retry Attempts**: 2 (succeeded on second attempt)

### Claude Sonnet 4.5 - Error Handling

**Status**: ✅ PASSED  
**Note**: Validation error properly caught

---

### Claude Opus 4.1 - Basic Invocation

**Status**: ✅ PASSED  
**Latency**: 2,345ms  
**Response Length**: 524 characters  
**Tokens**: 52 input / 131 output

### Claude Opus 4.1 - Streaming Invocation

**Status**: ✅ PASSED  
**Latency**: 3,123ms  
**Chunks**: 67  
**Response Length**: 689 characters

### Claude Opus 4.1 - Retry Logic

**Status**: ✅ PASSED  
**Retry Attempts**: 2 (succeeded on second attempt)

### Claude Opus 4.1 - Error Handling

**Status**: ✅ PASSED  
**Note**: Validation error properly caught

## Performance Summary

| Model | Avg Latency | Avg Response Length |
|-------|-------------|---------------------|
| Claude Sonnet 4.5 | 1,695ms | 400 chars |
| Claude Opus 4.1 | 2,734ms | 607 chars |

## Notes

- All models responded within acceptable timeframes
- Retry logic properly handled transient errors
- Error handling validated with intentional validation errors
- Streaming worked correctly for both models
- Token usage was within expected ranges

## Recommendations

✅ **Production Ready**: All tests passed successfully  
✅ **Retry Logic**: Confirmed working with exponential backoff  
✅ **Error Handling**: Proper validation and error messages  
✅ **Performance**: Both models performing within SLA  

## Raw JSON Results

```json
{
  "timestamp": "2025-01-15T12:00:00.000Z",
  "region": "us-east-1",
  "tests": [
    {
      "name": "Claude Sonnet 4.5 - Basic Invocation",
      "modelKey": "claude-sonnet-4-5",
      "status": "passed",
      "latency": 1234,
      "responseLength": 312,
      "tokenUsage": {
        "input_tokens": 45,
        "output_tokens": 78
      }
    },
    {
      "name": "Claude Sonnet 4.5 - Streaming Invocation",
      "modelKey": "claude-sonnet-4-5",
      "status": "passed",
      "latency": 2156,
      "chunkCount": 42,
      "responseLength": 487
    }
  ],
  "summary": {
    "total": 8,
    "passed": 8,
    "failed": 0
  }
}
```

---

**Test Suite**: AWS Bedrock Production Integration Tests  
**Version**: 1.0.0  
**Execution Time**: ~15 seconds
