param([int]$ProcessId)
$ErrorActionPreference = 'Stop'
try {
  $rows = @(); $current = $ProcessId
  for ($index = 0; $index -lt 8 -and $current -gt 0; $index++) {
    $row = Get-CimInstance Win32_Process -Filter "ProcessId=$current" -ErrorAction SilentlyContinue
    if ($null -eq $row) { break }
    $rows += @{name=$row.Name;pid=[int]$row.ProcessId}
    $current = [int]$row.ParentProcessId
  }
  @{ok=$true;chain=$rows} | ConvertTo-Json -Depth 3 -Compress
} catch { @{ok=$false;chain=@()} | ConvertTo-Json -Compress }
