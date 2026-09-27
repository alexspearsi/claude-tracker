$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$icon = New-Object System.Windows.Forms.NotifyIcon
try {
    $icon.Icon = [System.Drawing.SystemIcons]::Information
    $icon.Visible = $true
    $icon.ShowBalloonTip(5000, 'Claude Code', 'Claude Code завершил ответ', [System.Windows.Forms.ToolTipIcon]::Info)
    Start-Sleep -Seconds 6
}
finally {
    $icon.Visible = $false
    $icon.Dispose()
}
