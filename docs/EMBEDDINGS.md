# 🧠 Embedding Provider Documentation

## Overview

EchoTune AI's semantic recommendation strategy uses embedding vectors to understand musical similarity and user preferences through natural language understanding. This document outlines the supported embedding providers, configuration, and implementation details.

## Supported Providers

### 1. OpenAI Embeddings (Recommended)
- **Provider**: `openai`
- **Models**: 
  - `text-embedding-3-small` (1536 dimensions) - **Default**
  - `text-embedding-3-large` (3072 dimensions) - Higher quality
- **Cost**: $0.02/$0.13 per 1M tokens
- **Use Case**: Production-ready with excellent semantic understanding

```env
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
OPENAI_API_KEY=sk-your-key-here
```

### 2. Cohere Embeddings
- **Provider**: `cohere`
- **Models**: `embed-english-v3.0` (1024 dimensions)
- **Cost**: ~$0.10 per 1M tokens
- **Use Case**: Good alternative with strong multilingual support

```env
EMBEDDING_PROVIDER=cohere
EMBEDDING_MODEL=embed-english-v3.0
COHERE_API_KEY=your-key-here
```

### 3. Sentence Transformers (Local)
- **Provider**: `sentence-transformers`
- **Models**: `all-MiniLM-L6-v2` (384 dimensions)
- **Cost**: Free (local inference)
- **Use Case**: Cost-effective for high-volume usage, requires local setup

```env
EMBEDDING_PROVIDER=sentence-transformers
EMBEDDING_MODEL=all-MiniLM-L6-v2
# No API key required - uses local model server
```

## Configuration

### Environment Variables

```env
# Required: Choose embedding provider
EMBEDDING_PROVIDER=openai  # openai | cohere | sentence-transformers

# Optional: Specify model (uses provider default if not set)
EMBEDDING_MODEL=text-embedding-3-small

# Provider-specific API keys
OPENAI_API_KEY=sk-...        # For OpenAI
COHERE_API_KEY=...           # For Cohere
# No key needed for sentence-transformers
```

### Recommendation Weights

The semantic strategy is weighted at **20%** in the hybrid recommendation system (see `config/recommendationWeights.json`):

```json
{
  "strategies": {
    "collaborative": 0.4,
    "content": 0.3,
    "semantic": 0.2,      // ← Semantic embedding weight
    "diversityBonus": 0.1
  }
}
```

## Implementation Details

### Embedding Generation Pipeline

1. **Track Embeddings**: Pre-computed embeddings for all tracks in the database
   - Generated from track metadata (title, artist, genre, description)
   - Stored in MongoDB collection: `track_embeddings`
   - Normalized vectors for efficient similarity computation

2. **Query Embeddings**: Real-time embeddings for user queries
   - User messages, mood descriptions, activity contexts
   - Cached common queries for performance
   - Generated on-demand for novel queries

3. **Similarity Computation**: Cosine similarity between query and track embeddings
   - Threshold: 0.7 minimum similarity
   - Weighted by embedding confidence
   - Ranked by semantic relevance

### Database Schema

```javascript
// track_embeddings collection
{
  _id: ObjectId,
  trackId: "spotify:track:...",
  embedding: [0.1, -0.2, 0.3, ...], // Normalized vector
  metadata: {
    title: "Track Title",
    artist: "Artist Name",
    genre: "pop",
    description: "Generated description",
    lastUpdated: ISODate
  },
  dimensions: 1536,
  provider: "openai",
  model: "text-embedding-3-small"
}
```

## Performance Optimization

### Caching Strategy

1. **Text Embeddings Cache**: Common queries cached in memory
2. **Database Cache**: Track embeddings cached in MongoDB
3. **Redis Cache**: Frequent similarity computations cached with TTL

### Batch Processing

- **Embedding Generation**: Batch API calls for efficiency
- **Similarity Computation**: Vectorized operations
- **Index Optimization**: MongoDB vector indexes for fast retrieval

## Cost Optimization

### Provider Comparison (per 1M tokens)

| Provider | Model | Cost | Dimensions | Quality |
|----------|--------|------|------------|---------|
| OpenAI | text-embedding-3-small | $0.02 | 1536 | ⭐⭐⭐⭐⭐ |
| OpenAI | text-embedding-3-large | $0.13 | 3072 | ⭐⭐⭐⭐⭐ |
| Cohere | embed-english-v3.0 | $0.10 | 1024 | ⭐⭐⭐⭐ |
| Local | all-MiniLM-L6-v2 | Free | 384 | ⭐⭐⭐ |

### Cost Management

- **Pre-compute**: Generate track embeddings offline to minimize API calls
- **Cache Aggressively**: Store and reuse embeddings whenever possible
- **Batch Operations**: Group API calls to reduce overhead
- **Monitor Usage**: Track API costs and set alerts

## Error Handling

### Fallback Strategy

1. **Primary Provider Failure**: Automatic retry with exponential backoff
2. **API Rate Limits**: Queue requests and retry after delay
3. **No Embeddings Available**: Fall back to content-based recommendations
4. **Invalid Provider**: Clear error message with configuration guidance

### Error Messages

```javascript
// Common error scenarios
"EMBEDDING_PROVIDER environment variable is required"
"No track embeddings found. Semantic strategy requires pre-computed embeddings"
"OpenAI API error: Insufficient quota"
"Cohere API error: Invalid API key"
```

## Development Setup

### Local Development

1. **Choose Provider**: Set `EMBEDDING_PROVIDER` in `.env`
2. **Add API Key**: Set provider-specific API key
3. **Test Connection**: Run embedding generation test
4. **Load Sample Data**: Populate database with sample embeddings

### Testing

```bash
# Test embedding provider connection
npm run test:embeddings

# Generate sample embeddings
npm run generate:sample-embeddings

# Test semantic recommendations
npm run test:semantic-strategy
```

## Production Deployment

### Pre-deployment Checklist

- [ ] Provider API key configured and tested
- [ ] Track embeddings pre-computed and loaded
- [ ] Database indexes created for vector similarity
- [ ] Caching layer configured and tested
- [ ] Error handling and fallbacks tested
- [ ] Cost monitoring and alerts configured

### Monitoring

- **API Usage**: Track embedding API calls and costs
- **Performance**: Monitor similarity computation latency
- **Quality**: Track recommendation acceptance rates
- **Errors**: Alert on provider failures or high error rates

## Troubleshooting

### Common Issues

1. **"No embeddings found"**: 
   - Ensure `track_embeddings` collection has data
   - Run embedding pre-computation script

2. **"API key invalid"**:
   - Verify environment variable is set correctly
   - Check API key permissions and quota

3. **High latency**:
   - Implement caching for common queries
   - Consider batch operations
   - Optimize database queries

4. **Poor recommendation quality**:
   - Increase similarity threshold
   - Verify embedding quality
   - Adjust strategy weights

### Debug Commands

```bash
# Check embedding provider status
npm run debug:embedding-provider

# Test similarity computation
npm run debug:similarity

# Validate database embeddings
npm run debug:embedding-db
```

## Future Enhancements

### Planned Features

- **Multi-modal Embeddings**: Audio feature + text embeddings
- **User Preference Embeddings**: Personalized embedding spaces
- **Dynamic Model Selection**: Choose model based on query type
- **Embedding Fine-tuning**: Custom models for music domain

### Research Areas

- **Audio Embeddings**: Direct audio analysis for semantic similarity
- **Cross-lingual Support**: Multi-language query understanding
- **Temporal Embeddings**: Time-aware recommendation embeddings
- **Contextual Embeddings**: Activity and mood-specific embedding spaces