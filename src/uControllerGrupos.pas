unit uControllerGrupos;

interface

uses Horse;

procedure GruposList(Req: THorseRequest; Res: THorseResponse; Next: TProc);
procedure GruposGet(Req: THorseRequest; Res: THorseResponse; Next: TProc);
procedure GruposPost(Req: THorseRequest; Res: THorseResponse; Next: TProc);
procedure GruposPut(Req: THorseRequest; Res: THorseResponse; Next: TProc);
procedure GruposDelete(Req: THorseRequest; Res: THorseResponse; Next: TProc);

implementation

uses FireDAC.Comp.Client, uDM, System.SysUtils, System.JSON, uUtilsJSON;

procedure GruposList(Req: THorseRequest; Res: THorseResponse; Next: TProc);
var Q: TFDQuery;
begin
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := DM.FDConnection;
    Q.SQL.Text := 'SELECT gp_codigo, gp_descri FROM GRUPO ORDER BY gp_codigo';
    Q.Open;
    Res.Send(DataSetToJSONArray(Q));
  finally
    Q.Free;
  end;
end;

procedure GruposGet(Req: THorseRequest; Res: THorseResponse; Next: TProc);
var Q: TFDQuery; Obj: TJSONObject;
begin
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := DM.FDConnection;
    Q.SQL.Text := 'SELECT gp_codigo, gp_descri FROM GRUPO WHERE gp_codigo=:id';
    Q.ParamByName('id').AsInteger := StrToIntDef(Req.Params['id'],-1);
    Q.Open;
    if Q.IsEmpty then
      Res.Status(404).Send('{"error":"Grupo nao encontrado"}')
    else begin
      Obj := TJSONObject.Create;
      Obj.AddPair('gp_codigo', TJSONNumber.Create(Q.FieldByName('gp_codigo').AsInteger));
      Obj.AddPair('gp_descri', Q.FieldByName('gp_descri').AsString);
      Res.Send(Obj);
    end;
  finally
    Q.Free;
  end;
end;

procedure GruposPost(Req: THorseRequest; Res: THorseResponse; Next: TProc);
var Body: TJSONObject; Q: TFDQuery; NewId: Integer;
begin
  Body := Req.Body<TJSONObject>;
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := DM.FDConnection;
    Q.SQL.Text := 'SELECT COALESCE(MAX(gp_codigo),0)+1 AS NEXTID FROM GRUPO';
    Q.Open;
    NewId := Q.FieldByName('NEXTID').AsInteger;
    Q.Close;

    Q.SQL.Text := 'INSERT INTO GRUPO (gp_codigo, gp_descri, grp_dt) VALUES (:id, :descri, CURRENT_TIMESTAMP)';
    Q.ParamByName('id').AsInteger := NewId;
    Q.ParamByName('descri').AsString := Body.GetValue<string>('gp_descri','');
    Q.ExecSQL;
    Res.Status(201).Send(Format('{"message":"Criado","gp_codigo":%d}',[NewId]));
  finally
    Q.Free;
  end;
end;

procedure GruposPut(Req: THorseRequest; Res: THorseResponse; Next: TProc);
var Body: TJSONObject; Q: TFDQuery; Id: Integer;
begin
  Id := StrToIntDef(Req.Params['id'],-1);
  Body := Req.Body<TJSONObject>;
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := DM.FDConnection;
    Q.SQL.Text := 'UPDATE GRUPO SET gp_descri=:descri WHERE gp_codigo=:id';
    Q.ParamByName('descri').AsString := Body.GetValue<string>('gp_descri','');
    Q.ParamByName('id').AsInteger := Id;
    Q.ExecSQL;
    if Q.RowsAffected=0 then Res.Status(404).Send('{"error":"Nao atualizado"}')
    else Res.Send('{"message":"Atualizado"}');
  finally
    Q.Free;
  end;
end;

procedure GruposDelete(Req: THorseRequest; Res: THorseResponse; Next: TProc);
var Q: TFDQuery; Id: Integer;
begin
  Id := StrToIntDef(Req.Params['id'],-1);
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := DM.FDConnection;
    Q.SQL.Text := 'DELETE FROM GRUPO WHERE gp_codigo=:id';
    Q.ParamByName('id').AsInteger := Id;
    Q.ExecSQL;
    if Q.RowsAffected=0 then Res.Status(404).Send('{"error":"Nao removido"}')
    else Res.Send('{"message":"Removido"}');
  finally
    Q.Free;
  end;
end;

end.