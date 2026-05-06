# Git Push Script - Run this in PowerShell inside the project folder

# Step 1: Check/Set remote
$remote = git remote get-url origin 2>&1
if ($LASTEXITCODE -ne 0) {
    git remote add origin https://github.com/mispasmin-creator/Purchase-FMS.git
    Write-Host "Remote added." -ForegroundColor Green
} else {
    git remote set-url origin https://github.com/mispasmin-creator/Purchase-FMS.git
    Write-Host "Remote updated to: https://github.com/mispasmin-creator/Purchase-FMS.git" -ForegroundColor Green
}

# Step 2: Stage all changes
git add .
Write-Host "Files staged." -ForegroundColor Cyan

# Step 3: Commit
git commit -m "fix: Type Of Transporting Rate dropdown - options from Master table, enabled for all POs"
Write-Host "Committed." -ForegroundColor Cyan

# Step 4: Push
git push -u origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Trying 'master' branch..." -ForegroundColor Yellow
    git push -u origin master
}

Write-Host "Done! Check: https://github.com/mispasmin-creator/Purchase-FMS" -ForegroundColor Green
