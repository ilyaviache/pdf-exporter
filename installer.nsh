!include LogicLib.nsh

!macro customInit
  ; Add any custom initialization here
  
  ; Set default installation directory
  ${If} ${RunningX64}
    StrCpy $INSTDIR "$PROGRAMFILES64\PDF Exporter"
  ${Else}
    StrCpy $INSTDIR "$PROGRAMFILES\PDF Exporter"
  ${EndIf}
!macroend

!macro customInstall
  ; Add any custom installation steps here
  
  ; Create user data directories
  SetShellVarContext current
  CreateDirectory "$APPDATA\PDF Exporter"
  CreateDirectory "$APPDATA\PDF Exporter\input-html"
  CreateDirectory "$APPDATA\PDF Exporter\output"
  
  ; Create shortcuts to input and output folders
  CreateShortCut "$DESKTOP\PDF Exporter Input.lnk" "$APPDATA\PDF Exporter\input-html"
  CreateShortCut "$DESKTOP\PDF Exporter Output.lnk" "$APPDATA\PDF Exporter\output"
  
  ; Create start menu shortcuts
  CreateDirectory "$SMPROGRAMS\PDF Exporter"
  CreateShortCut "$SMPROGRAMS\PDF Exporter\Input Folder.lnk" "$APPDATA\PDF Exporter\input-html"
  CreateShortCut "$SMPROGRAMS\PDF Exporter\Output Folder.lnk" "$APPDATA\PDF Exporter\output"
!macroend

!macro customUnInstall
  ; Add any custom uninstall steps here
  
  ; Remove user data directories (optional - you might want to keep them)
  ; SetShellVarContext current
  ; RMDir /r "$APPDATA\PDF Exporter"
  
  ; Remove shortcuts
  Delete "$DESKTOP\PDF Exporter Input.lnk"
  Delete "$DESKTOP\PDF Exporter Output.lnk"
  Delete "$SMPROGRAMS\PDF Exporter\Input Folder.lnk"
  Delete "$SMPROGRAMS\PDF Exporter\Output Folder.lnk"
  RMDir "$SMPROGRAMS\PDF Exporter"
!macroend 