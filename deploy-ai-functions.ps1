#!/usr/bin/env pwsh
# Deploy Gemini AI Edge Functions ke Supabase
# Jalankan script ini dari folder tendar-app

Write-Host "Deploying AI Edge Functions..." -ForegroundColor Cyan

Write-Host "`n[1/2] Deploy generate-menu-description..." -ForegroundColor Yellow
supabase functions deploy generate-menu-description --no-verify-jwt

Write-Host "`n[2/2] Deploy ai-sales-insight..." -ForegroundColor Yellow
supabase functions deploy ai-sales-insight --no-verify-jwt

Write-Host "`nDone! Both AI functions deployed." -ForegroundColor Green
