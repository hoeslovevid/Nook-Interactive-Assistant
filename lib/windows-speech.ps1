param([Parameter(Mandatory=$true)][string]$WaveFile)
$ErrorActionPreference = 'Stop'
try {
  Add-Type -AssemblyName System.Speech
  $recognizers = [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers()
  if ($recognizers.Count -eq 0) { throw 'Install a Windows speech language, or choose OpenAI dictation in Companion settings.' }
  $chosen = $recognizers | Where-Object { $_.Culture.Name -eq [System.Globalization.CultureInfo]::CurrentUICulture.Name } | Select-Object -First 1
  if (-not $chosen) { $chosen = $recognizers[0] }
  $engine = New-Object System.Speech.Recognition.SpeechRecognitionEngine($chosen)
  $engine.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))
  $engine.SetInputToWaveFile($WaveFile)
  $parts = New-Object System.Collections.Generic.List[string]
  while ($null -ne ($result = $engine.Recognize())) { if ($result.Text) { $parts.Add($result.Text) } }
  $engine.Dispose()
  @{ok=$true;text=($parts -join ' ');language=$chosen.Culture.Name} | ConvertTo-Json -Compress
} catch { @{ok=$false;error=$_.Exception.Message} | ConvertTo-Json -Compress }
