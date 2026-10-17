param([ValidateSet('watch','paste','target')][string]$Action='target',[ValidateSet('F8','F9','F10','RightControl','RightAlt','RightShift')][string]$Shortcut='F8',[string]$TextFile,[string]$Target,[string]$Focus,[switch]$PrivateClipboard)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class NookFlowNative {
 [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int key);
 public static bool OtherKeyDown(int trigger) { for(int k=8;k<255;k++) {if(k==trigger||k==16||k==17||k==18)continue;if((GetAsyncKeyState(k)&0x8000)!=0)return true;}return false; }
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window,out uint pid);
 [DllImport("user32.dll")] public static extern bool RegisterHotKey(IntPtr window,int id,uint mods,uint key);
 [DllImport("user32.dll")] public static extern bool UnregisterHotKey(IntPtr window,int id);
 [StructLayout(LayoutKind.Sequential)] public struct MSG { public IntPtr hwnd; public uint message; public UIntPtr wParam; public IntPtr lParam; public uint time; public int x; public int y; public uint extra; }
 [DllImport("user32.dll")] public static extern bool PeekMessage(out MSG message,IntPtr window,uint min,uint max,uint remove);
}
'@
function CurrentTarget {
 $window=[NookFlowNative]::GetForegroundWindow();$taskPid=[uint32]0;$null=[NookFlowNative]::GetWindowThreadProcessId($window,[ref]$taskPid)
 $appName='';try{$appName=(Get-Process -Id $taskPid).ProcessName}catch{}
 $password=$true;$focusId='';try{$focused=[Windows.Automation.AutomationElement]::FocusedElement;$password=$focused.Current.IsPassword;$focusId=$focused.GetRuntimeId() -join ':'}catch{}
 return @{hwnd=$window.ToInt64().ToString();app=$appName;password=[bool]$password;focus=$focusId}
}
function ShortcutTarget {
 # UI Automation can block on another app. Keep the key-event loop responsive
 # so a quick release / second tap cannot disappear while resolving a field.
 $window=[NookFlowNative]::GetForegroundWindow();$taskPid=[uint32]0;$null=[NookFlowNative]::GetWindowThreadProcessId($window,[ref]$taskPid)
 $appName='';try{$appName=(Get-Process -Id $taskPid).ProcessName}catch{}
 return @{hwnd=$window.ToInt64().ToString();app=$appName;password=$true;focus=''}
}
try {
 if($Action -eq 'target'){CurrentTarget | ConvertTo-Json -Compress;exit}
 if($Action -eq 'paste'){
  $current=CurrentTarget
  if($current.hwnd -ne $Target -or $current.password -or -not $Focus -or $current.focus -ne $Focus){throw 'The target changed or cannot safely receive dictation. Copy your draft instead.'}
  if($PrivateClipboard){
   $payload=[Console]::In.ReadToEnd()|ConvertFrom-Json;$dictation=[string]$payload.text
   if(-not $dictation -or $dictation.Length -gt 120000){throw 'Invalid dictation text'}
   . (Join-Path $PSScriptRoot 'windows-clipboard.ps1')
   Invoke-NookPrivatePaste $dictation { [Windows.Forms.SendKeys]::SendWait('^v');Start-Sleep -Milliseconds 250 }
  }else{[Windows.Forms.SendKeys]::SendWait('^v');Start-Sleep -Milliseconds 250}
  @{ok=$true}|ConvertTo-Json -Compress;exit
 }
 $key=@{F8=119;F9=120;F10=121;RightControl=163;RightAlt=165;RightShift=161}[$Shortcut];$held=$false;$cancelled=$false;$modifier=$Shortcut.StartsWith('Right');$keyWasDown=$false;$chord=$false;$pressedAt=0L
 if(-not $modifier -and -not [NookFlowNative]::RegisterHotKey([IntPtr]::Zero,1,0x4006,$key)){throw 'The dictation shortcut is already used by another app. Choose another shortcut.'}
 $pasteReady=[NookFlowNative]::RegisterHotKey([IntPtr]::Zero,2,0x4006,122)
 @{type='ready'}|ConvertTo-Json -Compress
 while($true){
  $message=New-Object NookFlowNative+MSG;$pressed=$false
  while([NookFlowNative]::PeekMessage([ref]$message,[IntPtr]::Zero,0,0,1)){if($message.message -eq 0x0312){if($message.wParam.ToUInt64() -eq 1){$pressed=$true}else{$value=CurrentTarget;$value.type='paste';$value|ConvertTo-Json -Compress}}}
  $down=([NookFlowNative]::GetAsyncKeyState($key) -band 0x8000) -ne 0
  if($modifier){
   if($down -and -not $keyWasDown){$pressedAt=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds();$chord=$false}
   if($down -and [NookFlowNative]::OtherKeyDown($key)){$chord=$true;if($held -and -not $cancelled){$cancelled=$true;@{type='cancel'}|ConvertTo-Json -Compress}}
   if($down -and -not $chord -and -not $held -and ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()-$pressedAt -ge 180)){$pressed=$true}
   if(-not $down -and $keyWasDown -and -not $chord -and -not $held){$pressed=$true}
   $keyWasDown=$down
  }
  if($pressed -and -not $held){$held=$true;$cancelled=$false;$value=ShortcutTarget;$value.type='down';$value|ConvertTo-Json -Compress}
  if($held -and -not $cancelled -and (([NookFlowNative]::GetAsyncKeyState(27) -band 0x8000) -ne 0)){$cancelled=$true;@{type='cancel'}|ConvertTo-Json -Compress}
  if(-not $down -and $held){$held=$false;if(-not $cancelled){@{type='up'}|ConvertTo-Json -Compress}}
  Start-Sleep -Milliseconds 25
 }
}catch{@{type='error';ok=$false;error=$_.Exception.Message}|ConvertTo-Json -Compress}
finally{if($Action -eq 'watch'){$null=[NookFlowNative]::UnregisterHotKey([IntPtr]::Zero,1);$null=[NookFlowNative]::UnregisterHotKey([IntPtr]::Zero,2)}}
