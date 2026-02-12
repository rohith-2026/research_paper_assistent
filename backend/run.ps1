$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

$py = Join-Path $here "venv\\Scripts\\python.exe"
if (!(Test-Path $py)) {
  throw "Missing venv python at: $py. Create it first: python -m venv venv; .\\venv\\Scripts\\pip.exe install -r requirements.txt"
}

& $py -m uvicorn app.main:app --reload --port 8000

