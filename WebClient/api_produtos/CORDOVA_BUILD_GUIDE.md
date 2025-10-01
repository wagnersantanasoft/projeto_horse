# 📱 Guia de Compilação APK - Cordova

## 🔧 Pré-requisitos

### Ferramentas Necessárias
```bash
# Node.js e npm (já instalado)
# Cordova CLI
npm install -g cordova

# Android Studio com SDK Tools
# Java JDK 8 ou superior
```

## 🚀 Passos para Compilação

### 1. Preparar Ambiente
```bash
# Navegar para pasta do projeto
cd "c:\Users\WAGNER\Documents\GitHub\projeto_horse\WebClient\api_produtos"

# Inicializar projeto Cordova
cordova create cordova-app com.wagnersantana.apiprodutos "API Produtos"
cd cordova-app
```

### 2. Configurar Plataforma Android
```bash
# Adicionar plataforma Android
cordova platform add android

# Verificar requisitos
cordova requirements android
```

### 3. Copiar Arquivos do Projeto
```bash
# Copiar arquivos HTML, CSS, JS para www/
# Substituir conteúdo padrão do Cordova
```

### 4. Configurar config.xml
```xml
<?xml version='1.0' encoding='utf-8'?>
<widget id="com.wagnersantana.apiprodutos" version="1.0.0" xmlns="http://www.w3.org/ns/widgets">
    <name>API Produtos</name>
    <description>Sistema de gerenciamento de produtos</description>
    <author email="contato@wagnersantana.com" href="https://github.com/wagnersantanasoft">
        Wagner Santana
    </author>
    <content src="login.html" />
    
    <!-- Permissions -->
    <access origin="*" />
    <allow-intent href="http://*/*" />
    <allow-intent href="https://*/*" />
    <allow-navigation href="*" />
    
    <!-- Network Security -->
    <edit-config file="app/src/main/AndroidManifest.xml" mode="merge" target="/manifest/application">
        <application android:usesCleartextTraffic="true" />
    </edit-config>
    
    <!-- Plugins -->
    <plugin name="cordova-plugin-whitelist" spec="^1.3.3" />
    <plugin name="cordova-plugin-device" spec="^2.0.2" />
    <plugin name="cordova-plugin-network-information" spec="^2.0.1" />
    <plugin name="cordova-plugin-camera" spec="^4.0.3" />
    <plugin name="phonegap-plugin-barcodescanner" spec="^8.1.0" />
    
    <!-- Android specific -->
    <platform name="android">
        <allow-intent href="market:*" />
        <preference name="AndroidXEnabled" value="true" />
        <preference name="GradlePluginGoogleServicesEnabled" value="false" />
    </platform>
    
    <!-- Preferences -->
    <preference name="DisallowOverscroll" value="true" />
    <preference name="android-minSdkVersion" value="22" />
    <preference name="android-targetSdkVersion" value="30" />
    <preference name="Orientation" value="portrait" />
</widget>
```

### 5. Configurar Rede Local

#### ⚠️ IMPORTANTE: Configuração de IP
Antes de compilar, certifique-se que:

1. **Proxy server está rodando**:
   ```bash
   # No PC (terminal separado)
   cd "c:\Users\WAGNER\Documents\GitHub\projeto_horse\WebClient\api_produtos"
   node proxy-server.js
   ```

2. **IP correto configurado**:
   - Verificar IP do PC na rede: `ipconfig`
   - Confirmar que é `192.168.1.23` ou atualizar nos arquivos:
     - `js/config.js`
     - `js/mobileConfig.js`
     - `proxy-server.js`

### 6. Compilar APK
```bash
# Build debug
cordova build android

# Build release (requer keystore)
cordova build android --release

# Build e instalar diretamente no dispositivo
cordova run android
```

## 📱 Estrutura de Arquivos para Cordova

### Copiar para www/:
- `login.html` → `www/login.html`
- `index.html` → `www/index.html`
- `css/` → `www/css/`
- `js/` → `www/js/`
- `img/` (se houver) → `www/img/`

### Arquivos Especiais:
- `js/config.js` - ✅ Já configurado para Cordova
- `js/mobileConfig.js` - ✅ Configuração específica mobile

## 🔗 URLs de Teste

### No Dispositivo Móvel:
- **Proxy Server**: `http://192.168.1.23:8081`
- **Horse Server Direto**: `http://192.168.1.23:9001`

### Teste no Navegador Móvel:
Antes de compilar, teste no navegador do smartphone:
1. Conectar smartphone na mesma rede Wi-Fi
2. Acessar: `http://192.168.1.23:8081`
3. Verificar se carrega corretamente

## 🐛 Troubleshooting

### APK não conecta:
1. ✅ Proxy server rodando?
2. ✅ Firewall liberado para porta 8081?
3. ✅ Smartphone na mesma rede?
4. ✅ IP correto nos arquivos de configuração?

### Erro de permissões:
1. Adicionar `android:usesCleartextTraffic="true"` no AndroidManifest.xml
2. Verificar permissões de rede no config.xml

### Scanner não funciona:
1. Verificar se plugin barcode scanner foi instalado
2. Adicionar permissões de câmera no config.xml

## 📋 Comandos Completos

```bash
# Setup inicial
cd "c:\Users\WAGNER\Documents\GitHub\projeto_horse\WebClient\api_produtos"
cordova create cordova-app com.wagnersantana.apiprodutos "API Produtos"
cd cordova-app

# Configurar plataforma
cordova platform add android

# Instalar plugins
cordova plugin add cordova-plugin-whitelist
cordova plugin add cordova-plugin-device
cordova plugin add cordova-plugin-network-information
cordova plugin add cordova-plugin-camera
cordova plugin add phonegap-plugin-barcodescanner

# Copiar arquivos (manual)
# Editar config.xml (manual)

# Compilar
cordova build android

# Localizar APK
# platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

## ✅ Verificação Final

Antes de testar no dispositivo:
1. ✅ Proxy server rodando: `node proxy-server.js`
2. ✅ Teste no navegador mobile: `http://192.168.1.23:8081`
3. ✅ APK compilado sem erros
4. ✅ Dispositivo na mesma rede Wi-Fi