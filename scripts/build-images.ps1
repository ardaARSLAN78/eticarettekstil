param(
    [ValidateSet('all', 'backend', 'frontend')]
    [string]$Target = 'all'
)

$ErrorActionPreference = 'Stop'
$projectDirectory = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
Push-Location -LiteralPath $projectDirectory

try {
    # Doğrudan build, Docker Compose bake'in Türkçe klasör adındaki aktarım hatasını da önler.
    if ($Target -in @('all', 'backend')) {
        docker build -t quantia-backend -t quantia-worker -f backend/Dockerfile .
        if ($LASTEXITCODE -ne 0) { throw 'Backend Docker derlemesi başarısız.' }
    }

    if ($Target -in @('all', 'frontend')) {
        docker build -t quantia-frontend -f frontend/Dockerfile .
        if ($LASTEXITCODE -ne 0) { throw 'Frontend Docker derlemesi başarısız.' }
    }
}
finally {
    Pop-Location
}
