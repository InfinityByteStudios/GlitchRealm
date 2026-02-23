# Auth Subdomain Deployment Script
# Run this after setting up the Netlify site

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GlitchRealm Auth Subdomain Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "auth\index.html")) {
    Write-Host "ERROR: Please run this script from the GlitchRealm root directory" -ForegroundColor Red
    exit 1
}

Write-Host "Checking auth subdomain files..." -ForegroundColor Yellow

$requiredFiles = @(
    "auth\index.html",
    "auth\netlify.toml",
    "auth\README.md",
    "auth\SETUP.md"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  OK $file" -ForegroundColor Green
    } else {
        Write-Host "  MISSING $file" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "`nERROR: Some required files are missing!" -ForegroundColor Red
    exit 1
}

Write-Host "`nAll files present!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Create a new Netlify site:" -ForegroundColor White
Write-Host "   - Go to https://app.netlify.com" -ForegroundColor Gray
Write-Host "   - Click 'Add new site' → 'Deploy manually'" -ForegroundColor Gray
Write-Host "   - Drag the 'auth' folder to deploy" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Configure the domain:" -ForegroundColor White
Write-Host "   - In Netlify: Site settings → Domain management" -ForegroundColor Gray
Write-Host "   - Add custom domain: auth.glitchrealm.ca" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Update your DNS:" -ForegroundColor White
Write-Host "   - Type: CNAME" -ForegroundColor Gray
Write-Host "   - Name: auth" -ForegroundColor Gray
Write-Host "   - Value: [your-netlify-site].netlify.app" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Update Firebase authorized domains:" -ForegroundColor White
Write-Host "   - Go to Firebase Console → Authentication → Settings" -ForegroundColor Gray
Write-Host "   - Add: auth.glitchrealm.ca" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Test the deployment:" -ForegroundColor White
Write-Host "   - Visit https://auth.glitchrealm.ca" -ForegroundColor Gray
Write-Host "   - Test sign-in flow" -ForegroundColor Gray
Write-Host ""
Write-Host "For detailed instructions, see:" -ForegroundColor Yellow
Write-Host "  auth\SETUP.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "Deployment preparation complete!" -ForegroundColor Green
Write-Host ""
