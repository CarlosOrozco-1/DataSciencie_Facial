# JWT Handshake Monitor - GenderSense
# Script para PowerShell que visualiza en tiempo real
# el intercambio de tokens JWT entre el frontend y el backend.

$ErrorActionPreference = "Stop"

# Colores ANSI para la terminal
$Colors = @{
    Reset    = "`e[0m"
    Bold     = "`e[1m"
    Dim      = "`e[2m"
    Red      = "`e[91m"
    Green    = "`e[92m"
    Yellow   = "`e[93m"
    Blue     = "`e[94m"
    Magenta  = "`e[95m"
    Cyan     = "`e[96m"
    White    = "`e[97m"
}

function Print-Banner {
    Write-Host ""
    Write-Host "$($Colors.Cyan)$($Colors.Bold)============================================" 
    Write-Host "           JWT HANDSHAKE MONITOR"
    Write-Host "           GenderSense Security Layer"
    Write-Host "============================================$($Colors.Reset)"
    Write-Host "$($Colors.Dim)Escuchando el intercambio de tokens JWT en tiempo real..."
    Write-Host "Presiona Ctrl+C para detener.$($Colors.Reset)"
    Write-Host ""
}

function Format-Timestamp {
    return (Get-Date).ToString("HH:mm:ss.fff")
}

function Parse-AndDisplay {
    param([string]$Line)
    
    $cleanLine = $Line.Trim()
    # Limpiar prefijo del contenedor Docker (facial_api  |)
    if ($cleanLine -match "facial_api") {
        $parts = $cleanLine -split "facial_api\s*\|\s*", 2
        if ($parts.Length -gt 1) {
            $cleanLine = $parts[1].Trim()
        }
    }
    
    # Detectar handshake JWT
    if ($cleanLine -match "JWT Handshake Capturado") {
        $timestamp = Format-Timestamp
        Write-Host ""
        Write-Host "$($Colors.Green)$($Colors.Bold)[$timestamp] TOKEN JWT INTERCEPTADO$($Colors.Reset)"
        return $true
    }
    
    if ($cleanLine -match "Origen:") {
        $origin = ($cleanLine -split "Origen:", 2)[-1].Trim()
        Write-Host "  $($Colors.Cyan)Origen del Cliente:$($Colors.Reset) $($Colors.White)$origin$($Colors.Reset)"
        return $true
    }
    
    if ($cleanLine -match "Destino Endpoint:") {
        $endpoint = ($cleanLine -split "Destino Endpoint:", 2)[-1].Trim()
        
        $color = $Colors.White
        $icon = "[API]"
        if ($endpoint -match "/auth/") {
            $color = $Colors.Yellow; $icon = "[AUTH]"
        } elseif ($endpoint -match "/cameras/") {
            $color = $Colors.Blue; $icon = "[CAM]"
        } elseif ($endpoint -match "/detections/") {
            $color = $Colors.Magenta; $icon = "[DET]"
        } elseif ($endpoint -match "/processing/") {
            $color = $Colors.Cyan; $icon = "[PROC]"
        } elseif ($endpoint -match "/users/") {
            $color = $Colors.Green; $icon = "[USER]"
        }
        
        Write-Host "  $($Colors.Cyan)Endpoint Destino:$($Colors.Reset) $color$icon $endpoint$($Colors.Reset)"
        return $true
    }
    
    if ($cleanLine -match "Carga Token JWT:") {
        $tokenInfo = ($cleanLine -split "Carga Token JWT:", 2)[-1].Trim()
        Write-Host "  $($Colors.Cyan)Firma del Token:$($Colors.Reset) $($Colors.Yellow)$tokenInfo$($Colors.Reset)"
        return $true
    }
    
    if ($cleanLine -match "^-{10,}") {
        Write-Host "  $($Colors.Dim)$("-" * 58)$($Colors.Reset)"
        return $true
    }
    
    # Detectar requests HTTP
    $httpMatch = [regex]::Match($cleanLine, '"(GET|POST|PUT|DELETE) (.+?) HTTP/[\d.]+" (\d+)')
    if ($httpMatch.Success) {
        $method = $httpMatch.Groups[1].Value
        $path = $httpMatch.Groups[2].Value
        $status = $httpMatch.Groups[3].Value
        $timestamp = Format-Timestamp
        
        $statusColor = $Colors.Yellow
        $statusIcon = "!"
        if ($status -match "^2") { $statusColor = $Colors.Green; $statusIcon = "+" }
        elseif ($status -match "^4") { $statusColor = $Colors.Red; $statusIcon = "X" }
        
        $methodColor = $Colors.White
        switch ($method) {
            "GET"    { $methodColor = $Colors.Cyan }
            "POST"   { $methodColor = $Colors.Green }
            "PUT"    { $methodColor = $Colors.Yellow }
            "DELETE" { $methodColor = $Colors.Red }
        }
        
        $padding = " " * [Math]::Max(0, 50 - $path.Length)
        Write-Host "  $($Colors.Dim)$timestamp$($Colors.Reset) $methodColor$method$($Colors.Reset) $path$padding $statusColor$statusIcon $status$($Colors.Reset)"
        return $true
    }
    
    if ($cleanLine -match "Sembrando|generado con") {
        Write-Host "  $($Colors.Green)$($Colors.Bold)$($cleanLine.Trim())$($Colors.Reset)"
        return $true
    }
    
    if ($cleanLine -match "ERROR|Error") {
        Write-Host "  $($Colors.Red)*** $($cleanLine.Trim())$($Colors.Reset)"
        return $true
    }
    
    return $false
}

function Main {
    Print-Banner
    
    $stats = @{
        TotalRequests = 0
        JwtHandshakes = 0
        Errors = 0
    }
    
    try {
        Write-Host "$($Colors.Green)Conectado al contenedor facial_api$($Colors.Reset)"
        Write-Host "$($Colors.Dim)Esperando actividad en el servidor...$($Colors.Reset)"
        Write-Host ""
        
        # Ejecutar docker compose logs en modo follow usando el pipeline
        docker compose logs -f --tail 0 app 2>&1 | ForEach-Object {
            $line = $_
            if (Parse-AndDisplay $line) {
                if ($line -match "JWT Handshake") {
                    $stats.JwtHandshakes++
                } elseif ($line -match "HTTP/") {
                    $stats.TotalRequests++
                } elseif ($line -match "Error") {
                    $stats.Errors++
                }
            }
        }
    }
    catch [System.Management.Automation.PipelineStoppedException] {
        # Ctrl+C presionado, salida normal
    }
    catch {
        Write-Host "$($Colors.Red)Error: $_$($Colors.Reset)"
        exit 1
    }
    finally {
        Write-Host ""
        Write-Host "$($Colors.Yellow)$($Colors.Bold)--- Sesion de Monitoreo Finalizada ---$($Colors.Reset)"
        Write-Host "  Peticiones HTTP capturadas: $($Colors.Cyan)$($stats.TotalRequests)$($Colors.Reset)"
        Write-Host "  Handshakes JWT detectados:  $($Colors.Green)$($stats.JwtHandshakes)$($Colors.Reset)"
        Write-Host "  Errores registrados:        $($Colors.Red)$($stats.Errors)$($Colors.Reset)"
        Write-Host ""
        Write-Host "$($Colors.Dim)Monitor detenido.$($Colors.Reset)"
        Write-Host ""
    }
}

Main
