unit uControllerMarcas;

interface

uses Horse;

procedure MarcasList(Req: THorseRequest; Res: THorseResponse; Next: TProc);
procedure MarcasGet(Req: THorseRequest; Res: THorseResponse; Next: TProc);
procedure MarcasPost(Req: THorseRequest; Res: THorseResponse; Next: TProc);
procedure MarcasPut(Req: THorseRequest; Res: THorseResponse; Next: TProc);
procedure MarcasDelete(Req: THorseRequest; Res: THorseResponse; Next: TProc);

implementation

uses FireDAC.Comp.Client, uDM, System.SysUtils, System.JSON, uUtilsJSON;

procedure MarcasList(Req: THorseRequest; Res: THorseResponse; Next: TProc);
var Q: TFDQuery;
begin
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := DM.FDConnection;
    Q.SQL.Text := 'SELECT mar_codigo, mar_descri FROM MARCA ORDER BY mar_codigo';
    Q.Open;
    Res.Send(DataSetToJSONArray(Q));
  finally
    Q.Free;
  end;
end;

procedure MarcasGet(Req: THorseRequest; Res: THorseResponse; Next: TProc);
var Q: TFDQuery; Obj: TJSONObject;
begin
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := DM.FDConnection;
    Q.SQL.Text := 'SELECT mar_codigo, mar_descri FROM MARCA WHERE mar_codigo=:id';
    Q.ParamByName('id').AsInteger := StrToIntDef(Req.Params['id'],-1);
    Q.Open;
    if Q.IsEmpty then
      Res.Status(404).Send('{"error":"Marca nao encontrada"}')
    else begin
      Obj := TJSONObject.Create;
      Obj.AddPair('mar_codigo', TJSONNumber.Create(Q.FieldByName('mar_codigo').AsInteger));
      Obj.AddPair('mar_descri', Q.FieldByName('mar_descri').AsString);
      Res.Send(Obj);
    end;
  finally
    Q.Free;
  end;
end;

procedure MarcasPost(Req: THorseRequest; Res: THorseResponse; Next: TProc);
var Body: TJSONObject; Q: TFDQuery; NewId: Integer;
begin
  Body := Req.Body<TJSONObject>;
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := DM.FDConnection;
    Q.SQL.Text := 'SELECT COALESCE(MAX(mar_codigo),0)+1 AS NEXTID FROM MARCA';
    Q.Open;
    NewId := Q.FieldByName('NEXTID').AsInteger;
    Q.Close;

    Q.SQL.Text := 'INSERT INTO MARCA (mar_codigo, mar_descri, mar_dt) VALUES (:id, :descri, CURRENT_TIMESTAMP)';
    Q.ParamByName('id').AsInteger := NewId;
    Q.ParamByName('descri').AsString := Body.GetValue<string>('mar_descri','');
    Q.ExecSQL;
    Res.Status(201).Send(Format('{"message":"Criado","mar_codigo":%d}',[NewId]));
  finally
    Q.Free;
  end;
end;

procedure MarcasPut(Req: THorseRequest; Res: THorseResponse; Next: TProc);
var Body: TJSONObject; Q: TFDQuery; Id: Integer;
begin
  Id := StrToIntDef(Req.Params['id'],-1);
  Body := Req.Body<TJSONObject>;
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := DM.FDConnection;
    Q.SQL.Text := 'UPDATE MARCA SET mar_descri=:descri WHERE mar_codigo=:id';
    Q.ParamByName('descri').AsString := Body.GetValue<string>('mar_descri','');
    Q.ParamByName('id').AsInteger := Id;
    Q.ExecSQL;
    if Q.RowsAffected=0 then Res.Status(404).Send('{"error":"Nao atualizado"}')
    else Res.Send('{"message":"Atualizado"}');
  finally
    Q.Free;
  end;
end;

procedure MarcasDelete(Req: THorseRequest; Res: THorseResponse; Next: TProc);
var Q: TFDQuery; Id: Integer;
begin
  Id := StrToIntDef(Req.Params['id'],-1);
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := DM.FDConnection;
    Q.SQL.Text := 'DELETE FROM MARCA WHERE mar_codigo=:id';
    Q.ParamByName('id').AsInteger := Id;
    Q.ExecSQL;
    if Q.RowsAffected=0 then Res.Status(404).Send('{"error":"Nao removido"}')
    else Res.Send('{"message":"Removido"}');
  finally
    Q.Free;
  end;
end;

end.