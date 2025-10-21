#!/bin/bash
# ============================================================================
# Cline Shell Integration Automatic Setup Script
# ============================================================================
# This script automatically configures Bash for optimal Cline integration

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Cline Shell Integration - Automatic Setup                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# 1. CHECK PREREQUISITES
# ============================================================================

echo "📋 Checking prerequisites..."

# Check if running bash
if [ -z "$BASH_VERSION" ]; then
    echo "❌ Error: This script must be run with bash"
    exit 1
fi

# Check bash version
bash_version=$(bash --version | grep -oP 'version \K[0-9]+\.[0-9]+')
echo "✓ Bash version: $bash_version"

# Check VS Code
if command -v code &> /dev/null; then
    vscode_version=$(code --version | head -1)
    echo "✓ VS Code version: $vscode_version"
else
    echo "⚠ Warning: VS Code not found in PATH"
fi

# Check if .bashrc exists
if [ ! -f ~/.bashrc ]; then
    echo "❌ Error: ~/.bashrc not found"
    exit 1
fi

echo "✓ Prerequisites check passed"
echo ""

# ============================================================================
# 2. BACKUP EXISTING CONFIGURATION
# ============================================================================

echo "💾 Backing up existing configuration..."

backup_date=$(date +%s)
cp ~/.bashrc ~/.bashrc.backup-$backup_date
echo "✓ Backed up ~/.bashrc to ~/.bashrc.backup-$backup_date"
echo ""

# ============================================================================
# 3. CONFIGURE BASH FOR CLINE INTEGRATION
# ============================================================================

echo "🔧 Configuring Bash for Cline integration..."

# Define the configuration block
read -r -d '' bash_config << 'EOF' || true
# ============================================================================
# VS CODE + CLINE SHELL INTEGRATION (Added by auto-setup script)
# ============================================================================

# Set shell environment variables
export SHELL=/bin/bash
export TERM=xterm-256color
export COLORTERM=truecolor

# Enable VS Code shell integration
if [ -z "${TERM_PROGRAM}" ]; then
    export TERM_PROGRAM="vscode"
fi

# Enable Cline shell integration
export CLINE_SHELL_INTEGRATION=1

# Bash options for reliability
shopt -s histappend
shopt -s extglob
shopt -s nullglob
shopt -s checkwinsize

# History configuration
PROMPT_COMMAND="history -a; history -n"
HISTSIZE=10000
HISTFILESIZE=20000
HISTCONTROL=ignoreboth
HISTTIMEFORMAT='%F %T '

# Reliable prompt format
if [ -n "${VSCODE_PID}" ]; then
    # Running in VS Code
    PS1='\[\033[0;32m\]\u@\h\[\033[0m\]:\[\033[0;34m\]\w\[\033[0m\]\$ '
else
    # Normal terminal
    PS1='\u@\h:\w\$ '
fi

# Development environment optimization
if [ -f ~/.bashrc.local ]; then
    source ~/.bashrc.local
fi
EOF

# Check if configuration already exists
if grep -q "CLINE SHELL INTEGRATION" ~/.bashrc; then
    echo "⚠ Cline integration configuration already present in ~/.bashrc"
    echo "  Skipping duplicate configuration..."
else
    # Append configuration to ~/.bashrc
    echo "" >> ~/.bashrc
    echo "$bash_config" >> ~/.bashrc
    echo "✓ Added Cline integration configuration to ~/.bashrc"
fi

echo ""

# ============================================================================
# 4. CREATE VS CODE SETTINGS SNIPPET
# ============================================================================

echo "📝 Creating VS Code settings snippet..."

vscode_settings_file="/tmp/vscode-cline-settings.json"

cat > "$vscode_settings_file" << 'EOF'
{
  "terminal.integrated.defaultProfile.linux": "bash",
  "terminal.integrated.profiles.linux": {
    "bash": {
      "path": "/bin/bash",
      "args": ["-l", "-i"],
      "icon": "terminal-bash",
      "overrideName": true,
      "env": {
        "SHELL": "/bin/bash",
        "TERM": "xterm-256color",
        "COLORTERM": "truecolor",
        "CLINE_SHELL_INTEGRATION": "1"
      }
    }
  },
  "terminal.integrated.shellIntegration.enabled": true,
  "terminal.integrated.shellIntegration.decorationsEnabled": "auto",
  "terminal.integrated.environmentChangesIndicator": "on",
  "terminal.integrated.environmentChangesRecommended": true,
  "terminal.integrated.tabs.enabled": true,
  "terminal.integrated.copyOnSelection": true,
  "terminal.integrated.cursorStyle": "line",
  "terminal.integrated.cursorBlinking": true,
  "terminal.integrated.fontSize": 14,
  "terminal.integrated.lineHeight": 1.2,
  "terminal.integrated.smoothScrolling": true,
  "terminal.integrated.rendererType": "canvas"
}
EOF

echo "✓ VS Code settings snippet created at: $vscode_settings_file"
echo "  Apply these settings by:"
echo "  1. Press CMD/CTRL + Shift + P"
echo "  2. Type: Preferences: Open Settings (JSON)"
echo "  3. Merge the contents from: $vscode_settings_file"
echo ""

# ============================================================================
# 5. VERIFY CONFIGURATION
# ============================================================================

echo "✓ Verifying configuration..."

# Source the updated bashrc
source ~/.bashrc

# Check environment variables
echo ""
echo "Environment Variables:"
echo "  SHELL=$SHELL"
echo "  TERM=$TERM"
echo "  COLORTERM=$COLORTERM"
echo "  CLINE_SHELL_INTEGRATION=$CLINE_SHELL_INTEGRATION"
echo ""

# Verify bash options
echo "Bash Options (shopt):"
for opt in histappend extglob nullglob checkwinsize; do
    if shopt -q $opt; then
        echo "  ✓ $opt is ON"
    else
        echo "  ✗ $opt is OFF"
    fi
done

echo ""

# ============================================================================
# 6. DISPLAY NEXT STEPS
# ============================================================================

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ Setup Complete!                                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📌 Next Steps:"
echo ""
echo "1️⃣  Apply VS Code Settings:"
echo "    • Open VS Code Settings: CMD/CTRL + ,"
echo "    • Search for 'terminal.integrated.defaultProfile'"
echo "    • Or manually merge settings from:"
echo "      $vscode_settings_file"
echo ""
echo "2️⃣  Set Default Shell Profile:"
echo "    • Press CMD/CTRL + Shift + P"
echo "    • Type: 'Terminal: Select Default Profile'"
echo "    • Choose: 'bash'"
echo ""
echo "3️⃣  Restart VS Code:"
echo "    • Close all terminal tabs"
echo "    • Close and reopen VS Code"
echo "    • Or press CMD/CTRL + Shift + P → 'Developer: Reload Window'"
echo ""
echo "4️⃣  Verify in New Terminal:"
echo "    • Open new terminal: CMD/CTRL + \`"
echo "    • Run: echo \$CLINE_SHELL_INTEGRATION"
echo "    • Should output: 1"
echo ""
echo "5️⃣  Test Cline:"
echo "    • Try a simple command in Cline"
echo "    • Should no longer show shell integration warning"
echo ""
echo "📝 Configuration Backup:"
echo "    ~/.bashrc.backup-$backup_date"
echo ""
echo "📖 For more details, see: CLINE_SHELL_INTEGRATION_FIX.md"
echo ""

# ============================================================================
# 7. OPTIONAL: INSTALL RECOMMENDED TOOLS
# ============================================================================

read -p "Would you like to install recommended development tools? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 Installing recommended tools..."
    
    # Check for missing tools
    tools_to_install=()
    
    if ! command -v git &> /dev/null; then
        tools_to_install+=("git")
    fi
    
    if ! command -v curl &> /dev/null; then
        tools_to_install+=("curl")
    fi
    
    if ! command -v wget &> /dev/null; then
        tools_to_install+=("wget")
    fi
    
    if [ ${#tools_to_install[@]} -gt 0 ]; then
        echo "Installing: ${tools_to_install[*]}"
        sudo apt-get update
        sudo apt-get install -y "${tools_to_install[@]}"
        echo "✓ Tools installed successfully"
    else
        echo "✓ All recommended tools already installed"
    fi
    echo ""
fi

echo "✨ Cline Shell Integration Setup Complete!"
echo ""
