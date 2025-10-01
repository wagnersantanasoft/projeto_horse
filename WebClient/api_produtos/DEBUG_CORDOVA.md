# Debug Cordova - Gestor de Validade

## Problemas Corrigidos:

### 1. Content Security Policy (CSP)
- ✅ Adicionado CSP adequado em `login.html` e `index.html`
- ✅ Permite conexões HTTP/HTTPS para qualquer domínio
- ✅ Permite recursos de fontes do Google Fonts

### 2. CORS e Conectividade
- ✅ Configurado `config.xml` com acesso irrestrito (`<access origin="*" />`)
- ✅ Permitido tráfego HTTP não criptografado no Android
- ✅ Configurado NSAppTransportSecurity no iOS para permitir HTTP

### 3. Error Handling Melhorado
- ✅ Logs detalhados no console para debug
- ✅ Mensagens de erro específicas (timeout, rede, CORS)
- ✅ Teste de conectividade antes do login

### 4. Teste de Conectividade
- ✅ Botão "Testar Conexão" na configuração admin
- ✅ Valida IP e porta antes de testar
- ✅ Feedback visual e notificações

## Como Debuggar no APK:

### 1. Chrome DevTools (Android)
```bash
# Conectar dispositivo via USB com depuração habilitada
# Abrir Chrome e navegar para:
chrome://inspect/#devices
```

### 2. Logs do Sistema
```bash
# Android - ver logs do sistema
adb logcat | grep -i "cordova\|chromium\|console"

# Verificar se o app consegue fazer requests
adb logcat | grep -i "network\|http\|connection"
```

### 3. Verificar Configuração de Rede
- Certifique-se que o dispositivo está na mesma rede do servidor
- Teste ping do dispositivo para o IP do servidor
- Verifique se não há firewall bloqueando a porta

### 4. Teste Manual no App
1. Faça login com `admin`/`admin`
2. Configure IP e porta do servidor
3. Clique em "Testar Conexão"
4. Verifique as mensagens de erro específicas

### 5. Problemas Comuns e Soluções:

#### "Erro de rede: Servidor inaccessível"
- ✅ Verificar se servidor está rodando
- ✅ Verificar IP correto (não usar localhost/127.0.0.1)
- ✅ Usar IP da rede local (ex: 192.168.1.23)

#### "Timeout: Servidor não respondeu"
- ✅ Servidor pode estar lento
- ✅ Firewall pode estar bloqueando
- ✅ Tentar aumentar timeout no código

#### "Erro de CORS"
- ✅ Servidor precisa permitir Origins do Cordova
- ✅ Adicionar headers CORS no servidor:
  ```
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE
  Access-Control-Allow-Headers: Content-Type
  ```

## Comandos Úteis:

### Build de Debug:
```bash
cordova build android --debug
```

### Build com logs verbosos:
```bash
cordova build android --debug --verbose
```

### Instalar e executar:
```bash
cordova run android --debug
```

## Verificação Final:
1. ✅ CSP configurado
2. ✅ config.xml permite HTTP
3. ✅ Error handling melhorado  
4. ✅ Teste de conectividade
5. ✅ Logs detalhados para debug

O app agora deve conseguir conectar com o servidor. Use o teste de conectividade para identificar problemas específicos.