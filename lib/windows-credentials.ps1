$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
try {
  $request = [Console]::In.ReadToEnd() | ConvertFrom-Json
  Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class NookCredentials {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct Credential {
    public UInt32 Flags, Type;
    [MarshalAs(UnmanagedType.LPWStr)] public string TargetName;
    [MarshalAs(UnmanagedType.LPWStr)] public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public UInt32 CredentialBlobSize;
    public IntPtr CredentialBlob;
    public UInt32 Persist, AttributeCount;
    public IntPtr Attributes;
    [MarshalAs(UnmanagedType.LPWStr)] public string TargetAlias;
    [MarshalAs(UnmanagedType.LPWStr)] public string UserName;
  }
  [DllImport("advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
  static extern bool CredRead(string target, UInt32 type, UInt32 flags, out IntPtr pointer);
  [DllImport("advapi32.dll", EntryPoint="CredWriteW", CharSet=CharSet.Unicode, SetLastError=true)]
  static extern bool CredWrite(ref Credential credential, UInt32 flags);
  [DllImport("advapi32.dll", EntryPoint="CredDeleteW", CharSet=CharSet.Unicode, SetLastError=true)]
  static extern bool CredDelete(string target, UInt32 type, UInt32 flags);
  [DllImport("advapi32.dll")] static extern void CredFree(IntPtr pointer);
  public static string Read(string target) {
    IntPtr pointer;
    if (!CredRead(target, 1, 0, out pointer)) {
      if (Marshal.GetLastWin32Error() == 1168) return null;
      throw new InvalidOperationException("Credential Manager could not read this entry.");
    }
    try {
      var credential = (Credential)Marshal.PtrToStructure(pointer, typeof(Credential));
      var bytes = new byte[credential.CredentialBlobSize];
      Marshal.Copy(credential.CredentialBlob, bytes, 0, bytes.Length);
      return Encoding.UTF8.GetString(bytes);
    } finally { CredFree(pointer); }
  }
  public static void Write(string target, string value) {
    byte[] bytes = Encoding.UTF8.GetBytes(value);
    if (bytes.Length > 2560) throw new InvalidOperationException("Credential is too long.");
    IntPtr blob = Marshal.AllocHGlobal(bytes.Length);
    try {
      Marshal.Copy(bytes, 0, blob, bytes.Length);
      var credential = new Credential { Type=1, TargetName=target, CredentialBlobSize=(UInt32)bytes.Length, CredentialBlob=blob, Persist=2, UserName="Nook" };
      if (!CredWrite(ref credential, 0)) throw new InvalidOperationException("Credential Manager could not save this entry.");
    } finally { Marshal.FreeHGlobal(blob); Array.Clear(bytes, 0, bytes.Length); }
  }
  public static void Delete(string target) {
    if (!CredDelete(target, 1, 0) && Marshal.GetLastWin32Error() != 1168) throw new InvalidOperationException("Credential Manager could not remove this entry.");
  }
}
'@
  $values = @{}
  foreach ($target in $request.targets) {
    if ($target -notmatch '^Nook/[a-f0-9]{20}/[a-z][a-z0-9-]{0,40}$') { throw 'Invalid credential namespace.' }
    if ($request.action -eq 'read') { $value = [NookCredentials]::Read($target); if ($null -ne $value) { $values[$target] = $value } }
    elseif ($request.action -eq 'write' -and $request.targets.Count -eq 1) { [NookCredentials]::Write($target, [string]$request.value) }
    elseif ($request.action -eq 'delete') { [NookCredentials]::Delete($target) }
    else { throw 'Unknown credential action.' }
  }
  @{ ok=$true; values=$values } | ConvertTo-Json -Compress -Depth 3
} catch {
  # Never include request values, command output, or native exception details.
  @{ ok=$false; error='Windows Credential Manager is unavailable. Existing encrypted keys are retained.' } | ConvertTo-Json -Compress
  exit 1
}
