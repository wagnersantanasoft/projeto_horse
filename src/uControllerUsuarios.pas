unit uControllerUsuarios;

interface

uses
  Horse, System.SysUtils, System.JSON, FireDAC.Comp.Client;

procedure UsuariosList(Req: THorseRequest; Res: THorseResponse; Next: TProc);
procedure UsuariosGet(Req: THorseRequest; Res: THorseResponse; Next: TProc);
procedure UsuariosPost(Req: THorseRequest; Res: THorseResponse; Next: TProc);
procedure UsuariosPut(Req: THorseRequest; Res: THorseResponse; Next: TProc);
procedure UsuariosDelete(Req: THorseRequest; Res: THorseResponse; Next: TProc);

implementation

uses
  FireDAC.Stan.Param, uUtilsJSON, uDM, Data.DB;

procedure UsuariosList(Req: THorseRequest; Res: THorseResponse; Next: TProc);
var
  Q: TFDQuery;
  Arr: TJSONArray;
begin
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := DM.FDConnection;
    Q.SQL.Text := 'SELECT * FROM USUARIOS ORDER BY USE_CODIGO';
    Q.Open;
    Arr := DataSetToJSONArray(Q);
    try
      Res.ContentType('application/json');
      Res.Send(Arr.ToJSON);
    finally
      Arr.Free;
    end;
  finally
    Q.Free;
  end;
end;

procedure UsuariosGet(Req: THorseRequest; Res: THorseResponse; Next: TProc);
var
  Q: TFDQuery;
  Obj: TJSONObject;
  Id: Integer;
begin
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := DM.FDConnection;
    Id := StrToIntDef(Req.Params['id'], -1);
    Q.SQL.Text := 'SELECT * FROM USUARIOS WHERE USE_CODIGO = :id';
    Q.ParamByName('id').AsInteger := Id;
    Q.Open;
    Res.ContentType('application/json');
    if Q.IsEmpty then
      Res.Status(404).Send('{"error":"Usuário não encontrado"}')
    else
    begin
      Obj := TJSONObject.Create;
      try
        Obj.AddPair('USE_CODIGO', TJSONNumber.Create(Q.FieldByName('USE_CODIGO').AsInteger));
        Obj.AddPair('USE_NOME', Q.FieldByName('USE_NOME').AsString);
        Obj.AddPair('USE_LOGIN', Q.FieldByName('USE_LOGIN').AsString);
        Obj.AddPair('USE_SENHA', Q.FieldByName('USE_SENHA').AsString);
        Obj.AddPair('USE_ACESSO', Q.FieldByName('USE_ACESSO').AsString);
        Obj.AddPair('USE_AUTORIZADO', Q.FieldByName('USE_AUTORIZADO').AsString);
        Obj.AddPair('USE_S', Q.FieldByName('USE_S').AsString);
        Obj.AddPair('USE_U', TJSONNumber.Create(Q.FieldByName('USE_U').AsInteger));
        Obj.AddPair('USE_DT', Q.FieldByName('USE_DT').AsString);
        Obj.AddPair('USE_PASSWORD', Q.FieldByName('USE_PASSWORD').AsString);
        Obj.AddPair('USE_AUT_MOBILE', TJSONNumber.Create(Q.FieldByName('USE_AUT_MOBILE').AsInteger));
        Obj.AddPair('USE_AUT_ESTOQUE', TJSONNumber.Create(Q.FieldByName('USE_AUT_ESTOQUE').AsInteger));
        Obj.AddPair('USE_AUT_PRECO', TJSONNumber.Create(Q.FieldByName('USE_AUT_PRECO').AsInteger));
        Obj.AddPair('USE_AUT_EAN', TJSONNumber.Create(Q.FieldByName('USE_AUT_EAN').AsInteger));
        Obj.AddPair('USE_AUT_VALIDADE', TJSONNumber.Create(Q.FieldByName('USE_AUT_VALIDADE').AsInteger));
        Obj.AddPair('USE_AUT_REFERENCIA', TJSONNumber.Create(Q.FieldByName('USE_AUT_REFERENCIA').AsInteger));
        Obj.AddPair('USE_PERMISSAO_LOGIN_REMOTO', Q.FieldByName('USE_PERMISSAO_LOGIN_REMOTO').AsString);
        Obj.AddPair('USE_LOG', Q.FieldByName('USE_LOG').AsString);
        Res.Send(Obj.ToJSON);
      finally
        Obj.Free;
      end;
    end;
  finally
    Q.Free;
  end;
end;

procedure UsuariosPost(Req: THorseRequest; Res: THorseResponse; Next: TProc);
var
  RawBody: string;
  Body: TJSONObject;
  Q: TFDQuery;
  NewId: Integer;
begin
  RawBody := Req.Body;
  if RawBody = '' then
  begin
    Res.Status(400).Send('{"error":"Corpo da requisição vazio"}');
    Exit;
  end;
  try
    Body := TJSONObject.ParseJSONValue(RawBody) as TJSONObject;
  except
    on E: Exception do
    begin
      Res.Status(400).Send('{"error":"JSON inválido"}');
      Exit;
    end;
  end;
  if not Assigned(Body) then
  begin
    Res.Status(400).Send('{"error":"JSON inválido ou não enviado"}');
    Exit;
  end;

  Q := TFDQuery.Create(nil);
  try
    Q.Connection := DM.FDConnection;
    Q.SQL.Text := 'SELECT COALESCE(MAX(USE_CODIGO),0)+1 AS NEXTID FROM USUARIOS';
    Q.Open;
    NewId := Q.FieldByName('NEXTID').AsInteger;
    Q.Close;

    Q.SQL.Text :=
      'INSERT INTO USUARIOS (USE_CODIGO, USE_NOME, USE_LOGIN, USE_SENHA, USE_ACESSO, USE_AUTORIZADO, USE_S, USE_U, USE_DT, USE_PASSWORD, USE_AUT_MOBILE, USE_AUT_ESTOQUE, USE_AUT_PRECO, USE_AUT_EAN, USE_AUT_VALIDADE, USE_AUT_REFERENCIA, USE_PERMISSAO_LOGIN_REMOTO, USE_LOG) ' +
      'VALUES (:id, :nome, :login, :senha, :acesso, :autorizado, :s, :u, CURRENT_TIMESTAMP, :password, :aut_mobile, :aut_estoque, :aut_preco, :aut_ean, :aut_validade, :aut_referencia, :permissao_login_remoto, CURRENT_TIMESTAMP)';
    Q.ParamByName('id').AsInteger := NewId;
    Q.ParamByName('nome').AsString := Body.GetValue<string>('USE_NOME', '');
    Q.ParamByName('login').AsString := Body.GetValue<string>('USE_LOGIN', '');
    Q.ParamByName('senha').AsString := Body.GetValue<string>('USE_SENHA', '');
    Q.ParamByName('acesso').AsString := Body.GetValue<string>('USE_ACESSO', '');
    Q.ParamByName('autorizado').AsString := Body.GetValue<string>('USE_AUTORIZADO', '');
    Q.ParamByName('s').AsString := Body.GetValue<string>('USE_S', '');
    Q.ParamByName('u').AsInteger := Body.GetValue<Integer>('USE_U', 0);
    Q.ParamByName('password').AsString := Body.GetValue<string>('USE_PASSWORD', '');
    Q.ParamByName('aut_mobile').AsInteger := Body.GetValue<Integer>('USE_AUT_MOBILE', 0);
    Q.ParamByName('aut_estoque').AsInteger := Body.GetValue<Integer>('USE_AUT_ESTOQUE', 0);
    Q.ParamByName('aut_preco').AsInteger := Body.GetValue<Integer>('USE_AUT_PRECO', 0);
    Q.ParamByName('aut_ean').AsInteger := Body.GetValue<Integer>('USE_AUT_EAN', 0);
    Q.ParamByName('aut_validade').AsInteger := Body.GetValue<Integer>('USE_AUT_VALIDADE', 0);
    Q.ParamByName('aut_referencia').AsInteger := Body.GetValue<Integer>('USE_AUT_REFERENCIA', 0);
    Q.ParamByName('permissao_login_remoto').AsString := Body.GetValue<string>('USE_PERMISSAO_LOGIN_REMOTO', '');

    Q.ExecSQL;

    Res.ContentType('application/json');
    Res.Status(201).Send(Format('{"message":"Usuário criado","USE_CODIGO":%d}', [NewId]));
  finally
    Q.Free;
    Body.Free;
  end;
end;

procedure UsuariosPut(Req: THorseRequest; Res: THorseResponse; Next: TProc);
var
  RawBody: string;
  Body: TJSONObject;
  Q: TFDQuery;
  Id: Integer;
begin
  Id := StrToIntDef(Req.Params['id'], -1);
  RawBody := Req.Body;
  if RawBody = '' then
  begin
    Res.Status(400).Send('{"error":"Corpo da requisição vazio"}');
    Exit;
  end;
  try
    Body := TJSONObject.ParseJSONValue(RawBody) as TJSONObject;
  except
    on E: Exception do
    begin
      Res.Status(400).Send('{"error":"JSON inválido"}');
      Exit;
    end;
  end;
  if not Assigned(Body) then
  begin
    Res.Status(400).Send('{"error":"JSON inválido ou não enviado"}');
    Exit;
  end;

  Q := TFDQuery.Create(nil);
  try
    Q.Connection := DM.FDConnection;
    Q.SQL.Text :=
      'UPDATE USUARIOS SET USE_NOME = :nome, USE_LOGIN = :login, USE_SENHA = :senha, USE_ACESSO = :acesso, USE_AUTORIZADO = :autorizado, USE_S = :s, USE_U = :u, USE_PASSWORD = :password, USE_AUT_MOBILE = :aut_mobile, USE_AUT_ESTOQUE = :aut_estoque, USE_AUT_PRECO = :aut_preco, USE_AUT_EAN = :aut_ean, USE_AUT_VALIDADE = :aut_validade, USE_AUT_REFERENCIA = :aut_referencia, USE_PERMISSAO_LOGIN_REMOTO = :permissao_login_remoto WHERE USE_CODIGO = :id';

    Q.ParamByName('nome').AsString := Body.GetValue<string>('USE_NOME', '');
    Q.ParamByName('login').AsString := Body.GetValue<string>('USE_LOGIN', '');
    Q.ParamByName('senha').AsString := Body.GetValue<string>('USE_SENHA', '');
    Q.ParamByName('acesso').AsString := Body.GetValue<string>('USE_ACESSO', '');
    Q.ParamByName('autorizado').AsString := Body.GetValue<string>('USE_AUTORIZADO', '');
    Q.ParamByName('s').AsString := Body.GetValue<string>('USE_S', '');
    Q.ParamByName('u').AsInteger := Body.GetValue<Integer>('USE_U', 0);
    Q.ParamByName('password').AsString := Body.GetValue<string>('USE_PASSWORD', '');
    Q.ParamByName('aut_mobile').AsInteger := Body.GetValue<Integer>('USE_AUT_MOBILE', 0);
    Q.ParamByName('aut_estoque').AsInteger := Body.GetValue<Integer>('USE_AUT_ESTOQUE', 0);
    Q.ParamByName('aut_preco').AsInteger := Body.GetValue<Integer>('USE_AUT_PRECO', 0);
    Q.ParamByName('aut_ean').AsInteger := Body.GetValue<Integer>('USE_AUT_EAN', 0);
    Q.ParamByName('aut_validade').AsInteger := Body.GetValue<Integer>('USE_AUT_VALIDADE', 0);
    Q.ParamByName('aut_referencia').AsInteger := Body.GetValue<Integer>('USE_AUT_REFERENCIA', 0);
    Q.ParamByName('permissao_login_remoto').AsString := Body.GetValue<string>('USE_PERMISSAO_LOGIN_REMOTO', '');
    Q.ParamByName('id').AsInteger := Id;

    Q.ExecSQL;

    Res.ContentType('application/json');
    if Q.RowsAffected = 0 then
      Res.Status(404).Send('{"error":"Usuário não atualizado"}')
    else
      Res.Send('{"message":"Usuário atualizado"}');
  finally
    Q.Free;
    Body.Free;
  end;
end;

procedure UsuariosDelete(Req: THorseRequest; Res: THorseResponse; Next: TProc);
var
  Q: TFDQuery;
  Id: Integer;
begin
  Id := StrToIntDef(Req.Params['id'], -1);
  Q := TFDQuery.Create(nil);
  try
    Q.Connection := DM.FDConnection;
    Q.SQL.Text := 'DELETE FROM USUARIOS WHERE USE_CODIGO = :id';
    Q.ParamByName('id').AsInteger := Id;
    Q.ExecSQL;
    Res.ContentType('application/json');
    if Q.RowsAffected = 0 then
      Res.Status(404).Send('{"error":"Usuário não removido"}')
    else
      Res.Send('{"message":"Usuário removido"}');
  finally
    Q.Free;
  end;
end;

end.
