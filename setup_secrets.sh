#!/bin/bash

# Load environment variables from .env if present
if [ -f .env ]; then
  echo "Loading secrets from .env..."
  export $(grep -v '^#' .env | xargs)
else
  echo "Error: .env file not found."
  exit 1
fi

# Function to set secret
set_secret() {
  local key=$1
  local value=$2

  if [ -z "$value" ]; then
    echo "Warning: $key is empty or not found in .env. Skipping."
    return
  fi

  echo "Setting secret: $key"
  # Pipe the value to the firebase command to avoid interaction
  # The echo -n prevents a trailing newline
  echo -n "$value" | firebase functions:secrets:set "$key"
}

set_secret "GEMINI_API_KEY" "$GEMINI_API_KEY"
set_secret "GOOGLE_CLOUD_API_KEY" "$GOOGLE_CLOUD_API_KEY"

echo "Secrets setup complete (if successful above)."
