# stop-dev.ps1
Write-Host "Останавливаем процессы, занимающие порты 8000 и 5173..." -ForegroundColor Yellow

function Stop-ProcessByPort($port) {
    $connections = netstat -ano | findstr ":$port"
    foreach ($line in $connections) {
        $parts = $line -split '\s+' | Where-Object { $_ -ne '' }
        if ($parts.Count -ge 5) {
            $processId = $parts[-1]
            if ($processId -match '^\d+$') {
                Write-Host "Завершаем процесс с PID $processId (порт $port)" -ForegroundColor Cyan
                taskkill /PID $processId /F 2>$null
            }
        }
    }
}

Stop-ProcessByPort -port 8000
Stop-ProcessByPort -port 5173

Write-Host "`nОстанавливаем все процессы Python и Node.js..." -ForegroundColor Yellow

Get-Process | Where-Object { $_.ProcessName -match 'python|node' } | ForEach-Object {
    Write-Host "Завершаем процесс: $($_.ProcessName) (PID $($_.Id))" -ForegroundColor Cyan
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

Write-Host "`nГотово. Проверьте, что порты освобождены:" -ForegroundColor Green
netstat -ano | findstr ":8000"
netstat -ano | findstr ":5173"