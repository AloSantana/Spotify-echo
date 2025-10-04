# Reports Directory

This folder holds machine-generated and semi-automated reports created by CI, MCP validations, and the Copilot agent. Do not hand-edit generated files.

## AWS Bedrock Evidence Reports

**Critical validation artifacts** (evidence-based, not narrative):

- `aws-identity.json` - AWS account identity verification (STS)
- `bedrock-models.json` - Available Bedrock models listing
- `bedrock-inference-profiles.json` - Inference profiles (if available)
- `bedrock-invocation-summary.json` - Aggregated invocation results with costs
- `bedrock-metrics.json` - CloudWatch metrics snapshot (15-30 min delay)
- `bedrock-evidence-complete.json` - Comprehensive evidence bundle with validation status

See [AWS_BEDROCK_REAL_VALIDATION.md](../docs/AWS_BEDROCK_REAL_VALIDATION.md) for complete guide.

## Other Planned Artifacts

- sbom.json (CycloneDX)
- code-graph.md (dependency diagrams)
- redundancy-audit.md (unused files, stale docs)
- mcp-health.md (MCP server health snapshots)
- perf-baseline.json and trend charts
- lighthouse-report.html
- security-scan.md and npm-audit.json