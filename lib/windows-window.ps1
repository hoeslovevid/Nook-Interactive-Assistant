param([int]$X, [int]$Y, [int]$SkipPid)
$ErrorActionPreference = 'Stop'
try {
  Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public class NookWindow {
  public delegate bool Callback(IntPtr h, IntPtr p);
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int L,T,R,B; }
  [DllImport("user32.dll")] public static extern bool EnumWindows(Callback cb, IntPtr p);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out Rect r);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int attr, out int value, int size);
  public static string Find(int x, int y, uint skip) {
    string result = "";
    EnumWindows((h,p) => {
      uint pid; GetWindowThreadProcessId(h, out pid);
      if (pid == skip || !IsWindowVisible(h) || IsIconic(h)) return true;
      int cloaked; if (DwmGetWindowAttribute(h, 14, out cloaked, 4) == 0 && cloaked != 0) return true;
      Rect r; if (!GetWindowRect(h, out r) || x < r.L || x >= r.R || y < r.T || y >= r.B) return true;
      var title = new StringBuilder(512); GetWindowText(h,title,512);
      if (title.Length == 0) return true;
      result = h.ToInt64().ToString(); return false;
    }, IntPtr.Zero);
    return result;
  }
}
'@
  @{ok=$true; handle=[NookWindow]::Find($X,$Y,$SkipPid)} | ConvertTo-Json -Compress
} catch { @{ok=$false;error='Could not identify that window.'} | ConvertTo-Json -Compress }
