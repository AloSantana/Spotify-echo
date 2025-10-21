#!/bin/bash
# Optimized shell configuration for Cline + VS Code shell integration
# This file should be sourced in your ~/.bashrc

# ============================================================================
# VS CODE SHELL INTEGRATION
# ============================================================================

# Enable VS Code shell integration
if [ -z "${TERM_PROGRAM}" ]; then
    export TERM_PROGRAM="vscode"
fi

# Export SHELL variable for proper terminal detection
export SHELL=/bin/bash

# ============================================================================
# CLINE INTEGRATION SETTINGS
# ============================================================================

# Enable shell integration for Cline output capture
export CLINE_SHELL_INTEGRATION=1

# Set proper environment variables
export COLORTERM=truecolor
export TERM=xterm-256color

# ============================================================================
# BASH HISTORY CONFIGURATION
# ============================================================================

# Append to history file, don't overwrite
shopt -s histappend

# Save history immediately
PROMPT_COMMAND="history -a; history -n"

# Large history
HISTSIZE=10000
HISTFILESIZE=20000

# Don't store duplicate entries
HISTCONTROL=ignoreboth

# Timestamp history entries
HISTTIMEFORMAT='%F %T '

# ============================================================================
# BASH OPTIONS FOR RELIABLE COMMAND EXECUTION
# ============================================================================

# Enable extended globbing
shopt -s extglob

# Enable nullglob
shopt -s nullglob

# Check window size after each command
shopt -s checkwinsize

# ============================================================================
# CLINE COMPATIBLE SHELL PROMPT
# ============================================================================

# Simple, reliable prompt for tool output parsing
if [ -n "${VSCODE_PID}" ]; then
    # Running in VS Code
    PS1='\[\033[0;32m\]\u@\h\[\033[0m\]:\[\033[0;34m\]\w\[\033[0m\]\$ '
else
    # Normal terminal
    PS1='\u@\h:\w\$ '
fi

# ============================================================================
# ALIASES FOR DEVELOPMENT
# ============================================================================

alias ll='ls -lah'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'
alias grep='grep --color=auto'
alias egrep='egrep --color=auto'
alias fgrep='fgrep --color=auto'

# ============================================================================
# FUNCTIONS FOR RELIABLE COMMAND EXECUTION
# ============================================================================

# Function to ensure command output is properly captured
run_with_capture() {
    local cmd="$@"
    eval "$cmd"
    local exit_code=$?
    return $exit_code
}

# ============================================================================
# DEVELOPMENT ENVIRONMENT
# ============================================================================

# Node.js environment
if command -v nvm &> /dev/null; then
    # NVM is installed
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
fi

# Python environment
if command -v python3 &> /dev/null; then
    export PYTHONUNBUFFERED=1
fi

# ============================================================================
# DEBUGGING AND LOGGING
# ============================================================================

# Uncomment for debugging shell integration issues
# PS4='+ [$(date +%s%N)] '
# set -x  # Enable command echoing

echo "✓ Cline-optimized shell configuration loaded"
