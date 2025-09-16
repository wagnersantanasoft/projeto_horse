unit uUtilsJSON;

interface

uses System.JSON, Data.DB, System.SysUtils;

function DataSetToJSONArray(ADataset: TDataSet): TJSONArray;
function FieldToJSONValue(Field: TField): TJSONValue;

implementation

function FieldToJSONValue(Field: TField): TJSONValue;
begin
  if Field.IsNull then
    Result := TJSONNull.Create
  else
    case Field.DataType of
      ftString, ftWideString, ftMemo, ftFixedChar, ftFixedWideChar, ftWideMemo:
        Result := TJSONString.Create(Field.AsString);
      ftSmallint, ftInteger, ftWord, ftLargeint:
        Result := TJSONNumber.Create(Field.AsInteger);
      ftFloat, ftCurrency, ftBCD, ftFMTBcd, ftExtended:
        Result := TJSONNumber.Create(Field.AsFloat);
      ftBoolean:
        Result := TJSONBool.Create(Field.AsBoolean);
      ftDate, ftTime, ftDateTime, ftTimeStamp:
        Result := TJSONString.Create(DateTimeToStr(Field.AsDateTime));
    else
      Result := TJSONString.Create(Field.AsString); // Fallback
    end;
end;

function DataSetToJSONArray(ADataset: TDataSet): TJSONArray;
var
  Obj: TJSONObject;
  I: Integer;
begin
  Result := TJSONArray.Create;
  ADataset.First;
  while not ADataset.Eof do
  begin
    Obj := TJSONObject.Create;
    for I := 0 to ADataset.FieldCount - 1 do
    begin
      Obj.AddPair(
        ADataset.Fields[I].FieldName,
        FieldToJSONValue(ADataset.Fields[I])
      );
    end;
    Result.Add(Obj); // Aqui é Add, não AddElement
    ADataset.Next;
  end;
end;

end.