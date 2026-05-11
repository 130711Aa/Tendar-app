#!/usr/bin/env pwsh
# Deploy Gemini AI Edge Functions ke Supabase
# Jalankan script ini dari folder tendar-app

$PROJECT_REF = "ivyvktshtsictimeabfe"

Write-Host "Deploying AI Edge Functions to project: $PROJECT_REF" -ForegroundColor Cyan

Write-Host "`n[1/3] Deploy generate-menu-description..." -ForegroundColor Yellow
npx supabase functions deploy generate-menu-description --no-verify-jwt --project-ref $PROJECT_REF

Write-Host "`n[2/3] Deploy ai-sales-insight..." -ForegroundColor Yellow
npx supabase functions deploy ai-sales-insight --no-verify-jwt --project-ref $PROJECT_REF

Write-Host "`n[3/3] Deploy neighborhood-intelligence..." -ForegroundColor Yellow
npx supabase functions deploy neighborhood-intelligence --no-verify-jwt --project-ref $PROJECT_REF

Write-Host "`nDone! All 3 AI functions deployed." -ForegroundColor Green
