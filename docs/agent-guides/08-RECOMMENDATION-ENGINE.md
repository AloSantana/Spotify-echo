# 08 — Recommendation Engine

> **Quick Reference:** All four recommendation strategies with pseudocode and runnable
> implementations, the strategy registry pattern, how listening history feeds the engine,
> cold-start problem handling, and performance optimization with caching and async processing.

---

## 1. Engine Architecture

The `RecommendationEngine` is a singleton that dispatches to registered strategies,
blends their outputs, and caches results.

```
RecommendationEngine.generate({ userId, strategy, limit })
    │
    ├── strategy === "collaborative"   →  CollaborativeStrategy.generate()
    ├── strategy === "content"         →  ContentAudioFeatureStrategy.generate()
    ├── strategy === "semantic"        →  EmbeddingSemanticStrategy.generate()
    └── strategy === "hybrid" (default)
            │
            ├── CollaborativeStrategy.generate()     → scored candidates []
            ├── ContentAudioFeatureStrategy.generate() → scored candidates []
            ├── HybridRerankStrategy.rerank(allCandidates)
            │     ├── Normalize scores
            │     ├── Blend: 0.5*collab + 0.5*content
            │     ├── Diversity filter (max 2 tracks per artist)
            │     └── Confidence threshold (score > 0.6)
            └── Return final ranked list
```

---

## 2. Recommendation Candidate Schema

Every strategy produces candidates in this format:

```javascript
const candidate = {
  trackId: 'spotify:track:4iV5W9uYEdYUVa79Axb7Rh',  // Spotify ID
  name: 'Back in Black',
  artist: 'AC/DC',
  artistId: '711MCceyCBcFnzjGY4Q7Un',
  album: 'Back in Black',
  score: 0.87,           // 0–1 normalized relevance score
  strategy: 'collaborative',
  reason: 'Played 23 times by users who also like your top artists',
  audioFeatures: {
    energy: 0.96, valence: 0.54, danceability: 0.49, tempo: 196
  },
};
```

---

## 3. Strategy 1: Collaborative Filtering

**Concept:** Users with similar listening histories tend to like the same music.
Find users similar to the target user, then recommend tracks they listened to
that the target user hasn't heard yet.

### Algorithm Steps
```
1. Fetch target user's listening history (last 90 days, top 200 tracks)
2. Build target user vector: { trackId: playCount }
3. Fetch all users who share ≥ 3 tracks with target user (candidate neighbors)
4. For each neighbor: compute cosine similarity with target user
5. Select top-20 most similar neighbors
6. Aggregate neighbor's tracks weighted by similarity score
7. Remove tracks the target user has already heard
8. Return top-N by aggregated score
```

### Implementation

```javascript
// src/recommendation/strategies/collaborativeStrategy.js
class CollaborativeStrategy {
  constructor(mongoManager) {
    this.db = mongoManager;
  }

  async generate(userId, options = {}) {
    const { limit = 20 } = options;
    const db = this.db;

    // Step 1: Fetch target user's history
    const history = await db.getCollection('echotune_listening_history')
      .find(
        { userId: new ObjectId(userId), playedAt: { $gte: ninetyDaysAgo() } },
        { projection: { trackId: 1, artistName: 1 } }
      )
      .limit(200)
      .toArray();

    if (history.length < 5) {
      return []; // Not enough data — fall back to content-based
    }

    // Step 2: Build user vector
    const userVector = {};
    for (const entry of history) {
      userVector[entry.trackId] = (userVector[entry.trackId] || 0) + 1;
    }
    const userTrackIds = Object.keys(userVector);

    // Step 3: Find candidate neighbors
    const neighbors = await db.getCollection('echotune_listening_history')
      .aggregate([
        { $match: { trackId: { $in: userTrackIds }, userId: { $ne: new ObjectId(userId) } } },
        { $group: { _id: '$userId', sharedTracks: { $addToSet: '$trackId' }, count: { $sum: 1 } } },
        { $match: { count: { $gte: 3 } } },
        { $limit: 50 },
      ])
      .toArray();

    if (neighbors.length === 0) return [];

    // Step 4–5: Compute similarity and select top neighbors
    const similarities = await Promise.all(
      neighbors.map(async neighbor => {
        const neighborHistory = await db.getCollection('echotune_listening_history')
          .find({ userId: neighbor._id }, { projection: { trackId: 1 } })
          .limit(200)
          .toArray();

        const neighborVector = {};
        for (const entry of neighborHistory) {
          neighborVector[entry.trackId] = (neighborVector[entry.trackId] || 0) + 1;
        }

        const similarity = cosineSimilarity(userVector, neighborVector);
        return { userId: neighbor._id, similarity, neighborVector };
      })
    );

    const topNeighbors = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 20);

    // Step 6–7: Aggregate and filter
    const scores = {};
    const listenedSet = new Set(userTrackIds);

    for (const neighbor of topNeighbors) {
      for (const [trackId, count] of Object.entries(neighbor.neighborVector)) {
        if (listenedSet.has(trackId)) continue;  // Already heard
        scores[trackId] = (scores[trackId] || 0) + (count * neighbor.similarity);
      }
    }

    // Step 8: Return top-N
    const ranked = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([trackId, rawScore]) => ({
        trackId,
        score: Math.min(rawScore / 10, 1), // Normalize to 0–1
        strategy: 'collaborative',
        reason: `Recommended by ${topNeighbors.length} listeners with similar taste`,
      }));

    return ranked;
  }
}

// Cosine similarity between two sparse vectors (object form)
function cosineSimilarity(vecA, vecB) {
  const allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  let dot = 0, magA = 0, magB = 0;
  for (const key of allKeys) {
    const a = vecA[key] || 0;
    const b = vecB[key] || 0;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }
  return magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}

function ninetyDaysAgo() {
  return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
}
```

---

## 4. Strategy 2: Content-Based Audio Feature Matching

**Concept:** Build a "taste profile" from the user's listening history audio features,
then find tracks in the catalogue with the closest feature vector.

### Algorithm Steps
```
1. Fetch user's listening history (last 30 days)
2. Fetch audio features for each track from echotune_track_metadata
3. Compute user's "taste vector" = weighted average of audio features
   (weight by play count and recency)
4. Query echotune_track_metadata for tracks with similar feature vectors
5. Compute cosine similarity between taste vector and each candidate
6. Apply any target feature overrides (from user query: "high energy")
7. Return top-N sorted by similarity
```

### Implementation

```javascript
// src/recommendation/strategies/contentAudioFeatureStrategy.js
class ContentAudioFeatureStrategy {
  async generate(userId, options = {}) {
    const { limit = 20, targetFeatures = {} } = options;

    // Step 1–2: Fetch history with audio features
    const history = await this.db.getCollection('echotune_listening_history')
      .aggregate([
        { $match: { userId: new ObjectId(userId), playedAt: { $gte: thirtyDaysAgo() } } },
        { $group: { _id: '$trackId', playCount: { $sum: 1 }, lastPlayed: { $max: '$playedAt' } } },
        { $sort: { playCount: -1 } },
        { $limit: 100 },
        {
          $lookup: {
            from: 'echotune_track_metadata',
            localField: '_id',
            foreignField: 'spotifyId',
            as: 'metadata',
          },
        },
        { $unwind: { path: '$metadata', preserveNullAndEmpty: false } },
      ])
      .toArray();

    if (history.length < 3) return [];

    // Step 3: Compute weighted taste vector
    const FEATURES = ['energy', 'valence', 'danceability', 'acousticness', 'instrumentalness', 'speechiness'];
    const tasteVector = {};
    let totalWeight = 0;

    for (const track of history) {
      const af = track.metadata.audioFeatures;
      if (!af) continue;

      // Recency decay: newer = higher weight
      const ageMs = Date.now() - new Date(track.lastPlayed).getTime();
      const recencyWeight = Math.exp(-ageMs / (30 * 24 * 60 * 60 * 1000)); // Decay over 30 days
      const weight = track.playCount * recencyWeight;
      totalWeight += weight;

      for (const feat of FEATURES) {
        tasteVector[feat] = (tasteVector[feat] || 0) + (af[feat] || 0) * weight;
      }
    }

    // Normalize
    for (const feat of FEATURES) {
      tasteVector[feat] = totalWeight ? tasteVector[feat] / totalWeight : 0.5;
    }

    // Apply target feature overrides
    Object.assign(tasteVector, targetFeatures);

    // Step 4–5: Find similar tracks from catalogue
    const listenedIds = history.map(h => h._id);
    const candidates = await this.db.getCollection('echotune_track_metadata')
      .find({
        spotifyId: { $nin: listenedIds },
        audioFeatures: { $exists: true },
        'audioFeatures.energy': {
          $gte: Math.max(0, (tasteVector.energy || 0.5) - 0.3),
          $lte: Math.min(1, (tasteVector.energy || 0.5) + 0.3),
        },
      })
      .limit(500)
      .toArray();

    // Compute similarity and rank
    return candidates
      .map(track => {
        const af = track.audioFeatures;
        const similarity = cosineSimilarity(
          FEATURES.map(f => tasteVector[f]),
          FEATURES.map(f => af[f] || 0)
        );
        return {
          trackId: track.spotifyId,
          name: track.name,
          artist: track.artists?.[0]?.name,
          artistId: track.artists?.[0]?.id,
          score: similarity,
          strategy: 'content',
          reason: buildContentReason(tasteVector),
          audioFeatures: af,
        };
      })
      .filter(c => c.score > 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

function cosineSimilarity(vec1, vec2) {
  const dot = vec1.reduce((sum, v, i) => sum + v * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((s, v) => s + v * v, 0));
  const mag2 = Math.sqrt(vec2.reduce((s, v) => s + v * v, 0));
  return mag1 && mag2 ? dot / (mag1 * mag2) : 0;
}

function buildContentReason(tasteVector) {
  if (tasteVector.energy > 0.7) return 'Matches your high-energy listening pattern';
  if (tasteVector.energy < 0.3) return 'Matches your calm, relaxed listening style';
  if (tasteVector.valence > 0.7) return 'Matches your upbeat music preference';
  return 'Matches your audio feature profile';
}
```

---

## 5. Strategy 3: Semantic Embedding Similarity

**Concept:** Encode track descriptions, lyrics summaries, or genre tags as embedding
vectors. Find tracks with high cosine similarity to the user's taste profile or query.

> **Status:** Phase 3 feature. MongoDB Atlas Vector Search required.

### Algorithm Steps
```
1. For each track: generate embedding from text (artist + genre tags + mood description)
   e.g. "AC/DC rock hard rock energetic aggressive electric guitar"
2. User taste embedding = average of embeddings for top-listened tracks
3. Use MongoDB Atlas Vector Search (kNN) to find nearest neighbors
4. Return top-N by vector similarity
```

### Implementation (Phase 3)

```javascript
// src/recommendation/strategies/embeddingSemanticStrategy.js
class EmbeddingSemanticStrategy {
  constructor(embeddingProvider) {
    this.embedder = embeddingProvider;  // src/ai/EmbeddingProvider.js
  }

  async generate(userId, options = {}) {
    const { limit = 20, query } = options;

    // Get user taste vector (or embed the query directly)
    let queryEmbedding;
    if (query) {
      queryEmbedding = await this.embedder.embed(query);
    } else {
      const topTracks = await this.getUserTopTracks(userId);
      const embeddings = await Promise.all(topTracks.map(t => this.getTrackEmbedding(t)));
      queryEmbedding = averageVectors(embeddings);
    }

    // MongoDB Atlas Vector Search
    const results = await this.db.getCollection('echotune_track_metadata')
      .aggregate([
        {
          $vectorSearch: {
            index: 'track_embedding_index',
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: limit * 10,
            limit,
          },
        },
        { $addFields: { score: { $meta: 'vectorSearchScore' } } },
        { $project: { spotifyId: 1, name: 1, artists: 1, audioFeatures: 1, score: 1 } },
      ])
      .toArray();

    return results.map(track => ({
      trackId: track.spotifyId,
      name: track.name,
      artist: track.artists?.[0]?.name,
      score: track.score,
      strategy: 'semantic',
      reason: query ? `Semantically similar to "${query}"` : 'Matches your music DNA',
    }));
  }
}
```

---

## 6. Strategy 4: Hybrid Reranking

**Concept:** Blend candidate scores from multiple strategies, apply diversity filtering,
and enforce a confidence threshold to produce the final recommendation list.

```javascript
// src/recommendation/strategies/hybridRerankStrategy.js
class HybridRerankStrategy {
  rerank(candidateArrays, options = {}) {
    const {
      limit = 20,
      diversityMaxPerArtist = 2,
      confidenceThreshold = 0.5,
      weights = { collaborative: 0.5, content: 0.5, semantic: 0.3 },
    } = options;

    // Step 1: Merge all candidates into one map (trackId → best entry)
    const merged = new Map();

    for (const candidates of candidateArrays) {
      for (const candidate of candidates) {
        const existing = merged.get(candidate.trackId);
        if (!existing) {
          merged.set(candidate.trackId, { ...candidate, scores: {} });
        }
        // Record per-strategy score
        merged.get(candidate.trackId).scores[candidate.strategy] = candidate.score;
      }
    }

    // Step 2: Compute blended score
    const blended = Array.from(merged.values()).map(track => {
      const strategyScores = track.scores;
      let totalWeight = 0;
      let weightedSum = 0;

      for (const [strategy, score] of Object.entries(strategyScores)) {
        const weight = weights[strategy] || 0.5;
        weightedSum += score * weight;
        totalWeight += weight;
      }

      return {
        ...track,
        blendedScore: totalWeight > 0 ? weightedSum / totalWeight : 0,
        strategyCount: Object.keys(strategyScores).length,
      };
    });

    // Step 3: Confidence threshold
    const confident = blended.filter(t => t.blendedScore >= confidenceThreshold);

    // Step 4: Sort by blended score
    confident.sort((a, b) => b.blendedScore - a.blendedScore);

    // Step 5: Diversity filter — max N tracks per artist
    const result = [];
    const artistCounts = {};

    for (const track of confident) {
      const artistId = track.artistId || track.artist;
      artistCounts[artistId] = (artistCounts[artistId] || 0) + 1;

      if (artistCounts[artistId] <= diversityMaxPerArtist) {
        result.push({ ...track, score: track.blendedScore });
      }

      if (result.length >= limit) break;
    }

    return result;
  }
}
```

---

## 7. Strategy Registry Pattern

```javascript
// src/ml/recommendation-engine.js
class RecommendationEngine {
  constructor(mongoManager) {
    this.strategies = new Map();
    this.hybridReranker = new HybridRerankStrategy();
    this.cache = cacheManager;

    // Register strategies
    this.register('collaborative', new CollaborativeStrategy(mongoManager));
    this.register('content', new ContentAudioFeatureStrategy(mongoManager));
    this.register('semantic', new EmbeddingSemanticStrategy(embeddingProvider));
  }

  register(name, strategy) {
    this.strategies.set(name, strategy);
  }

  async generate({ userId, strategy = 'hybrid', limit = 20, options = {} }) {
    const cacheKey = `recs:${userId}:${strategy}:${limit}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return { ...cached, cached: true };

    let result;

    if (strategy === 'hybrid') {
      // Run all available strategies in parallel
      const strategyNames = ['collaborative', 'content'];  // semantic added in Phase 3
      const candidateArrays = await Promise.allSettled(
        strategyNames.map(name => {
          const s = this.strategies.get(name);
          return s ? s.generate(userId, { limit: limit * 2, ...options }) : Promise.resolve([]);
        })
      );

      const resolved = candidateArrays
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);

      result = this.hybridReranker.rerank(resolved, { limit });
    } else {
      const s = this.strategies.get(strategy);
      if (!s) throw new Error(`Unknown strategy: ${strategy}`);
      result = await s.generate(userId, { limit, ...options });
    }

    await this.cache.set(cacheKey, { data: result, strategy, generatedAt: new Date() }, 3600);
    return { data: result, strategy, cached: false };
  }
}

// Export singleton
module.exports = new RecommendationEngine(mongoManager);
```

---

## 8. How Listening History Feeds Recommendations

```
[Spotify Event: Track played]
         │
         ▼
POST /api/spotify/track-played  (internal or via webhook)
         │
         ▼
Insert into echotune_listening_history
         │
         ├── eventBus.emit('track.played', { userId, trackId, artistName, playedAt })
         │
         ├── [CacheManager] invalidate 'recs:{userId}:*'  (force fresh recommendations)
         │
         └── [Background] fetch and cache audio features for trackId
               → GET /v1/audio-features/{trackId}
               → upsert echotune_track_metadata
```

---

## 9. Cold Start Problem Handling

New users have no listening history. Fallback strategy:

```javascript
async function handleColdStart(userId, options = {}) {
  const { preferences, limit = 20 } = options;

  // 1. Try user's stated favorite genres (from onboarding)
  if (preferences?.favoriteGenres?.length > 0) {
    const seedTracks = await spotifyAPI.getRecommendations({
      seed_genres: preferences.favoriteGenres.slice(0, 5),
      limit,
      token: userToken,
    });
    if (seedTracks?.tracks?.length > 0) return seedTracks.tracks;
  }

  // 2. Fall back to Spotify's top charts for user's country
  const topTracks = await spotifyAPI.request('GET', '/playlists/37i9dQZEVXbMDoHDwVN2tF/tracks', {
    token: userToken,
    params: { limit: String(limit) },
  });

  return topTracks?.items?.map(item => item.track) || [];
}
```

---

## 10. Performance Optimization

### Async Strategy Execution
Always run strategies in parallel with `Promise.allSettled` (not `all`) so one strategy
failure doesn't block others:

```javascript
const results = await Promise.allSettled([
  collaborativeStrategy.generate(userId),
  contentStrategy.generate(userId),
]);
// Process fulfilled, log rejected
```

### Caching Layers
```
L1: In-process memory (node-cache)    TTL: 60s   — hot user sessions
L2: Redis                             TTL: 3600s — cross-request cache
L3: MongoDB (echotune_recommendations) TTL: 7d   — historical results
```

### Pre-computation (Background Job)
For active users, pre-compute recommendations before they're requested:

```javascript
// Trigger after 5th track play in a session
if (sessionPlayCount % 5 === 0) {
  setImmediate(() => {
    recommendationEngine.generate({ userId, strategy: 'hybrid' });
  });
}
```

### MongoDB Aggregation Optimization
Ensure compound indexes exist before running collaborative filtering aggregations:
```javascript
// This aggregation uses: { userId: 1, playedAt: -1 } compound index
db.echotune_listening_history.find(
  { userId: ObjectId(userId), playedAt: { $gte: ninetyDaysAgo() } },
  { trackId: 1 }
)
```

---

## Cross-References

- MongoDB collections for recommendations → `03-DATA-MODELS.md`
- Audio features reference → `06-SPOTIFY-INTEGRATION.md`
- API endpoint → `05-API-REFERENCE.md`
- Feature spec for recommendations → `04-FEATURE-SPECIFICATION.md`
