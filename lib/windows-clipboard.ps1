# Caller checks that the same non-password field still owns keyboard focus.
function Invoke-NookPrivatePaste([string]$Dictation,[scriptblock]$Paste) {
 $previous=[Windows.Forms.DataObject]::new();$old=[Windows.Forms.Clipboard]::GetDataObject()
 if($old){foreach($format in $old.GetFormats($false)){$value=$old.GetData($format,$false);if($value -is [IO.MemoryStream]){$value=[IO.MemoryStream]::new($value.ToArray())};$previous.SetData($format,$false,$value)}}
 $data=[Windows.Forms.DataObject]::new();$data.SetText($Dictation,[Windows.Forms.TextDataFormat]::UnicodeText)
 foreach($format in @('CanIncludeInClipboardHistory','CanUploadToCloudClipboard')){$data.SetData($format,$false,[IO.MemoryStream]::new([byte[]](0,0,0,0)))}
 $data.SetData('ExcludeClipboardContentFromMonitorProcessing',$false,[IO.MemoryStream]::new([byte[]](0)))
 [Windows.Forms.Clipboard]::SetDataObject($data,$true)
 try{& $Paste}finally{if([Windows.Forms.Clipboard]::ContainsText() -and [Windows.Forms.Clipboard]::GetText() -ceq $Dictation){[Windows.Forms.Clipboard]::SetDataObject($previous,$true)}}
}
