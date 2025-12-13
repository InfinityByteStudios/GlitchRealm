# Script to remove console statements from JavaScript files in the Games folder
# Keeps only console.error statements that are in catch blocks

$gamesPath = "Games"
$summary = @{}
$totalRemoved = 0

# Get all JavaScript files
$jsFiles = Get-ChildItem -Path $gamesPath -Filter "*.js" -Recurse -File

Write-Host "Found $($jsFiles.Count) JavaScript files to process..." -ForegroundColor Cyan

foreach ($file in $jsFiles) {
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    $removedCount = 0
    
    # Remove standalone console.log statements
    $content = $content -replace '^\s*console\.log\([^)]*\);?\s*$', ''
    
    # Remove standalone console.warn statements
    $content = $content -replace '^\s*console\.warn\([^)]*\);?\s*$', ''
    
    # Remove standalone console.info statements
    $content = $content -replace '^\s*console\.info\([^)]*\);?\s*$', ''
    
    # Remove standalone console.debug statements
    $content = $content -replace '^\s*console\.debug\([^)]*\);?\s*$', ''
    
    # Remove inline console.log statements
    $content = $content -replace 'console\.log\([^)]*\);?\s*', ''
    
    # Remove inline console.warn statements  
    $content = $content -replace 'console\.warn\([^)]*\);?\s*', ''
    
    # Remove inline console.info statements
    $content = $content -replace 'console\.info\([^)]*\);?\s*', ''
    
    # Remove inline console.debug statements
    $content = $content -replace 'console\.debug\([^)]*\);?\s*', ''
    
    # Count console.error statements that are NOT in catch blocks (to remove)
    # This is tricky - we'll remove standalone console.error but keep those in catch blocks
    # First, let's identify if file has catch blocks
    $hasCatchBlocks = $content -match 'catch\s*\('
    
    if (-not $hasCatchBlocks) {
        # No catch blocks, safe to remove all console.error
        $content = $content -replace '^\s*console\.error\([^)]*\);?\s*$', ''
        $content = $content -replace 'console\.error\([^)]*\);?\s*', ''
    } else {
        # Has catch blocks - more careful removal needed
        # Remove console.error that are clearly NOT in catch blocks (harder to do with regex)
        # For safety, we'll leave console.error statements alone if there are catch blocks
        Write-Host "  Skipping console.error removal in $($file.Name) (has catch blocks)" -ForegroundColor Yellow
    }
    
    # Remove extra blank lines (more than 2 consecutive)
    $content = $content -replace '(\r?\n\s*){3,}', "`r`n`r`n"
    
    # Count how many were removed by comparing string lengths and occurrences
    $originalLines = ($originalContent -split "`n").Count
    $newLines = ($content -split "`n").Count
    $removedCount = $originalLines - $newLines
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $relativePath = $file.FullName.Substring($PWD.Path.Length + 1)
        $summary[$relativePath] = $removedCount
        $totalRemoved += $removedCount
        Write-Host "  Processed: $relativePath - Removed ~$removedCount lines" -ForegroundColor Green
    } else {
        Write-Host "  No changes: $($file.Name)" -ForegroundColor Gray
    }
}

Write-Host "`n========== SUMMARY ==========" -ForegroundColor Cyan
Write-Host "Total files processed: $($jsFiles.Count)" -ForegroundColor White
Write-Host "Files modified: $($summary.Count)" -ForegroundColor White
Write-Host "Total lines removed: ~$totalRemoved" -ForegroundColor Green
Write-Host "`nFiles with changes:" -ForegroundColor Cyan

foreach ($key in $summary.Keys | Sort-Object) {
    Write-Host "  $key : ~$($summary[$key]) lines" -ForegroundColor White
}

Write-Host "`n✅ Console statement removal complete!" -ForegroundColor Green
