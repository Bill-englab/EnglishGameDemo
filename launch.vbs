' ============================================================
'  My English Adventure -- silent desktop launcher (launch.vbs)
'
'  What it does:
'    1. Starts the Flask server with NO visible cmd window
'       (WScript.Shell.Run with window style 0 = hidden).
'    2. Waits for http://127.0.0.1:5000 to answer (up to ~20s).
'    3. Opens Chrome in "app mode" (--app=...) -- no address bar,
'       no tabs -- maximized, using an ISOLATED user-data-dir so the
'       window is independent of normal browsing.
'    4. BLOCKS until that Chrome instance exits (Run wait=true),
'       then kills the Flask server by finding the PID that owns
'       port 5000 (netstat) and taskkilling its tree.
'
'  No console window is ever shown. No WMI dependency -- every
'  mechanism used here has been validated on a stock Windows box.
'  Run by double-clicking, or:  wscript launch.vbs
' ============================================================
Option Explicit

Dim fso, sh, q
Dim repoRoot, appDir, pythonExe
Dim chromePath, profileDir, url
Dim ready, waited
Dim flaskCmd, chromeCmd

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh  = CreateObject("WScript.Shell")
q = Chr(34)   ' double-quote character, for safely quoting paths with spaces

' --- Derive all paths from THIS script's location (the repo root) ---
repoRoot  = fso.GetParentFolderName(WScript.ScriptFullName)
appDir    = fso.BuildPath(repoRoot, "app")
pythonExe = fso.BuildPath(appDir, ".venv\Scripts\python.exe")
url       = "http://127.0.0.1:5000/"

' Chrome (try the two standard install locations) + an isolated
' profile dir so our app window is a standalone Chrome instance
' (this is what lets Run's "wait" return only when IT closes).
chromePath = ResolveChrome()
profileDir = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & _
             "\MyEnglishAdventure\chrome-profile"

' ===== 1. Validate the virtualenv exists =====
If Not fso.FileExists(pythonExe) Then
    MsgBox "Could not find the Python virtualenv at:" & vbCrLf & vbCrLf & _
           pythonExe & vbCrLf & vbCrLf & _
           "Create it first by running run.bat, or manually:" & vbCrLf & _
           "  cd app" & vbCrLf & _
           "  python -m venv .venv" & vbCrLf & _
           "  .venv\Scripts\python -m pip install -r requirements.txt", _
           vbCritical, "My English Adventure"
    WScript.Quit(1)
End If

' ===== 2. Start Flask silently (hidden cmd window) =====
'   window style 0 = hidden; wait=False so we can poll the URL next.
'   Chr(34) quotes the paths in case they contain spaces.
flaskCmd = "cmd /c cd /d " & q & appDir & q & " && " & _
           q & pythonExe & q & " app.py"
sh.Run flaskCmd, 0, False

' ===== 3. Wait for the server to answer (up to ~20 seconds) =====
ready  = False
waited = 0
Do While waited < 40
    WScript.Sleep 500
    waited = waited + 1
    If ServerIsUp(url) Then
        ready = True
        Exit Do
    End If
Loop

If Not ready Then
    MsgBox "The server did not start in time." & vbCrLf & _
           "If port 5000 is already in use, close that program and " & _
           "try again. (If a Python process is stuck, end it via " & _
           "Task Manager.)", vbExclamation, "My English Adventure"
    WScript.Quit(1)
End If

' ===== 4. Open Chrome in app mode and WAIT until it closes =====
' Point --app directly at the HTTP URL so theme-color meta and other
' web-platform features work correctly. The favicon is served by Flask
' from /static/favicon.ico so no wrapper HTML is needed.

If chromePath <> "" Then
    chromeCmd = q & chromePath & q & _
                " --app=" & url & _
                " --start-maximized --user-data-dir=" & q & profileDir & q
    sh.Run chromeCmd, 1, True
Else
    ' No Chrome found: open the default browser instead, and ask the
    ' user to confirm when they are done (we cannot track that window).
    sh.Run url
    MsgBox "The app opened in your default browser." & vbCrLf & vbCrLf & _
           "(Install Chrome to get the full-screen, no-address-bar " & _
           "app experience.)" & vbCrLf & vbCrLf & _
           "Click OK when you are done to stop the server.", _
           vbInformation, "My English Adventure"
End If

' ===== 5. Cleanup: kill the Flask server owning port 5000 =====
CleanupFlask

' ------------------------------------------------------------
' Helper functions / subs
' ------------------------------------------------------------

' Returns the Chrome exe path if found in a standard location,
' else "" (caller falls back to the default browser).
Function ResolveChrome()
    Dim candidates, p
    candidates = Array( _
        "C:\Program Files\Google\Chrome\Application\chrome.exe", _
        "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe")
    For Each p In candidates
        If fso.FileExists(p) Then
            ResolveChrome = p
            Exit Function
        End If
    Next
    ResolveChrome = ""
End Function

' Returns True if targetUrl answers HTTP 200 within ~1s.
Function ServerIsUp(targetUrl)
    On Error Resume Next
    Dim http
    Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
    http.SetTimeouts 1000, 1000, 1000, 1000
    http.Open "GET", targetUrl, False
    http.Send
    If Err.Number = 0 And http.Status = 200 Then
        ServerIsUp = True
    Else
        ServerIsUp = False
    End If
    On Error GoTo 0
End Function

' Find the PID that owns port 5000 (via netstat) and kill its tree.
' Re-checks a couple of times in case the debug reloader respawns
' (it does not in practice, but this is a safe belt-and-suspenders).
Sub CleanupFlask
    Dim tmpFile, tf, line, parts, thePid, attempts
    tmpFile = sh.ExpandEnvironmentStrings("%TEMP%") & "\mea_netstat.txt"
    attempts = 0
    Do
        attempts = attempts + 1
        If attempts > 3 Then Exit Do

        ' List the PID listening on :5000, redirected to a temp file (hidden).
        sh.Run "cmd /c netstat -ano -p TCP | findstr "":5000"" " & _
               "| findstr ""LISTENING"" > """ & tmpFile & """", 0, True

        thePid = ""
        If fso.FileExists(tmpFile) Then
            Set tf = fso.OpenTextFile(tmpFile, 1)
            Do Until tf.AtEndOfStream
                line = Trim(tf.ReadLine)
                If Len(line) > 0 Then
                    parts = Split(line)
                    thePid = parts(UBound(parts))   ' last token = PID
                    Exit Do
                End If
            Loop
            tf.Close
            fso.DeleteFile tmpFile
        End If

        If thePid = "" Then Exit Do   ' nothing on 5000 -> clean
        sh.Run "taskkill /F /T /PID " & thePid, 0, True
        WScript.Sleep 500
    Loop
End Sub
