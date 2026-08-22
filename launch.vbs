Option Explicit
Dim fso, sh, repoRoot, appDir, electronExe, electronMain, q

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh  = CreateObject("WScript.Shell")

repoRoot  = fso.GetParentFolderName(WScript.ScriptFullName)
appDir    = fso.BuildPath(repoRoot, "app")

' Check electron exists
Dim electronDir
electronDir = fso.BuildPath(appDir, "node_modules\electron")
If Not fso.FolderExists(electronDir) Then
    MsgBox "Electron not found: " & electronDir
    WScript.Quit(1)
End If

electronExe  = fso.BuildPath(appDir, "node_modules\electron\dist\electron.exe")
electronMain = fso.BuildPath(repoRoot, "electron\main.cjs")

If Not fso.FileExists(electronExe) Then
    MsgBox "electron.exe not found: " & electronExe
    WScript.Quit(1)
End If

q = Chr(34)
Dim cmd
cmd = q & electronExe & q & " " & q & electronMain & q

' Write a log file to debug
Dim logFile
Set logFile = fso.CreateTextFile(fso.BuildPath(repoRoot, "launch-debug.log"), True)
logFile.WriteLine "repoRoot: " & repoRoot
logFile.WriteLine "electronExe: " & electronExe
logFile.WriteLine "electronMain: " & electronMain
logFile.WriteLine "cmd: " & cmd
logFile.WriteLine "WorkingDir: " & repoRoot
logFile.Close

sh.CurrentDirectory = repoRoot
sh.Run cmd, 1, True
