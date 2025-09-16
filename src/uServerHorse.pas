unit uServerHorse;

interface

procedure StartServer;

implementation

uses
  System.SysUtils,
  Horse,
  Horse.CORS,
  uDM,
  uRouter;

procedure StartServer;
var
  Port: Integer;
begin
  // Cria conexão
  DM := TDM.Create;

  // Middlewares
  THorse.Use(CORS);

  // Rotas
  RegisterRoutes;

  Port := 9000; // pode ler do INI se quiser
  Writeln('Iniciando Horse na porta ' + Port.ToString + ' ...');
  // PARA versões antigas: apenas isso
  THorse.Listen(Port); // bloqueante

  // (Nada após esta linha é executado até o servidor parar)
end;

end.
