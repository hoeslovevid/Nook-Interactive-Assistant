param([int]$SkipPid,[switch]$Once)
$ErrorActionPreference='Stop'
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public class NookFullscreen {
 [StructLayout(LayoutKind.Sequential)] public struct Rect { public int L,T,R,B; }
 [StructLayout(LayoutKind.Sequential)] public struct Monitor { public int Size; public Rect Bounds; public Rect Work; public int Flags; }
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out Rect rect);
 [DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr h, uint flags);
 [DllImport("user32.dll")] public static extern bool GetMonitorInfo(IntPtr h, ref Monitor monitor);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder value,int length);
 public static int[] Read(uint skip) {
  var h=GetForegroundWindow(); uint pid;GetWindowThreadProcessId(h,out pid);
  if(h==IntPtr.Zero||pid==skip)return new int[]{0,0,0};
  var name=new StringBuilder(256);GetClassName(h,name,256);
  if(name.ToString()=="Progman"||name.ToString()=="WorkerW"||name.ToString()=="Shell_TrayWnd")return new int[]{0,0,0};
  Rect rect;var monitor=new Monitor();monitor.Size=Marshal.SizeOf(monitor);
  if(!GetWindowRect(h,out rect)||!GetMonitorInfo(MonitorFromWindow(h,2),ref monitor))return new int[]{0,0,0};
  var bounds=monitor.Bounds;
  bool full=rect.L<=bounds.L+2&&rect.T<=bounds.T+2&&rect.R>=bounds.R-2&&rect.B>=bounds.B-2;
  return new int[]{full?1:0,bounds.L+10,bounds.T+10};
 }
}
'@
$last=''
while($true){
 $value=[NookFullscreen]::Read($SkipPid)
 $line=@{fullscreen=($value[0] -eq 1);x=$value[1];y=$value[2]} | ConvertTo-Json -Compress
 if($line -ne $last){[Console]::Out.WriteLine($line);[Console]::Out.Flush();$last=$line}
 if($Once){break}
 Start-Sleep -Milliseconds 1800
}
