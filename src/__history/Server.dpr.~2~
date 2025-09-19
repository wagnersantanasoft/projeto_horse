program Server;

{$APPTYPE CONSOLE}

uses
  System.SysUtils,
  uServerHorse in 'uServerHorse.pas',
  uDM in 'uDM.pas',
  uRouter in 'uRouter.pas',
  uControllerProdutos in 'uControllerProdutos.pas',
  uControllerMarcas in 'uControllerMarcas.pas',
  uControllerGrupos in 'uControllerGrupos.pas';

begin
  ReportMemoryLeaksOnShutdown := DebugHook <> 0;
  try
    WriteLn('Iniciando servidor...');
    StartServer; // THorse.Listen é bloqueante (não precisa ReadLn depois)
  except
    on E: Exception do
    begin
      Writeln('ERRO FATAL: ' + E.ClassName + ' - ' + E.Message);
      Writeln('Stack (se houver): ' + E.StackTrace);
      Writeln('Pressione ENTER para sair');
      ReadLn;
    end;
  end;
end.
