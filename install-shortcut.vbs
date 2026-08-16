' ============================================================
'  My English Adventure -- desktop shortcut installer
'  (install-shortcut.vbs)
'
'  Creates a "My English Adventure" shortcut on the Desktop that
'  runs launch.vbs via wscript.exe (no console window). The
'  shortcut uses the app's favicon.ico as its icon when available.
'
'  Run once by double-clicking, or:  wscript install-shortcut.vbs
'  After that, drag the shortcut to the taskbar to pin it.
' ============================================================
Option Explicit

Dim fso, sh
Dim repoRoot, launchVbs, faviconIco, desktopPath, lnkPath
Dim lnk

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh  = CreateObject("WScript.Shell")

' Derive paths from THIS script's location (the repo root).
repoRoot   = fso.GetParentFolderName(WScript.ScriptFullName)
launchVbs  = fso.BuildPath(repoRoot, "launch.vbs")
faviconIco = fso.BuildPath(repoRoot, "app\static\favicon.ico")

If Not fso.FileExists(launchVbs) Then
    MsgBox "launch.vbs was not found next to this installer:" & vbCrLf & _
           launchVbs, vbCritical, "My English Adventure"
    WScript.Quit(1)
End If

desktopPath = sh.SpecialFolders("Desktop")
lnkPath     = fso.BuildPath(desktopPath, "My English Adventure.lnk")

Set lnk = sh.CreateShortcut(lnkPath)
' wscript.exe runs .vbs with NO console window (cscript would show one).
lnk.TargetPath       = sh.ExpandEnvironmentStrings("%SystemRoot%") & _
                       "\System32\wscript.exe"
lnk.Arguments        = """" & launchVbs & """"
lnk.WorkingDirectory = repoRoot
lnk.WindowStyle      = 7   ' minimized (wscript has no window anyway)
lnk.Description      = "Launch My English Adventure"

' Use the custom icon if we generated one; otherwise fall back to a
' friendly shell icon (44 = a star).
If fso.FileExists(faviconIco) Then
    lnk.IconLocation = faviconIco & ",0"
Else
    lnk.IconLocation = "shell32.dll,44"
End If

lnk.Save

MsgBox "Shortcut created on your Desktop:" & vbCrLf & vbCrLf & _
       lnkPath & vbCrLf & vbCrLf & _
       "Double-click it to start the app in a desktop window." & vbCrLf & _
       "Tip: drag it onto the taskbar to pin it for one-click launch.", _
       vbInformation, "My English Adventure"
