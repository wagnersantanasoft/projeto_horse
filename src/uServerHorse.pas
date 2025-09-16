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
  // Cria conex�o
  DM := TDM.Create;

  // Middlewares
  THorse.Use(CORS);

  // Rotas
  RegisterRoutes;

  Port := 9000; // pode ler do INI se quiser
  Writeln('Iniciando Horse na porta ' + Port.ToString + ' ...');
  // PARA vers�es antigas: apenas isso
  THorse.Listen(Port); // bloqueante

  // (Nada ap�s esta linha � executado at� o servidor parar)
end;

end.
