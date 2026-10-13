param([switch]$Watch)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)
try{Add-Type @'
using System;
using System.Runtime.InteropServices;
public class NookForeground {
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
}
'@
$taskLastPid=-1
do {
  [uint32]$taskPid=0;[NookForeground]::GetWindowThreadProcessId([NookForeground]::GetForegroundWindow(),[ref]$taskPid) | Out-Null
  if($taskPid -ne $taskLastPid){$taskLastPid=$taskPid;$taskProcess=Get-Process -Id $taskPid -ErrorAction SilentlyContinue
    [Console]::WriteLine((@{ok=$true;app=if($taskProcess){$taskProcess.ProcessName}else{''}} | ConvertTo-Json -Compress));[Console]::Out.Flush()
  }
  if($Watch){Start-Sleep -Seconds 2}
}while($Watch)
}catch{@{ok=$false;app=''} | ConvertTo-Json -Compress}
