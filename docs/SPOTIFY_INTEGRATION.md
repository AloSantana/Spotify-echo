# Spotify Integration Guide

## Overview

EchoTune AI now supports natural language Spotify commands directly from the chat interface. Control your Spotify playback, search for music, manage your queue, and more - all through conversational commands.

## Features

### Playback Control
- **Play**: Start playback or play specific tracks
- **Pause**: Pause current playback
- **Skip**: Skip to next track
- **Previous**: Go back to previous track
- **Resume**: Resume paused playback

### Queue Management
- **Add to Queue**: Add tracks to your play queue
- **View Queue**: See what's coming up next

### Search & Discovery
- **Search**: Find tracks, artists, albums
- **Recommendations**: Get personalized track suggestions

### Playback Settings
- **Shuffle**: Enable/disable shuffle mode
- **Repeat**: Set repeat mode (track, context, off)
- **Volume**: Adjust or set playback volume

### Device Control
- **List Devices**: See available Spotify devices
- **Transfer Playback**: Switch to different device

### Information
- **Now Playing**: See what's currently playing

## Command Examples

### Basic Playback

```
"play some energetic rock music"
"pause"
"skip to the next song"
"go back to the previous track"
"resume"
```

### Search & Discovery

```
"find upbeat workout music"
"search for indie folk songs"
"show me chill electronic tracks"
"recommend some jazz"
"discover music like The Weeknd"
```

### Queue Management

```
"add Blinding Lights to the queue"
"queue some Taylor Swift"
"play Starboy next"
```

### Playback Settings

```
"turn on shuffle"
"disable shuffle"
"repeat this track"
"repeat on"
"turn repeat off"
"set volume to 70%"
"turn the volume up"
"make it quieter"
```

### Device Control

```
"switch to my phone"
"transfer playback to Bedroom Speaker"
"show available devices"
```

### Information

```
"what's playing?"
"what's this song?"
"now playing"
```

### Advanced Queries with Filters

```
"play happy upbeat pop music"
"find sad indie songs"
"search for energetic metal for working out"
"play calm ambient music for studying"
"recommend romantic songs"
```

## Supported Filters

### Mood
- **Happy**: cheerful, upbeat, joyful, bright
- **Sad**: melancholy, depressing, somber, blue
- **Energetic**: intense, powerful, high energy, hype
- **Calm**: relaxing, chill, peaceful, mellow
- **Angry**: aggressive, intense, heavy, rage
- **Romantic**: love, sensual, intimate

### Activity
- **Workout**: gym, exercise, running, cardio, training
- **Study**: focus, concentration, work, productivity
- **Party**: dance, celebration, fun, night out
- **Sleep**: bedtime, rest, night, lullaby
- **Drive**: road trip, car, driving
- **Relax**: unwind, chill, lounge

### Genre
Supports all major genres including:
- Rock, Pop, Hip Hop, Rap, Electronic, EDM, Dance
- Jazz, Classical, Country, R&B, Soul, Funk
- Metal, Punk, Indie, Alternative, Folk, Blues
- Reggae, Latin, World, Ambient, House, Techno

### Energy Level
- **High energy**: fast-paced, intense
- **Low energy**: calm, slow, mellow

### Tempo
- **Fast**: quick, upbeat
- **Slow**: relaxed, gentle

## API Integration

### Chat Message with Spotify Command

```javascript
POST /api/chat/message
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "sessionId": "session_abc123",
  "message": "play some energetic rock music"
}
```

**Response:**
```json
{
  "success": true,
  "response": "Now playing: Thunder by Imagine Dragons",
  "spotifyAction": {
    "success": true,
    "message": "Now playing: Thunder by Imagine Dragons",
    "track": {
      "id": "track_id",
      "name": "Thunder",
      "artists": ["Imagine Dragons"],
      "uri": "spotify:track:..."
    },
    "alternatives": [...]
  },
  "spotifyCommand": {
    "type": "play",
    "originalInput": "play some energetic rock music",
    "params": {
      "query": "energetic rock music",
      "filters": {
        "energy": "high",
        "genre": "rock"
      }
    },
    "confidence": 0.9
  }
}
```

### Direct Spotify Command

```javascript
POST /api/chat/spotify-command
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "command": "pause"
}
```

**Response:**
```json
{
  "success": true,
  "command": {
    "type": "pause",
    "confidence": 0.9
  },
  "result": {
    "success": true,
    "message": "Playback paused"
  },
  "isSpotifyCommand": true
}
```

## Command Parser

The system uses a sophisticated command parser that:

1. **Detects Commands**: Identifies Spotify commands using pattern matching
2. **Extracts Parameters**: Pulls out search queries, filters, and options
3. **Filters Content**: Applies mood, genre, activity, and audio feature filters
4. **Calculates Confidence**: Scores how confident the parser is in the interpretation

### Parser Output Structure

```javascript
{
  type: 'play',           // Command type
  originalInput: 'play some energetic rock music',
  params: {
    query: 'energetic rock music',
    filters: {
      energy: 'high',
      genre: 'rock'
    }
  },
  confidence: 0.9        // 0-1 scale
}
```

## Playback Controller

The playback controller handles all Spotify API interactions:

```javascript
const PlaybackController = require('./spotify/playback-controller');

// Initialize with access token
const controller = new PlaybackController(spotifyAccessToken);

// Play a track
await controller.play({ uri: 'spotify:track:...' });

// Pause
await controller.pause();

// Skip
await controller.skip();

// Add to queue
await controller.addToQueue('spotify:track:...');

// Get now playing
const nowPlaying = await controller.getNowPlaying();

// Control volume
await controller.setVolume(70);

// Transfer to device
await controller.transferPlayback(deviceId);
```

## Error Handling

### Common Errors

**No Active Device**
```
"No active Spotify device found. Please open Spotify on a device."
```
- **Solution**: Open Spotify on your phone, computer, or speaker

**Premium Required**
```
"Premium account required for playback control."
```
- **Solution**: Spotify Premium is required for programmatic playback control

**Authentication Expired**
```
"Spotify authentication expired. Please reconnect."
```
- **Solution**: Re-authenticate with Spotify through the settings

**No Tracks Found**
```
"No tracks found for 'xyz'."
```
- **Solution**: Try a different search query or be more specific

**Rate Limited**
```
"Rate limited. Retry after X seconds."
```
- **Solution**: Wait for the specified time before retrying

## Requirements

1. **Spotify Premium Account**: Required for playback control
2. **Active Spotify Session**: Must have Spotify open on at least one device
3. **Spotify OAuth**: User must authenticate with Spotify through EchoTune AI

## Setup

### 1. Configure Spotify Credentials

In `.env`:
```bash
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/callback
```

### 2. Authenticate with Spotify

Navigate to Settings → Connect Spotify to authorize EchoTune AI.

### 3. Start Using Commands

Once authenticated, you can start using natural language Spotify commands in the chat interface!

## Architecture

```
User Input → Command Parser → Playback Controller → Spotify API
                ↓                      ↓                  ↓
          Command Object      API Request           Action Executed
                ↓                      ↓                  ↓
          Chat Response ← API Response ← Spotify Response
```

## Integration Points

### Chat Interface
- Commands automatically detected in chat messages
- Spotify actions integrated with AI responses
- Rich responses with track information

### API Routes
- `/api/chat/message` - Main chat endpoint with Spotify integration
- `/api/chat/spotify-command` - Direct Spotify command execution

### Data Storage (PostgreSQL)
- Chat messages stored with Spotify command metadata
- Playback actions logged for personalization
- Track recommendations saved for future reference

### Provider Factory
- Spotify commands work alongside AI provider selection
- Responses enhanced with AI context
- Seamless integration with multi-provider chat

## Future Enhancements

### Planned Features
1. **AI Playlist Generation**
   - "Create a 60-minute workout playlist of energetic metal"
   - Automatic track selection and playlist creation

2. **Now-Playing Widget**
   - Real-time display in chat interface
   - Inline playback controls
   - Album artwork and track info

3. **Context-Aware Recommendations**
   - Learn from listening history
   - Time-of-day preferences
   - Mood-based suggestions

4. **Multi-User Playlists**
   - Collaborative playlist creation
   - Shared listening sessions
   - Social discovery features

## Troubleshooting

### Commands Not Recognized

**Problem**: Spotify commands are not being detected

**Solutions**:
- Ensure message contains recognizable command keywords
- Try more explicit commands (e.g., "play Thriller by Michael Jackson")
- Check that you're authenticated with Spotify

### Playback Not Starting

**Problem**: Commands are recognized but playback doesn't start

**Solutions**:
- Verify you have Spotify Premium
- Ensure Spotify is open on at least one device
- Check active device with "show available devices"
- Try transferring playback to a specific device

### Search Returns No Results

**Problem**: Searches return "No tracks found"

**Solutions**:
- Simplify your search query
- Remove complex filters
- Try searching for specific artists or song names
- Check your spelling

## Examples in Context

### Morning Routine
```
User: "Good morning! Play some upbeat pop music"
AI: "Good morning! Now playing: Flowers by Miley Cyrus 🎵"
```

### Workout Session
```
User: "I'm going to the gym, need some high energy metal"
AI: "Perfect for your workout! Now playing: The Devil in I by Slipknot"
```

### Study Time
```
User: "I need to focus, play calm instrumental music"
AI: "Creating a focused environment... Now playing: Clair de Lune by Claude Debussy"
```

### Party Mode
```
User: "Time to party! Play some dance music and turn up the volume"
AI: "Party mode activated! 🎉 Now playing: Don't Start Now by Dua Lipa. Volume set to 80%."
```

## Best Practices

1. **Be Specific**: More details help find better matches
   - Good: "play upbeat 80s rock"
   - Better: "play upbeat 80s rock like Journey"

2. **Use Natural Language**: Commands feel conversational
   - "play some chill music" works as well as "play music"

3. **Combine Filters**: Stack multiple descriptors
   - "play energetic electronic music for working out"

4. **Test Commands**: Use `/api/chat/spotify-command` for debugging

5. **Check Device**: Ensure Spotify is open before complex commands

## Resources

- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)
- [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
- [EchoTune AI Architecture](./MODERNIZATION_ROADMAP.md)
- [PostgreSQL Setup](./POSTGRESQL_SETUP.md)

## Support

For issues or questions:
1. Check this documentation
2. Review error messages carefully
3. Verify Spotify Premium and device availability
4. Check authentication status in Settings
