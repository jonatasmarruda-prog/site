# Trilheiros GPS

Aplicativo web instalável (PWA) dos Trilheiros de Rondonópolis.

## Para o participante
1. Abra o link.
2. Toque em **Instalar Trilheiros GPS** quando o navegador oferecer.
3. Digite o nome da trilha e toque em **Iniciar Trilha**.
4. Permita a localização.
5. Ao finalizar, escolha uma foto, gere a arte premium e compartilhe.

## Offline
Depois da primeira abertura online, os arquivos essenciais ficam armazenados no celular pelo service worker. O GPS do aparelho funciona sem internet.

## Limitação conhecida de PWA
Alguns navegadores limitam a localização quando a tela fica totalmente bloqueada. O app usa Screen Wake Lock quando disponível para manter a tela ativa durante a trilha. Para rastreamento prolongado com tela bloqueada, um app Android nativo é mais confiável.
