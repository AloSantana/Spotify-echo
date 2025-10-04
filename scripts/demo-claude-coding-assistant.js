#!/usr/bin/env node

/**
 * AWS Bedrock Claude Opus 4.1 - Coding Assistant Demo
 * 
 * This script demonstrates using Claude Opus 4.1 via AWS Bedrock for coding tasks:
 * - Code generation
 * - Code explanation
 * - Code review and improvements
 * - Bug fixing suggestions
 * 
 * Prerequisites:
 * - AWS credentials configured (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION)
 * - IAM permissions for bedrock:InvokeModel
 */

const BedrockInferenceProvider = require('../src/infra/BedrockInferenceProvider');

class ClaudeCodingAssistant {
    constructor() {
        this.provider = null;
        this.model = 'claude-3-opus'; // Using Claude Opus 4.1 with inference profile ARN
    }

    async initialize() {
        console.log('🚀 Initializing Claude Opus 4.1 Coding Assistant via AWS Bedrock...\n');
        
        try {
            this.provider = new BedrockInferenceProvider({
                region: process.env.AWS_REGION || 'us-east-1',
                defaultModel: this.model,
                enableCaching: true,
                maxRetries: 3
            });

            await this.provider.initialize();
            
            const models = this.provider.getAvailableModels();
            const claudeOpus = models.find(m => m.key === 'claude-3-opus');
            
            if (!claudeOpus) {
                throw new Error('Claude Opus 4.1 not available');
            }

            console.log('✅ Provider initialized successfully');
            console.log(`   Region: ${this.provider.config.region}`);
            console.log(`   Model: ${claudeOpus.displayName}`);
            console.log(`   Capabilities: ${claudeOpus.capabilities.join(', ')}`);
            console.log('');
            
            return true;
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            return false;
        }
    }

    async generateCode(description) {
        console.log('💻 Code Generation Task');
        console.log('─'.repeat(80));
        console.log(`Request: ${description}`);
        console.log('');

        const prompt = `Generate production-ready code for the following task:

${description}

Requirements:
- Include comprehensive error handling
- Add JSDoc comments
- Follow best practices
- Include usage examples
- Make it modular and testable

Provide only the code with explanatory comments.`;

        try {
            const startTime = Date.now();
            const result = await this.provider.predict(this.model, prompt, {
                maxTokens: 2000,
                temperature: 0.3 // Lower temperature for more focused code generation
            });
            const duration = Date.now() - startTime;

            console.log('✅ Code Generated Successfully');
            console.log(`   Duration: ${duration}ms`);
            console.log(`   Tokens: ${result.usage.input_tokens} input + ${result.usage.output_tokens} output`);
            console.log('');
            console.log('Generated Code:');
            console.log('─'.repeat(80));
            console.log(result.text);
            console.log('─'.repeat(80));
            console.log('');

            return {
                success: true,
                code: result.text,
                duration,
                usage: result.usage
            };
        } catch (error) {
            console.error('❌ Code generation failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    async explainCode(code) {
        console.log('📖 Code Explanation Task');
        console.log('─'.repeat(80));
        console.log('Analyzing code...');
        console.log('');

        const prompt = `Explain the following code in detail:

\`\`\`javascript
${code}
\`\`\`

Please explain:
1. What the code does (high-level purpose)
2. How it works (step-by-step logic)
3. Key design patterns or techniques used
4. Potential use cases
5. Any important considerations or edge cases`;

        try {
            const startTime = Date.now();
            const result = await this.provider.predict(this.model, prompt, {
                maxTokens: 1500,
                temperature: 0.5
            });
            const duration = Date.now() - startTime;

            console.log('✅ Explanation Generated');
            console.log(`   Duration: ${duration}ms`);
            console.log(`   Tokens: ${result.usage.input_tokens} input + ${result.usage.output_tokens} output`);
            console.log('');
            console.log('Explanation:');
            console.log('─'.repeat(80));
            console.log(result.text);
            console.log('─'.repeat(80));
            console.log('');

            return {
                success: true,
                explanation: result.text,
                duration,
                usage: result.usage
            };
        } catch (error) {
            console.error('❌ Explanation failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    async reviewCode(code) {
        console.log('🔍 Code Review Task');
        console.log('─'.repeat(80));
        console.log('Reviewing code for improvements...');
        console.log('');

        const prompt = `Review the following code and provide detailed feedback:

\`\`\`javascript
${code}
\`\`\`

Please provide:
1. Overall code quality assessment
2. Potential bugs or issues
3. Security concerns
4. Performance improvements
5. Best practices recommendations
6. Refactoring suggestions
7. Test coverage recommendations

Format the response with clear sections and actionable recommendations.`;

        try {
            const startTime = Date.now();
            const result = await this.provider.predict(this.model, prompt, {
                maxTokens: 2000,
                temperature: 0.4
            });
            const duration = Date.now() - startTime;

            console.log('✅ Review Completed');
            console.log(`   Duration: ${duration}ms`);
            console.log(`   Tokens: ${result.usage.input_tokens} input + ${result.usage.output_tokens} output`);
            console.log('');
            console.log('Review:');
            console.log('─'.repeat(80));
            console.log(result.text);
            console.log('─'.repeat(80));
            console.log('');

            return {
                success: true,
                review: result.text,
                duration,
                usage: result.usage
            };
        } catch (error) {
            console.error('❌ Review failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    async fixBug(buggyCode, bugDescription) {
        console.log('🐛 Bug Fixing Task');
        console.log('─'.repeat(80));
        console.log(`Bug Description: ${bugDescription}`);
        console.log('');

        const prompt = `Fix the bug in the following code:

Bug Description: ${bugDescription}

Code:
\`\`\`javascript
${buggyCode}
\`\`\`

Please provide:
1. Explanation of what's causing the bug
2. Fixed version of the code
3. Explanation of the fix
4. Additional improvements if applicable`;

        try {
            const startTime = Date.now();
            const result = await this.provider.predict(this.model, prompt, {
                maxTokens: 1500,
                temperature: 0.3
            });
            const duration = Date.now() - startTime;

            console.log('✅ Bug Fix Provided');
            console.log(`   Duration: ${duration}ms`);
            console.log(`   Tokens: ${result.usage.input_tokens} input + ${result.usage.output_tokens} output`);
            console.log('');
            console.log('Fix:');
            console.log('─'.repeat(80));
            console.log(result.text);
            console.log('─'.repeat(80));
            console.log('');

            return {
                success: true,
                fix: result.text,
                duration,
                usage: result.usage
            };
        } catch (error) {
            console.error('❌ Bug fix failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    async runDemo() {
        console.log('═'.repeat(80));
        console.log('🤖 Claude Opus 4.1 Coding Assistant - Interactive Demo');
        console.log('═'.repeat(80));
        console.log('');

        // Initialize
        const initialized = await this.initialize();
        if (!initialized) {
            console.error('⚠️  Demo cannot continue without AWS credentials');
            console.error('   Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION');
            process.exit(1);
        }

        // Demo 1: Generate Code
        console.log('📝 Demo 1: Generate Code');
        console.log('═'.repeat(80));
        await this.generateCode(`Create a JavaScript function that validates music track metadata including artist name, track title, duration, and genre. The function should return validation errors if any.`);

        // Demo 2: Explain Code
        console.log('\n📝 Demo 2: Explain Code');
        console.log('═'.repeat(80));
        const sampleCode = `
async function fetchUserPlaylists(userId, options = {}) {
    const cache = new Map();
    const cacheKey = \`playlists:\${userId}\`;
    
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }
    
    try {
        const response = await fetch(\`/api/users/\${userId}/playlists\`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(\`HTTP \${response.status}\`);
        }
        
        const playlists = await response.json();
        cache.set(cacheKey, playlists);
        return playlists;
    } catch (error) {
        console.error('Failed to fetch playlists:', error);
        throw error;
    }
}`;
        await this.explainCode(sampleCode);

        // Demo 3: Review Code
        console.log('\n📝 Demo 3: Review Code');
        console.log('═'.repeat(80));
        await this.reviewCode(sampleCode);

        // Demo 4: Fix Bug
        console.log('\n📝 Demo 4: Fix Bug');
        console.log('═'.repeat(80));
        const buggyCode = `
function calculatePlaylistDuration(tracks) {
    let total = 0;
    for (let i = 0; i <= tracks.length; i++) {
        total += tracks[i].duration;
    }
    return total;
}`;
        await this.fixBug(buggyCode, 'Function throws error when accessing array element');

        // Summary
        console.log('\n═'.repeat(80));
        console.log('📊 Demo Summary');
        console.log('═'.repeat(80));
        const metrics = this.provider.getMetrics();
        console.log('Provider Metrics:');
        console.log(`   Total Requests: ${metrics.totalRequests}`);
        console.log(`   Successful: ${metrics.successfulRequests}`);
        console.log(`   Failed: ${metrics.failedRequests}`);
        console.log(`   Cache Hits: ${metrics.cacheHits}`);
        console.log(`   Average Latency: ${metrics.averageLatency.toFixed(2)}ms`);
        console.log(`   Success Rate: ${metrics.successRate.toFixed(2)}%`);
        console.log('');
        console.log('✅ Demo completed successfully!');
        console.log('');
    }
}

// Run demo if called directly
if (require.main === module) {
    const assistant = new ClaudeCodingAssistant();
    assistant.runDemo().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = ClaudeCodingAssistant;
