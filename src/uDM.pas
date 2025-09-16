unit uDM;

interface

uses
  System.SysUtils, System.Classes, System.IniFiles,
  FireDAC.Comp.Client, FireDAC.Stan.Intf, FireDAC.Stan.Option, FireDAC.Stan.Error,
  FireDAC.UI.Intf, FireDAC.Stan.Def, FireDAC.Stan.Pool, FireDAC.Stan.Async,
  FireDAC.Phys, FireDAC.Phys.Intf, FireDAC.Phys.FB, FireDAC.Phys.FBDef,
  FireDAC.VCLUI.Wait, Data.DB;

type
  TDM = class
  private
    procedure LoadConfig;
  public
    FDConnection: TFDConnection;
    constructor Create;
    destructor Destroy; override;
  end;

var
  DM: TDM;

implementation

{ TDM }

constructor TDM.Create;
begin
  inherited Create;
  FDConnection := TFDConnection.Create(nil);
  LoadConfig;
  try
    FDConnection.Connected := True;
    Writeln('Conexao Firebird OK');
  except
    on E: Exception do
    begin
      Writeln('Falha ao conectar: ' + E.Message);
      raise;
    end;
  end;
end;

destructor TDM.Destroy;
begin
  FDConnection.Free;
  inherited;
end;

procedure TDM.LoadConfig;
var
  INI: TIniFile;
  LPath: string;
begin

  LPath := ExtractFilePath(ParamStr(0)) + 'config\config.ini';

  if not FileExists(LPath) then
    Writeln('ATENCAO: config.ini NAO encontrado em: ' + LPath);

  INI := TIniFile.Create(LPath);
  try
    FDConnection.Params.Clear;
    FDConnection.Params.Add('DriverID=' + INI.ReadString('database','DriverID','FB'));
    FDConnection.Params.Add('Server=' + INI.ReadString('database','Server','localhost'));
    FDConnection.Params.Add('Port=' + INI.ReadString('database','Port','3050'));
    FDConnection.Params.Add('Database=' + INI.ReadString('database','Database',''));
    FDConnection.Params.Add('User_Name=' + INI.ReadString('database','User_Name','SYSDBA'));
    FDConnection.Params.Add('Password=' + INI.ReadString('database','Password','masterkey'));
    FDConnection.Params.Add('CharacterSet=' + INI.ReadString('database','CharacterSet','UTF8'));
    FDConnection.LoginPrompt := False;
  finally
    INI.Free;
  end;
end;

end.
