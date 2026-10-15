param([string]$WaveFile, [ValidateSet('transcribe','languages')][string]$Action = 'transcribe', [string]$Language = 'auto')
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$engine = $null
try {
  Add-Type -AssemblyName System.Speech
  $recognizers = @([System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers())
  if ($Action -eq 'languages') {
    $languages = @($recognizers | ForEach-Object { @{id=$_.Culture.Name;name=$_.Culture.DisplayName} })
    @{ok=$true;languages=$languages} | ConvertTo-Json -Compress -Depth 4
    return
  }
  if ($recognizers.Count -eq 0) { throw 'Install a Windows speech language, or choose OpenAI dictation in Companion settings.' }
  if ($Language -eq 'auto') {
    $chosen = $recognizers | Where-Object { $_.Culture.Name -eq [System.Globalization.CultureInfo]::CurrentUICulture.Name } | Select-Object -First 1
    if (-not $chosen) { $chosen = $recognizers[0] }
  } else {
    $chosen = $recognizers | Where-Object { $_.Culture.Name -eq $Language } | Select-Object -First 1
    if (-not $chosen -and $Language -match '^[a-z]{2}$') { $chosen = $recognizers | Where-Object { $_.Culture.Name -like ($Language + '-*') } | Select-Object -First 1 }
    if (-not $chosen) { throw 'This speech language is not installed. Install it in Windows, or choose another language.' }
  }
  $engine = New-Object System.Speech.Recognition.SpeechRecognitionEngine($chosen)
  $engine.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))
  $engine.SetInputToWaveFile($WaveFile)
  $parts = New-Object System.Collections.Generic.List[string]
  while ($null -ne ($result = $engine.Recognize())) { if ($result.Text) { $parts.Add($result.Text) } }
  @{ok=$true;text=($parts -join ' ');language=$chosen.Culture.Name} | ConvertTo-Json -Compress
} catch { @{ok=$false;error=$_.Exception.Message} | ConvertTo-Json -Compress }
finally { if ($engine) { $engine.Dispose() } }
