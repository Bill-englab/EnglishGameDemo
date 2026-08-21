' ============================================================
'  My English Adventure -- Electron desktop launcher (launch.vbs)
'
'  Starts the Electron app which internally:
'    1. Starts the Flask server (hidden)
'    2. Opens a frameless window loading the app
'    3. Kills Flask when the window closes
'
'  Run by double-clicking, or:  wscript launch.vbs
' ============================================================
Option Explicit

Dim fso, sh
Dim repoRoot, appDir, npmCmd

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh  = CreateObject("WScript.Shell")

' --- Derive paths from THIS script's location (the repo root) ---
repoRoot  = fso.GetParentFolderName(WScript.ScriptFullName)
appDir    = fso.BuildPath(repoRoot, "app")

' ===== Validate node_modules exists (electron installed) =====
If Not fso.FolderExists(fso.BuildPath(appDir, "node_modules\electron")) Then
    MsgBox "Electron is not installed." & vbCrLf & vbCrLf & _
           "Run this once to install:" & vbCrLf & _
           "  cd app" & vbCrLf & _
           "  npm install" & vbCrLf & vbCrLf & _
           "Then try again.", vbExclamation, "My English Adventure"
    WScript.Quit(1)
End If

' ===== Launch Electron (blocks until window closes) =====
' Electron main.cjs handles Flask startup and cleanup internally.
sh.CurrentDirectory = appDir
sh.Run "cmd /c npx electron ..", 0, True
