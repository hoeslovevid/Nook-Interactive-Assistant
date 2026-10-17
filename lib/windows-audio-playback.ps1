param([Parameter(Mandatory=$true)][string]$WaveFile)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
try {$player=[System.Media.SoundPlayer]::new($WaveFile);try{$player.Load();[Console]::WriteLine('playing');$player.PlaySync()}finally{$player.Dispose()};exit 0}catch{exit 1}
