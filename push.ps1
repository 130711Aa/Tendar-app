$ErrorActionPreference = "Stop"
taskkill /F /IM git.exe 2>$null
if (Test-Path ".git/index.lock") {
    Remove-Item ".git/index.lock" -Force
}
git commit -m "Update frontend components and pages"
git push
