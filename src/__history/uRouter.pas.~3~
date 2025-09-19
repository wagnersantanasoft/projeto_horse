unit uRouter;

interface

procedure RegisterRoutes;

implementation

uses
  Horse,
  uControllerProdutos,
  uControllerMarcas,
  uControllerGrupos;
  uControllerUsuarios;

procedure RegisterRoutes;
begin
  // Agrupar sob /api
  THorse.Group.Prefix('/api')
    .Get('/produtos', ProdutosList)
    .Get('/produtos/:id', ProdutosGet)
    .Post('/produtos', ProdutosPost)
    .Put('/produtos/:id', ProdutosPut)
    .Delete('/produtos/:id', ProdutosDelete)

    .Get('/marcas', MarcasList)
    .Get('/marcas/:id', MarcasGet)
    .Post('/marcas', MarcasPost)
    .Put('/marcas/:id', MarcasPut)
    .Delete('/marcas/:id', MarcasDelete)

    .Get('/grupos', GruposList)
    .Get('/grupos/:id', GruposGet)
    .Post('/grupos', GruposPost)
    .Put('/grupos/:id', GruposPut)
    .Delete('/grupos/:id', GruposDelete);

    .Get('/usuarios', UsuariosList)
    .Get('/usuarios/:id', UsuariosGet)
    .Post('/usuarios', UsuariosPost)
    .Put('/usuarios/:id', UsuariosPut)
    .Delete('/usuarios/:id', UsuariosDelete);
end;

end.