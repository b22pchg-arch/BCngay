param([int]$Port = 8765)
$ErrorActionPreference = 'Stop'
$Root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
$url = "http://127.0.0.1:$Port/index.html"
Write-Host "SCADA Report PWA server: $url"
Write-Host "Close this window to stop the server."
Start-Process $url

function Get-Mime([string]$Path) {
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    '.html' { return 'text/html; charset=utf-8' }
    '.js' { return 'application/javascript; charset=utf-8' }
    '.json' { return 'application/json; charset=utf-8' }
    '.webmanifest' { return 'application/manifest+json; charset=utf-8' }
    '.css' { return 'text/css; charset=utf-8' }
    '.png' { return 'image/png' }
    '.svg' { return 'image/svg+xml' }
    '.ico' { return 'image/x-icon' }
    default { return 'application/octet-stream' }
  }
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 4096, $true)
      $line = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($line)) { $client.Close(); continue }
      while ($true) { $header = $reader.ReadLine(); if ([string]::IsNullOrEmpty($header)) { break } }
      $parts = $line.Split(' ')
      $method = $parts[0]
      $rawPath = if ($parts.Length -gt 1) { $parts[1] } else { '/' }
      $pathOnly = $rawPath.Split('?')[0]
      $decoded = [System.Uri]::UnescapeDataString($pathOnly)
      if ($decoded -eq '/') { $decoded = '/index.html' }
      $relative = $decoded.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
      $full = [System.IO.Path]::GetFullPath((Join-Path $Root $relative))
      $status = '200 OK'
      if (-not $full.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $full -PathType Leaf)) {
        $status = '404 Not Found'
        $body = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
        $mime = 'text/plain; charset=utf-8'
      } else {
        $body = [System.IO.File]::ReadAllBytes($full)
        $mime = Get-Mime $full
      }
      $headers = "HTTP/1.1 $status`r`nContent-Type: $mime`r`nContent-Length: $($body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
      $headBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
      $stream.Write($headBytes,0,$headBytes.Length)
      if ($method -ne 'HEAD') { $stream.Write($body,0,$body.Length) }
      $stream.Flush()
    } catch {
      Write-Warning $_.Exception.Message
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
