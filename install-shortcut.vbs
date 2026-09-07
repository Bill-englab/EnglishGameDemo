' ============================================================
'  TigerTales -- desktop shortcut installer
'
'  Creates a "TigerTales" shortcut on the Desktop that
'  launches the Electron app directly. The shortcut uses the app's
'  favicon.ico as its icon.
'
'  Run once by double-clicking, or:  wscript install-shortcut.vbs
'  After that, drag the shortcut to the taskbar to pin it.
' ============================================================
Option Explicit

Dim fso, sh
Dim repoRoot, appDir, electronExe, electronMain, faviconIco
Dim desktopPath, lnkPath, lnk

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh  = CreateObject("WScript.Shell")

' Derive paths from THIS script's location (the repo root).
repoRoot    = fso.GetParentFolderName(WScript.ScriptFullName)
appDir      = fso.BuildPath(repoRoot, "app")
electronExe = fso.BuildPath(appDir, "node_modules\electron\dist\electron.exe")
electronMain = fso.BuildPath(repoRoot, "electron\main.cjs")
faviconIco  = fso.BuildPath(appDir, "static\favicon.ico")

If Not fso.FileExists(electronExe) Then
    MsgBox "Electron binary not found at:" & vbCrLf & vbCrLf & _
           electronExe & vbCrLf & vbCrLf & _
           "Run:  cd app && npm install", vbCritical, "TigerTales"
    WScript.Quit(1)
End If

desktopPath = sh.SpecialFolders("Desktop")
lnkPath     = fso.BuildPath(desktopPath, "TigerTales.lnk")

Set lnk = sh.CreateShortcut(lnkPath)
lnk.TargetPath       = electronExe
lnk.Arguments        = """" & electronMain & """"
lnk.WorkingDirectory = repoRoot
lnk.WindowStyle      = 1
lnk.Description      = "Launch TigerTales"

If fso.FileExists(faviconIco) Then
    lnk.IconLocation = faviconIco & ",0"
Else
    lnk.IconLocation = "shell32.dll,44"
End If

lnk.Save

MsgBox "Shortcut created on your Desktop:" & vbCrLf & vbCrLf & _
       lnkPath & vbCrLf & vbCrLf & _
       "Double-click it to start the app." & vbCrLf & _
       "Tip: right-click it and 'Pin to taskbar' for one-click launch.", _
       vbInformation, "TigerTales"
