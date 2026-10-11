param([ValidateSet('voices','speak')][string]$Action='voices',[string]$Payload='')
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)
try {
 Add-Type -AssemblyName System.Speech
 $synth=[System.Speech.Synthesis.SpeechSynthesizer]::new()
 try {
  if($Action -eq 'voices') {
   $voices=@($synth.GetInstalledVoices() | Where-Object Enabled | ForEach-Object { @{id=$_.VoiceInfo.Name;name=$_.VoiceInfo.Name;language=$_.VoiceInfo.Culture.Name} })
   @{ok=$true;voices=$voices} | ConvertTo-Json -Depth 4 -Compress
  } else {
   $data=[System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Payload)) | ConvertFrom-Json
   if([string]::IsNullOrWhiteSpace($data.text) -or $data.text.Length -gt 4000){throw 'Invalid speech text'}
   if($data.voice){$synth.SelectVoice([string]$data.voice)}
   $synth.Rate=[Math]::Min(3,[Math]::Max(-3,[int]$data.rate))
   $synth.Speak([string]$data.text)
   @{ok=$true} | ConvertTo-Json -Compress
  }
 } finally {$synth.Dispose()}
} catch {@{ok=$false;error='Windows speech output is unavailable. Choose an installed voice.'} | ConvertTo-Json -Compress}
