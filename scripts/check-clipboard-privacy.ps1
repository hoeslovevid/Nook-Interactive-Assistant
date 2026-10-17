$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
. (Join-Path $PSScriptRoot '../lib/windows-clipboard.ps1')
$priorText=[Windows.Forms.Clipboard]::GetText()
$priorFormats=@([Windows.Forms.Clipboard]::GetDataObject().GetFormats($false)|Sort-Object)
$checks=[Collections.Generic.List[bool]]::new()
Invoke-NookPrivatePaste 'Nook isolated clipboard verification' {
 $data=[Windows.Forms.Clipboard]::GetDataObject()
 foreach($format in @('CanIncludeInClipboardHistory','CanUploadToCloudClipboard')){
  $stream=$data.GetData($format,$false)
  $checks.Add($stream -is [IO.MemoryStream] -and $stream.ToArray().Length -eq 4 -and [BitConverter]::ToInt32($stream.ToArray(),0) -eq 0)
 }
 $checks.Add($data.GetDataPresent('ExcludeClipboardContentFromMonitorProcessing',$false))
 $checks.Add([Windows.Forms.Clipboard]::GetText() -ceq 'Nook isolated clipboard verification')
 # No paste key is sent and no application receives the test text.
}
$checks.Add([Windows.Forms.Clipboard]::GetText() -ceq $priorText)
$afterFormats=@([Windows.Forms.Clipboard]::GetDataObject().GetFormats($false)|Sort-Object)
$checks.Add(($priorFormats -join '|') -ceq ($afterFormats -join '|'))
if($checks.Contains($false)){throw 'Clipboard flags or restoration failed'}
@{ok=$true;flags=$true;restored=$true;checks=$checks.Count}|ConvertTo-Json -Compress
