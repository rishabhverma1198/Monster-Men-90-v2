# Kill process on port 5000 (or specified port)
param(
    [int]$Port = 5000
)

Write-Host "Checking for processes on port $Port..."

$connections = netstat -ano | findstr ":$Port"
if ($connections) {
    $pids = $connections | ForEach-Object {
        $parts = $_ -split '\s+'
        $parts[-1]
    } | Select-Object -Unique
    
    foreach ($processId in $pids) {
        if ($processId -match '^\d+$') {
            Write-Host "Killing process PID: $processId"
            taskkill /F /PID $processId 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Process $processId killed successfully"
            } else {
                Write-Host "Could not kill process $processId (may already be stopped)"
            }
        }
    }
    Start-Sleep -Seconds 2
    Write-Host "Port $Port is now free"
} else {
    Write-Host "Port $Port is already free"
}
