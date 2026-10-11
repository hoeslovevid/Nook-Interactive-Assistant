param([string]$TabTitle)
$ErrorActionPreference = 'Stop'
try {
  if ($TabTitle -notmatch ('^Nook ' + [char]0x00b7 + ' [a-f0-9]{12}$')) { throw 'Invalid tab' }
  Add-Type -AssemblyName UIAutomationClient,UIAutomationTypes
  Add-Type -TypeDefinition @'
using System;using System.Runtime.InteropServices;
public static class NookTerminalWindow {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr handle);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr handle,int command);
}
'@
  $root = [System.Windows.Automation.AutomationElement]::RootElement
  $windows = $root.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition)
  foreach ($window in $windows) {
    if ($window.Current.ClassName -ne 'CASCADIA_HOSTING_WINDOW_CLASS') { continue }
    $condition = [System.Windows.Automation.AndCondition]::new(
      [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::TabItem),
      [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::NameProperty,$TabTitle))
    $tab = $window.FindFirst([System.Windows.Automation.TreeScope]::Descendants,$condition)
    if ($null -eq $tab) { continue }
    $pattern = $tab.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern)
    $pattern.Select()
    $handle = [IntPtr]$window.Current.NativeWindowHandle
    [NookTerminalWindow]::ShowWindow($handle,9) | Out-Null
    [NookTerminalWindow]::SetForegroundWindow($handle) | Out-Null
    @{ok=$true;exact=$true} | ConvertTo-Json -Compress
    exit 0
  }
  @{ok=$false;error='The linked terminal tab is no longer open.'} | ConvertTo-Json -Compress
} catch { @{ok=$false;error='Windows could not focus that terminal tab.'} | ConvertTo-Json -Compress }
