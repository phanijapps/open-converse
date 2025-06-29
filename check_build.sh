#!/bin/bash
cd /Users/phani.jammulamadaka/code/open-converse/src-tauri
echo "Starting cargo check..."
cargo check 2>&1 | head -50
echo "Cargo check completed"
