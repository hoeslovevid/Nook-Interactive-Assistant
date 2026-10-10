param([ValidateSet('status','toggle','next','previous','seek','shuffle','repeat')][string]$Action = 'status', [long]$Position = 0)
$ErrorActionPreference = 'Stop'
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType=WindowsRuntime]
  $null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType=WindowsRuntime]
  $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
  function Await($Operation, $ResultType) {
    $task = $asTask.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
    if (-not $task.Wait(6000)) { throw 'Windows media request timed out.' }
    return $task.Result
  }
  $manager = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
  $session = $manager.GetCurrentSession()
  if ($null -eq $session) { @{ok=$true;available=$false} | ConvertTo-Json -Compress; exit }
  $changed = $true
  $before = $session.GetPlaybackInfo()
  switch ($Action) {
    'toggle' { $changed = Await ($session.TryTogglePlayPauseAsync()) ([bool]) }
    'next' { $changed = Await ($session.TrySkipNextAsync()) ([bool]) }
    'previous' { $changed = Await ($session.TrySkipPreviousAsync()) ([bool]) }
    'seek' { $changed = Await ($session.TryChangePlaybackPositionAsync([Math]::Max(0,$Position))) ([bool]) }
    'shuffle' {
      if ($before.Controls.IsShuffleEnabled) { $changed = Await ($session.TryChangeShuffleActiveAsync(-not [bool]$before.IsShuffleActive)) ([bool]) } else { $changed = $false }
    }
    'repeat' {
      if ($before.Controls.IsRepeatEnabled) {
        $null = [Windows.Media.MediaPlaybackAutoRepeatMode, Windows.Media, ContentType=WindowsRuntime]
        $mode = if ($before.AutoRepeatMode.ToString() -eq 'List') { 'Track' } elseif ($before.AutoRepeatMode.ToString() -eq 'Track') { 'None' } else { 'List' }
        $changed = Await ($session.TryChangeAutoRepeatModeAsync([Windows.Media.MediaPlaybackAutoRepeatMode]::$mode)) ([bool])
      } else { $changed = $false }
    }
  }
  $properties = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
  $playback = $session.GetPlaybackInfo()
  $timeline = $session.GetTimelineProperties()
  $repeat = if ($null -ne $playback.AutoRepeatMode) { $playback.AutoRepeatMode.ToString() } else { 'None' }
  $art = ''
  if ($properties.Thumbnail) {
    try {
      $stream = Await ($properties.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
      if ($stream.Size -gt 0 -and $stream.Size -lt 1500000) {
        $reader = [Windows.Storage.Streams.DataReader]::new($stream)
        $null = Await ($reader.LoadAsync([uint32]$stream.Size)) ([uint32])
        $bytes = New-Object byte[] $stream.Size
        $reader.ReadBytes($bytes)
        $mime = if ($stream.ContentType -match '^image/(png|jpeg|webp)$') { $stream.ContentType } else { 'image/png' }
        $art = 'data:' + $mime + ';base64,' + [Convert]::ToBase64String($bytes)
        $reader.Dispose()
      }
      $stream.Dispose()
    } catch { $art = '' }
  }
  @{ok=$true;available=$true;changed=[bool]$changed;title=$properties.Title;artist=$properties.Artist;app=$session.SourceAppUserModelId;playing=($playback.PlaybackStatus.ToString() -eq 'Playing');position=$timeline.Position.TotalSeconds;duration=$timeline.EndTime.TotalSeconds;artwork=$art;shuffle=[bool]$playback.IsShuffleActive;repeat=$repeat;canShuffle=$playback.Controls.IsShuffleEnabled;canRepeat=$playback.Controls.IsRepeatEnabled;canSeek=$playback.Controls.IsPlaybackPositionEnabled;canNext=$playback.Controls.IsNextEnabled;canPrevious=$playback.Controls.IsPreviousEnabled;canToggle=($playback.Controls.IsPauseEnabled -or $playback.Controls.IsPlayEnabled)} | ConvertTo-Json -Compress
} catch { @{ok=$false;available=$false;error=$_.Exception.Message} | ConvertTo-Json -Compress }
