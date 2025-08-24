#!/bin/bash

# Script to create KV namespaces for the Ingestion Worker
# Run this script to set up the required KV namespaces

echo "Creating KV namespaces for Ingestion Worker..."

cd src/workers/ingestion

# Create KV namespaces
echo "Creating TIMESERIES_KV namespace..."
TIMESERIES_ID=$(wrangler kv:namespace create "TIMESERIES_KV" --preview false | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
TIMESERIES_PREVIEW_ID=$(wrangler kv:namespace create "TIMESERIES_KV" --preview | grep -o 'id = "[^"]*"' | cut -d'"' -f2)

echo "Creating JOBS_KV namespace..."
JOBS_ID=$(wrangler kv:namespace create "JOBS_KV" --preview false | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
JOBS_PREVIEW_ID=$(wrangler kv:namespace create "JOBS_KV" --preview | grep -o 'id = "[^"]*"' | cut -d'"' -f2)

echo "Creating PACKAGES_KV namespace..."
PACKAGES_ID=$(wrangler kv:namespace create "PACKAGES_KV" --preview false | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
PACKAGES_PREVIEW_ID=$(wrangler kv:namespace create "PACKAGES_KV" --preview | grep -o 'id = "[^"]*"' | cut -d'"' -f2)

echo ""
echo "✅ KV namespaces created successfully!"
echo ""
echo "📋 Update your wrangler.toml with these IDs:"
echo ""
echo "[[kv_namespaces]]"
echo "binding = \"TIMESERIES_KV\""
echo "id = \"$TIMESERIES_ID\""
echo "preview_id = \"$TIMESERIES_PREVIEW_ID\""
echo ""
echo "[[kv_namespaces]]"
echo "binding = \"JOBS_KV\""
echo "id = \"$JOBS_ID\""
echo "preview_id = \"$JOBS_PREVIEW_ID\""
echo ""
echo "[[kv_namespaces]]"
echo "binding = \"PACKAGES_KV\""
echo "id = \"$PACKAGES_ID\""
echo "preview_id = \"$PACKAGES_PREVIEW_ID\""