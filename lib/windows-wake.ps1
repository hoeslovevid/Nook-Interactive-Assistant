param([string]$Language='auto',[switch]$FollowUp)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)
$engine=$null
function Send-NookEvent($Value){[Console]::WriteLine(($Value | ConvertTo-Json -Compress));[Console]::Out.Flush()}
try {
  Add-Type -AssemblyName System.Speech
  $recognizers=@([System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers())
  $chosen=if($Language -eq 'auto'){$recognizers | Where-Object {$_.Culture.Name -like 'en-*'} | Select-Object -First 1}else{$recognizers | Where-Object {$_.Culture.Name -eq $Language} | Select-Object -First 1}
  if(-not $chosen){throw 'Install a Windows speech recognizer.'}
  $engine=[System.Speech.Recognition.SpeechRecognitionEngine]::new($chosen)
  $builder=[System.Speech.Recognition.GrammarBuilder]::new();$builder.Culture=$chosen.Culture;$builder.Append('hey nook')
  $wake=[System.Speech.Recognition.Grammar]::new($builder);$wake.Name='wake';$engine.LoadGrammar($wake)
  $dictation=[System.Speech.Recognition.DictationGrammar]::new();$dictation.Name='dictation';$dictation.Enabled=$false;$engine.LoadGrammar($dictation)
  $engine.SetInputToDefaultAudioDevice()
  Register-ObjectEvent -InputObject $engine -EventName SpeechRecognized -SourceIdentifier NookRecognized | Out-Null
  $engine.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)
  $until=if($FollowUp){[DateTime]::UtcNow.AddSeconds(20)}else{[DateTime]::MinValue};if($FollowUp){$dictation.Enabled=$true};Send-NookEvent @{type='ready'}
  while($true){
    $event=Wait-Event -SourceIdentifier NookRecognized -Timeout 1
    if($event){$result=$event.SourceEventArgs.Result;Remove-Event -EventIdentifier $event.EventIdentifier
      if($result.Grammar.Name -eq 'wake' -and $result.Confidence -ge .65){$until=[DateTime]::UtcNow.AddSeconds(10);$dictation.Enabled=$true;Send-NookEvent @{type='wake'}}
      elseif($until -gt [DateTime]::UtcNow -and $result.Grammar.Name -eq 'dictation' -and $result.Confidence -ge .45){$dictation.Enabled=$false;$until=[DateTime]::MinValue;Send-NookEvent @{type='text';text=$result.Text}}
    }
    if($until -ne [DateTime]::MinValue -and $until -le [DateTime]::UtcNow){$dictation.Enabled=$false;$until=[DateTime]::MinValue;Send-NookEvent @{type='idle'};if($FollowUp){break}}
  }
}catch{Send-NookEvent @{type='error'}}
finally{Unregister-Event -SourceIdentifier NookRecognized -ErrorAction SilentlyContinue;if($engine){$engine.RecognizeAsyncCancel();$engine.Dispose()}}
