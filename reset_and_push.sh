#!/bin/bash

echo "Backing up .env file..."
cp .env .env.backup

echo "Creating new orphan branch..."
git checkout --orphan clean-main

echo "Adding all files (except .env due to .gitignore)..."
git add -A

echo "Creating initial commit..."
git commit -m "Initial commit: OneStopPOS Backend with Verisiye and Kasa systems

- Complete POS backend with Express and PostgreSQL
- Products and transactions management
- Verisiye (Credit) system with customer management
- Kasa (Balance Sheet) system with daily reconciliation
- WhatsApp integration (configurable)
- Comprehensive API documentation
- 31 API endpoints total

Features:
- ACID transaction support
- Automatic stock management  
- Daily profit reports
- Credit tracking and alerts
- Balance sheet with automatic calculations

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

echo "Deleting old main branch..."
git branch -D main

echo "Renaming clean-main to main..."
git branch -m main

echo "Restoring .env from backup..."
cp .env.backup .env
rm .env.backup

echo ""
echo "Ready to push! Run:"
echo "  git push origin main --force"
