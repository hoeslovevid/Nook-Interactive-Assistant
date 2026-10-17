$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
try {@{ok=$true;apps=@(Get-StartApps | Sort-Object Name | Select-Object -First 1000 | ForEach-Object {@{name=$_.Name;target=$_.AppID;kind='appId'}})} | ConvertTo-Json -Depth 4 -Compress}
catch {@{ok=$false;error='Windows could not list installed apps. Choose an executable instead.'} | ConvertTo-Json -Compress}
