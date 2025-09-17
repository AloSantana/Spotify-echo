#!/usr/bin/env node
/**
 * Spotify Integration MCP Server for EchoTune AI
 * Provides Spotify API integration, music data analysis, and playlist management
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const fetch = require('node-fetch');

class SpotifyMCPServer {
    constructor() {
        this.server = new Server(
            { name: 'spotify-integration-mcp', version: '1.0.0' },
            { capabilities: { tools: {} } }
        );
        
        this.clientId = process.env.SPOTIFY_CLIENT_ID;
        this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
        this.baseUrl = 'https://api.spotify.com/v1';
        
        this.accessToken = null;
        this.tokenExpiry = null;
        
        this.setupTools();
    }

    setupTools() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'get_access_token',
                        description: 'Get Spotify API access token using client credentials',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'search_tracks',
                        description: 'Search for tracks on Spotify',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                query: {
                                    type: 'string',
                                    description: 'Search query for tracks'
                                },
                                limit: {
                                    type: 'number',
                                    description: 'Number of results to return (1-50)',
                                    default: 20
                                }
                            },
                            required: ['query']
                        }
                    },
                    {
                        name: 'get_artist_info',
                        description: 'Get detailed information about an artist',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                artist_id: {
                                    type: 'string',
                                    description: 'Spotify artist ID'
                                }
                            },
                            required: ['artist_id']
                        }
                    },
                    {
                        name: 'get_track_info',
                        description: 'Get detailed information about a track including audio features',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                track_id: {
                                    type: 'string',
                                    description: 'Spotify track ID'
                                }
                            },
                            required: ['track_id']
                        }
                    },
                    {
                        name: 'get_recommendations',
                        description: 'Get music recommendations based on seed tracks, artists, or audio features',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                seed_tracks: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Array of track IDs for recommendations'
                                },
                                seed_artists: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Array of artist IDs for recommendations'
                                },
                                seed_genres: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Array of genre names for recommendations'
                                },
                                target_danceability: {
                                    type: 'number',
                                    description: 'Target danceability (0.0-1.0)'
                                },
                                target_energy: {
                                    type: 'number',
                                    description: 'Target energy (0.0-1.0)'
                                },
                                target_valence: {
                                    type: 'number',
                                    description: 'Target valence/mood (0.0-1.0)'
                                },
                                limit: {
                                    type: 'number',
                                    description: 'Number of recommendations (1-100)',
                                    default: 20
                                }
                            }
                        }
                    },
                    {
                        name: 'analyze_listening_history',
                        description: 'Analyze listening patterns and generate insights',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                tracks: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            track_id: { type: 'string' },
                                            played_at: { type: 'string' },
                                            play_count: { type: 'number' }
                                        }
                                    },
                                    description: 'Array of listening history data'
                                }
                            },
                            required: ['tracks']
                        }
                    },
                    {
                        name: 'get_genre_seeds',
                        description: 'Get available genre seeds for recommendations',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'health_check',
                        description: 'Check Spotify API connectivity and service health',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    }
                ]
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            
            try {
                switch (name) {
                    case 'get_access_token':
                        return await this.getAccessToken();
                    case 'search_tracks':
                        return await this.searchTracks(args.query, args.limit);
                    case 'get_artist_info':
                        return await this.getArtistInfo(args.artist_id);
                    case 'get_track_info':
                        return await this.getTrackInfo(args.track_id);
                    case 'get_recommendations':
                        return await this.getRecommendations(args);
                    case 'analyze_listening_history':
                        return await this.analyzeListeningHistory(args.tracks);
                    case 'get_genre_seeds':
                        return await this.getGenreSeeds();
                    case 'health_check':
                        return await this.healthCheck();
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${error.message}`
                        }
                    ]
                };
            }
        });
    }

    async ensureAccessToken() {
        if (!this.accessToken || Date.now() >= this.tokenExpiry) {
            await this.refreshAccessToken();
        }
    }

    async refreshAccessToken() {
        if (!this.clientId || !this.clientSecret) {
            throw new Error('Spotify client credentials not configured');
        }

        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
            },
            body: 'grant_type=client_credentials'
        });

        if (!response.ok) {
            throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 30000; // 30s buffer
        
        return this.accessToken;
    }

    async makeSpotifyRequest(endpoint, options = {}) {
        await this.ensureAccessToken();
        
        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    async getAccessToken() {
        try {
            const token = await this.refreshAccessToken();
            return {
                content: [
                    {
                        type: 'text',
                        text: `✅ Access token obtained successfully. Expires in ${Math.round((this.tokenExpiry - Date.now()) / 1000)}s`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Failed to get access token: ${error.message}`
                    }
                ]
            };
        }
    }

    async searchTracks(query, limit = 20) {
        const data = await this.makeSpotifyRequest(`/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`);
        
        const tracks = data.tracks.items.map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artists[0]?.name,
            album: track.album.name,
            duration_ms: track.duration_ms,
            popularity: track.popularity,
            preview_url: track.preview_url,
            external_urls: track.external_urls
        }));

        return {
            content: [
                {
                    type: 'text',
                    text: `🎵 Found ${tracks.length} tracks for "${query}":\n\n${this.formatTracks(tracks)}`
                }
            ]
        };
    }

    async getArtistInfo(artistId) {
        const artist = await this.makeSpotifyRequest(`/artists/${artistId}`);
        const topTracks = await this.makeSpotifyRequest(`/artists/${artistId}/top-tracks?market=US`);
        
        const info = {
            name: artist.name,
            genres: artist.genres,
            popularity: artist.popularity,
            followers: artist.followers.total,
            external_urls: artist.external_urls,
            top_tracks: topTracks.tracks.slice(0, 5).map(track => ({
                name: track.name,
                popularity: track.popularity,
                preview_url: track.preview_url
            }))
        };

        return {
            content: [
                {
                    type: 'text',
                    text: this.formatArtistInfo(info)
                }
            ]
        };
    }

    async getTrackInfo(trackId) {
        const track = await this.makeSpotifyRequest(`/tracks/${trackId}`);
        const audioFeatures = await this.makeSpotifyRequest(`/audio-features/${trackId}`);
        
        const info = {
            name: track.name,
            artist: track.artists[0]?.name,
            album: track.album.name,
            duration_ms: track.duration_ms,
            popularity: track.popularity,
            explicit: track.explicit,
            external_urls: track.external_urls,
            audio_features: {
                danceability: audioFeatures.danceability,
                energy: audioFeatures.energy,
                valence: audioFeatures.valence,
                tempo: audioFeatures.tempo,
                loudness: audioFeatures.loudness,
                acousticness: audioFeatures.acousticness,
                instrumentalness: audioFeatures.instrumentalness,
                speechiness: audioFeatures.speechiness
            }
        };

        return {
            content: [
                {
                    type: 'text',
                    text: this.formatTrackInfo(info)
                }
            ]
        };
    }

    async getRecommendations(params) {
        const queryParams = new URLSearchParams();
        
        if (params.seed_tracks) queryParams.append('seed_tracks', params.seed_tracks.join(','));
        if (params.seed_artists) queryParams.append('seed_artists', params.seed_artists.join(','));
        if (params.seed_genres) queryParams.append('seed_genres', params.seed_genres.join(','));
        if (params.target_danceability) queryParams.append('target_danceability', params.target_danceability);
        if (params.target_energy) queryParams.append('target_energy', params.target_energy);
        if (params.target_valence) queryParams.append('target_valence', params.target_valence);
        queryParams.append('limit', params.limit || 20);

        const data = await this.makeSpotifyRequest(`/recommendations?${queryParams.toString()}`);
        
        const recommendations = data.tracks.map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artists[0]?.name,
            album: track.album.name,
            popularity: track.popularity,
            preview_url: track.preview_url
        }));

        return {
            content: [
                {
                    type: 'text',
                    text: `🎯 Generated ${recommendations.length} recommendations:\n\n${this.formatTracks(recommendations)}`
                }
            ]
        };
    }

    async analyzeListeningHistory(tracks) {
        if (!tracks || tracks.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: '❌ No listening history data provided'
                    }
                ]
            };
        }

        // Get detailed track info for analysis
        const trackDetails = [];
        for (const track of tracks.slice(0, 20)) { // Limit for performance
            try {
                const info = await this.makeSpotifyRequest(`/tracks/${track.track_id}`);
                const audioFeatures = await this.makeSpotifyRequest(`/audio-features/${track.track_id}`);
                
                trackDetails.push({
                    ...track,
                    name: info.name,
                    artist: info.artists[0]?.name,
                    genres: info.artists[0]?.genres || [],
                    audio_features: audioFeatures
                });
            } catch (error) {
                // Skip tracks that can't be found
                continue;
            }
        }

        const analysis = this.performListeningAnalysis(trackDetails);

        return {
            content: [
                {
                    type: 'text',
                    text: this.formatListeningAnalysis(analysis)
                }
            ]
        };
    }

    performListeningAnalysis(tracks) {
        if (tracks.length === 0) {
            return { error: 'No valid tracks to analyze' };
        }

        // Calculate average audio features
        const avgFeatures = {
            danceability: 0,
            energy: 0,
            valence: 0,
            tempo: 0,
            acousticness: 0,
            instrumentalness: 0,
            speechiness: 0
        };

        let validTracks = 0;
        const genres = {};
        const artists = {};

        tracks.forEach(track => {
            if (track.audio_features) {
                Object.keys(avgFeatures).forEach(feature => {
                    if (track.audio_features[feature] !== null) {
                        avgFeatures[feature] += track.audio_features[feature];
                    }
                });
                validTracks++;
            }

            // Count genres
            if (track.genres) {
                track.genres.forEach(genre => {
                    genres[genre] = (genres[genre] || 0) + 1;
                });
            }

            // Count artists
            if (track.artist) {
                artists[track.artist] = (artists[track.artist] || 0) + 1;
            }
        });

        // Calculate averages
        if (validTracks > 0) {
            Object.keys(avgFeatures).forEach(feature => {
                avgFeatures[feature] = avgFeatures[feature] / validTracks;
            });
        }

        // Get top genres and artists
        const topGenres = Object.entries(genres)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([genre, count]) => ({ genre, count }));

        const topArtists = Object.entries(artists)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([artist, count]) => ({ artist, count }));

        return {
            totalTracks: tracks.length,
            avgFeatures,
            topGenres,
            topArtists,
            insights: this.generateInsights(avgFeatures, topGenres)
        };
    }

    generateInsights(avgFeatures, topGenres) {
        const insights = [];

        if (avgFeatures.energy > 0.7) {
            insights.push('You prefer high-energy music that gets you pumped up');
        } else if (avgFeatures.energy < 0.3) {
            insights.push('You enjoy calm, low-energy music for relaxation');
        }

        if (avgFeatures.valence > 0.7) {
            insights.push('Your music taste leans toward positive, upbeat tracks');
        } else if (avgFeatures.valence < 0.3) {
            insights.push('You have a preference for melancholic or serious music');
        }

        if (avgFeatures.danceability > 0.7) {
            insights.push('You love danceable tracks that make you want to move');
        }

        if (avgFeatures.acousticness > 0.7) {
            insights.push('You appreciate acoustic and organic sounds');
        }

        if (topGenres.length > 0) {
            insights.push(`Your top genre is ${topGenres[0].genre}`);
        }

        return insights;
    }

    async getGenreSeeds() {
        const data = await this.makeSpotifyRequest('/recommendations/available-genre-seeds');
        
        return {
            content: [
                {
                    type: 'text',
                    text: `🎶 Available genre seeds (${data.genres.length} total):\n\n${data.genres.join(', ')}`
                }
            ]
        };
    }

    async healthCheck() {
        try {
            await this.ensureAccessToken();
            
            // Test a simple API call
            await this.makeSpotifyRequest('/search?q=test&type=track&limit=1');
            
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'healthy',
                            spotify_api: 'connected',
                            credentials: {
                                client_id: this.clientId ? 'configured' : 'missing',
                                client_secret: this.clientSecret ? 'configured' : 'missing'
                            },
                            access_token: this.accessToken ? 'valid' : 'none',
                            token_expiry: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : 'none'
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'error',
                            error: error.message,
                            spotify_api: 'disconnected'
                        }, null, 2)
                    }
                ]
            };
        }
    }

    formatTracks(tracks) {
        return tracks.map((track, index) => 
            `${index + 1}. **${track.name}** by ${track.artist}\n   Album: ${track.album}\n   Popularity: ${track.popularity}/100`
        ).join('\n\n');
    }

    formatArtistInfo(info) {
        return `🎤 **${info.name}**\n\n` +
               `**Genres:** ${info.genres.join(', ')}\n` +
               `**Popularity:** ${info.popularity}/100\n` +
               `**Followers:** ${info.followers.toLocaleString()}\n\n` +
               '**Top Tracks:**\n' +
               info.top_tracks.map((track, index) => 
                   `${index + 1}. ${track.name} (${track.popularity}/100)`
               ).join('\n');
    }

    formatTrackInfo(info) {
        return `🎵 **${info.name}** by ${info.artist}\n\n` +
               `**Album:** ${info.album}\n` +
               `**Duration:** ${Math.round(info.duration_ms / 1000)}s\n` +
               `**Popularity:** ${info.popularity}/100\n` +
               `**Explicit:** ${info.explicit ? 'Yes' : 'No'}\n\n` +
               '**Audio Features:**\n' +
               `• Danceability: ${(info.audio_features.danceability * 100).toFixed(1)}%\n` +
               `• Energy: ${(info.audio_features.energy * 100).toFixed(1)}%\n` +
               `• Valence (mood): ${(info.audio_features.valence * 100).toFixed(1)}%\n` +
               `• Tempo: ${Math.round(info.audio_features.tempo)} BPM\n` +
               `• Acousticness: ${(info.audio_features.acousticness * 100).toFixed(1)}%\n` +
               `• Speechiness: ${(info.audio_features.speechiness * 100).toFixed(1)}%`;
    }

    formatListeningAnalysis(analysis) {
        if (analysis.error) {
            return `❌ Analysis error: ${analysis.error}`;
        }

        let output = '📊 **Listening History Analysis**\n\n';
        output += `**Tracks Analyzed:** ${analysis.totalTracks}\n\n`;
        
        output += '**Average Audio Profile:**\n';
        output += `• Energy: ${(analysis.avgFeatures.energy * 100).toFixed(1)}%\n`;
        output += `• Danceability: ${(analysis.avgFeatures.danceability * 100).toFixed(1)}%\n`;
        output += `• Valence (mood): ${(analysis.avgFeatures.valence * 100).toFixed(1)}%\n`;
        output += `• Tempo: ${Math.round(analysis.avgFeatures.tempo)} BPM\n`;
        output += `• Acousticness: ${(analysis.avgFeatures.acousticness * 100).toFixed(1)}%\n\n`;

        if (analysis.topGenres.length > 0) {
            output += '**Top Genres:**\n';
            analysis.topGenres.forEach((item, index) => {
                output += `${index + 1}. ${item.genre} (${item.count} tracks)\n`;
            });
            output += '\n';
        }

        if (analysis.topArtists.length > 0) {
            output += '**Top Artists:**\n';
            analysis.topArtists.forEach((item, index) => {
                output += `${index + 1}. ${item.artist} (${item.count} tracks)\n`;
            });
            output += '\n';
        }

        if (analysis.insights.length > 0) {
            output += '**Music Insights:**\n';
            analysis.insights.forEach(insight => {
                output += `• ${insight}\n`;
            });
        }

        return output;
    }

    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Spotify Integration MCP Server running on stdio');
    }
}

if (require.main === module) {
    const server = new SpotifyMCPServer();
    server.start().catch(console.error);
}

module.exports = SpotifyMCPServer;