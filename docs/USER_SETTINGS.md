# User Settings System

**Status**: Implementation complete (pending merge of PR #37)

EchoTune AI's User Settings System allows you to personalize your music discovery experience through comprehensive configuration options. Control everything from AI provider preferences to privacy settings and recommendation algorithm weights.

## Quick Start

Access your settings through the web interface or programmatically via our REST API:

- **Web Interface**: Navigate to Settings in the main navigation
- **API Access**: Use the `/api/settings` endpoints (authentication required)
- **Default Settings**: New users automatically receive sensible defaults

## Settings Categories

### 🤖 AI Provider Configuration

Control which AI provider powers your music recommendations and chat interactions.

**Available Providers**:
- **OpenAI**: GPT models for high-quality recommendations (default)
- **Google Gemini**: Fast and efficient alternative
- **OpenRouter**: Access to multiple AI models
- **Mock**: Testing and development mode

**Provider Selection**:
```json
{
  "llmProvider": "openai",
  "llmModel": "gpt-4o-mini"
}
```

**Automatic Fallback**: If your selected provider is unavailable, the system automatically selects the best available alternative and notifies you.

### ⚖️ Recommendation Strategy Weights

Fine-tune how different recommendation algorithms influence your music suggestions.

**Strategy Types**:
- **Collaborative Filtering (30%)**: Based on users with similar taste
- **Content-Based Filtering (30%)**: Based on audio features and metadata  
- **Semantic Analysis (30%)**: Based on lyrics and contextual understanding
- **Diversity Boost (10%)**: Introduces variety and discovery

**Customization**:
```json
{
  "strategyWeights": {
    "collaborative": 0.4,
    "content": 0.3,
    "semantic": 0.2,
    "diversity": 0.1
  }
}
```

**Auto-Normalization**: Weights are automatically normalized to sum to 1.0, so you can input any proportional values.

### 🔒 Privacy Controls

Manage how your data is used and stored.

**Privacy Options**:
- **Store Listening History**: Enable/disable saving your music listening data
- **Share Analytics**: Opt-in to contributing anonymous usage analytics
- **Enable Telemetry**: Allow system performance monitoring

**Privacy Settings**:
```json
{
  "privacy": {
    "storeHistory": true,
    "shareAnalytics": false,
    "enableTelemetry": true
  }
}
```

**Data Impact**:
- When `storeHistory` is disabled, recommendations work with session data only
- When `shareAnalytics` is disabled, your usage data is excluded from aggregated insights
- When `enableTelemetry` is disabled, system performance monitoring is reduced

### 🎵 Playlist Defaults

Configure default settings for AI-generated playlists.

**Playlist Options**:
- **Public/Private**: Default visibility for new playlists
- **Description Template**: Custom template for playlist descriptions  
- **Auto-Sync**: Automatically update playlists with new recommendations

**Playlist Settings**:
```json
{
  "playlistDefaults": {
    "public": false,
    "descriptionTemplate": "AI-curated playlist by EchoTune - {date}",
    "autoSync": true
  }
}
```

**Template Variables**: Use placeholders like `{date}`, `{genre}`, `{mood}` in description templates.

### ⚙️ User Preferences

Customize your overall EchoTune experience.

**Preference Options**:
- **Max Recommendations**: Number of songs per recommendation request (1-100)
- **Enable Explanations**: Show AI reasoning for recommendations
- **Auto Refresh**: Automatically update recommendations periodically
- **Compact Mode**: Use condensed interface layout

**Preferences Settings**:
```json
{
  "preferences": {
    "maxRecommendations": 20,
    "enableExplanations": true,
    "autoRefresh": false,
    "compactMode": false
  }
}
```

## API Reference

### Authentication

All settings endpoints require authentication. Include your auth token in requests:

```http
Authorization: Bearer your-jwt-token
```

Or provide user ID via header (for development):
```http
X-User-ID: your-user-id
```

### Endpoints

#### Get Current Settings
```http
GET /api/settings
```

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "user_12345",
    "llmProvider": "openai",
    "llmModel": "gpt-4o-mini",
    "strategyWeights": { /* ... */ },
    "privacy": { /* ... */ },
    "playlistDefaults": { /* ... */ },
    "preferences": { /* ... */ },
    "isDefault": false,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Update Settings
```http
PUT /api/settings
Content-Type: application/json

{
  "llmProvider": "gemini",
  "strategyWeights": {
    "collaborative": 0.4,
    "content": 0.4,
    "semantic": 0.2,
    "diversity": 0.0
  },
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Response**:
```json
{
  "success": true,
  "data": { /* updated settings */ },
  "message": "Settings updated successfully",
  "timestamp": "2024-01-15T10:31:00.000Z"
}
```

#### Partial Update
```http
PATCH /api/settings
Content-Type: application/json

{
  "privacy": {
    "storeHistory": false
  },
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### Get Default Settings
```http
GET /api/settings/defaults
```

Returns the default settings template for new users.

#### Check Provider Status
```http
GET /api/providers/status
```

**Response**:
```json
{
  "success": true,
  "data": {
    "providers": {
      "openai": {
        "available": true,
        "latency": 234,
        "lastCheck": "2024-01-15T10:29:45.000Z"
      },
      "gemini": {
        "available": true,
        "latency": 187,
        "lastCheck": "2024-01-15T10:29:45.000Z"
      },
      "openrouter": {
        "available": false,
        "error": "API rate limit exceeded",
        "lastCheck": "2024-01-15T10:29:45.000Z"
      }
    },
    "recommended": "gemini"
  }
}
```

#### Reset to Defaults
```http
DELETE /api/settings
```

Resets all settings to system defaults.

### Error Handling

All errors follow a consistent format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description",
  "details": { /* optional additional context */ },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Common Errors**:
- `AUTHENTICATION_REQUIRED` (401): Missing or invalid auth token
- `VALIDATION_ERROR` (400): Invalid settings data
- `VERSION_CONFLICT` (409): Settings changed by another process
- `INTERNAL_SERVER_ERROR` (500): Server error

### Optimistic Concurrency

To prevent conflicting updates, include the `updatedAt` timestamp in update requests:

```json
{
  "llmProvider": "gemini",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

If another process has updated the settings since your timestamp, you'll receive a `VERSION_CONFLICT` error with the current state:

```json
{
  "error": "VERSION_CONFLICT", 
  "message": "Settings were modified by another process. Please refresh and try again.",
  "serverVersion": "2024-01-15T10:35:00.000Z",
  "serverState": { /* current settings */ }
}
```

## Common Use Cases

### Scenario 1: Privacy-Conscious User

```json
{
  "privacy": {
    "storeHistory": false,
    "shareAnalytics": false,
    "enableTelemetry": false
  },
  "playlistDefaults": {
    "public": false
  }
}
```

### Scenario 2: Discovery-Focused User

```json
{
  "strategyWeights": {
    "collaborative": 0.2,
    "content": 0.2,
    "semantic": 0.3,
    "diversity": 0.3
  },
  "preferences": {
    "maxRecommendations": 50,
    "enableExplanations": true
  }
}
```

### Scenario 3: Performance-Optimized Setup

```json
{
  "llmProvider": "gemini",
  "preferences": {
    "maxRecommendations": 10,
    "enableExplanations": false,
    "compactMode": true
  }
}
```

### Scenario 4: Public Playlist Creator

```json
{
  "playlistDefaults": {
    "public": true,
    "descriptionTemplate": "🎵 {genre} vibes for {date} - Powered by EchoTune AI",
    "autoSync": true
  },
  "privacy": {
    "shareAnalytics": true
  }
}
```

## Best Practices

### Security
- Never share your authentication tokens
- Regularly review your privacy settings
- Use strong, unique passwords for your account

### Performance
- Choose providers with good availability in your region
- Consider reducing `maxRecommendations` for faster responses
- Enable `compactMode` on slower devices

### Personalization
- Experiment with different strategy weights to find your preference
- Use meaningful playlist description templates
- Enable explanations to understand AI reasoning

### Privacy
- Review what data you're comfortable sharing
- Consider the trade-offs between privacy and personalization
- Understand that disabled `storeHistory` reduces long-term recommendation quality

## Troubleshooting

### Settings Not Saving
- Check your authentication token is valid
- Ensure you're including the current `updatedAt` timestamp
- Verify your settings data passes validation

### Recommendations Seem Off
- Review your strategy weights configuration
- Check if your preferred provider is available
- Consider whether privacy settings are limiting data collection

### Provider Unavailable
- Check `/api/providers/status` for current availability
- System will automatically fallback to available providers
- Consider switching to a more reliable provider

### Performance Issues
- Reduce `maxRecommendations` setting
- Enable `compactMode` for faster interface
- Choose providers with lower latency in your region

## Support

- **Documentation**: See [API Documentation](./API_DOCUMENTATION.md)
- **Technical Issues**: Open an issue on our GitHub repository
- **Feature Requests**: Use our feature request template
- **Privacy Questions**: Contact our privacy team

---

**Note**: Settings are automatically backed up and can be restored. Your preferences are encrypted in transit and at rest. For more technical details, see the [Phase 3 Specification](./phase3.md).