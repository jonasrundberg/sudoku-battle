#!/bin/bash

# Sudoku Battle - Cloud Run Deployment Script
# 
# Prerequisites:
# 1. Install gcloud CLI: https://cloud.google.com/sdk/docs/install
# 2. Authenticate: gcloud auth login
# 3. Set project: gcloud config set project YOUR_PROJECT_ID
# 4. Enable required APIs:
#    gcloud services enable run.googleapis.com
#    gcloud services enable firestore.googleapis.com
#    gcloud services enable cloudbuild.googleapis.com

set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${GCP_REGION:-europe-west1}"
SERVICE_NAME="sudoku-battle"

# Check if project is set
if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: No GCP project set."
    echo "   Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "🎮 Sudoku Battle - Cloud Run Deployment"
echo ""
echo "   Project: $PROJECT_ID"
echo "   Region:  $REGION"
echo "   Service: $SERVICE_NAME"
echo ""

# Confirm before deploying
read -p "Deploy to project '$PROJECT_ID'? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "❌ Deployment cancelled."
    exit 1
fi
echo ""

# Build and deploy
echo "📦 Building and deploying..."
gcloud run deploy $SERVICE_NAME \
    --source . \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars="GCP_PROJECT_ID=$PROJECT_ID,ENVIRONMENT=production" \
    --memory=512Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10 \
    --timeout=60s

echo ""
echo "✅ Deployment complete!"
echo ""

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)")
echo "🌐 Your app is live at: $SERVICE_URL"
echo ""

# Reminder about Firestore
echo "📝 Reminder: Make sure Firestore is set up:"
echo "   1. Go to: https://console.cloud.google.com/firestore"
echo "   2. Create database in Native mode"
echo "   3. Choose a location (recommend: $REGION or nearby)"
