#!/bin/bash
cd "$(dirname "$0")/src-tauri" || exit 1
echo "Starting cargo check..."
cargo check 2>&1 | head -50
echo "Cargo check completed"
