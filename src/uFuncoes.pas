unit uFuncoes;

interface

  Function EncrypSenha(Msg1: string; EncryptNo: integer): string;

implementation

Function EncrypSenha(Msg1: string; EncryptNo: integer): string;
var ResultStr: string;
    Temp: char;
    I, EncryptIndex: integer;
begin

    ResultStr := '';
    Temp := ' ';

    for I := 1 to length(Msg1) do
    begin

      for EncryptIndex := 1 to EncryptNo do
      begin
        Temp := Succ (Msg1[I]);
        Msg1[I] := Temp;
      end;

      ResultStr := ResultStr + Temp;

    end;

    Result := ResultStr;

end;

end.
