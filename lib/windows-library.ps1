param([ValidateSet('selection','ocr')][string]$Action='selection',[string]$ImagePath)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
try {
 if($Action -eq 'selection') {
  Add-Type -AssemblyName UIAutomationClient
  $element=[Windows.Automation.AutomationElement]::FocusedElement
  if(-not $element -or $element.Current.IsPassword){throw 'This field is protected or unavailable. Select text in another app, or paste it into Library & tools.'}
  $pattern=$null
  if(-not $element.TryGetCurrentPattern([Windows.Automation.TextPattern]::Pattern,[ref]$pattern)){throw 'This app does not expose selected text. Copy it yourself and paste it into Library & tools.'}
  $ranges=$pattern.GetSelection();$selected=''
  foreach($range in $ranges){$selected+=$range.GetText(20000)}
  if(-not $selected.Trim()){throw 'Select some text first. You can also paste text into Library & tools.'}
  @{ok=$true;text=$selected.Substring(0,[Math]::Min(20000,$selected.Length));source=$element.Current.Name.Substring(0,[Math]::Min(100,$element.Current.Name.Length))}|ConvertTo-Json -Compress
  exit
 }
 Add-Type -AssemblyName System.Runtime.WindowsRuntime
 $null=[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
 $null=[Windows.Storage.Streams.IRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime]
 $null=[Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics.Imaging,ContentType=WindowsRuntime]
 $null=[Windows.Graphics.Imaging.SoftwareBitmap,Windows.Graphics.Imaging,ContentType=WindowsRuntime]
 $null=[Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
 $null=[Windows.Media.Ocr.OcrResult,Windows.Foundation,ContentType=WindowsRuntime]
 function Await($operation,[Type]$resultType){
  $method=[System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object {$_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1}|Select-Object -First 1
  $task=$method.MakeGenericMethod($resultType).Invoke($null,@($operation));$task.Wait();return $task.Result
 }
 $file=Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($ImagePath)) ([Windows.Storage.StorageFile])
 $stream=Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
 try {
  $decoder=Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $engine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
  if(-not $engine){throw 'Install an OCR language in Windows Language settings first.'}
  if($decoder.PixelWidth -gt [Windows.Media.Ocr.OcrEngine]::MaxImageDimension -or $decoder.PixelHeight -gt [Windows.Media.Ocr.OcrEngine]::MaxImageDimension){throw 'This image is too large for Windows OCR. Crop or resize it first.'}
  $bitmap=Await ($decoder.GetSoftwareBitmapAsync([Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8,[Windows.Graphics.Imaging.BitmapAlphaMode]::Premultiplied)) ([Windows.Graphics.Imaging.SoftwareBitmap])
  try {$result=Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult]);@{ok=$true;text=$result.Text}|ConvertTo-Json -Compress}finally{$bitmap.Dispose()}
 }finally{$stream.Dispose()}
}catch{@{ok=$false;error=$_.Exception.Message}|ConvertTo-Json -Compress}
