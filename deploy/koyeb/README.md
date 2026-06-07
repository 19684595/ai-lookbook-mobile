# Deploy no Koyeb Free

Este backend pode rodar no Koyeb Free usando o Dockerfile existente em `backend/Dockerfile`.

## Limites importantes

- O plano Free oferece 1 Web Service gratuito com 512 MB de RAM, 0.1 vCPU e 2 GB de SSD.
- Volumes persistentes nao podem ser anexados a instancias `free`, entao trate `/app/data` como armazenamento temporario.
- Para o AI LookBook, mantenha imagens temporarias no Cloudinary ou Supabase. O backend nao deve depender de arquivos locais para dados importantes.

## Configuracao pela interface do Koyeb

1. Entre em `https://app.koyeb.com`.
2. Clique em `Create Web Service`.
3. Escolha `GitHub` e conecte o repositorio `19684595/ai-lookbook-mobile`.
4. Em `Builder`, escolha `Dockerfile`.
5. Em `Work directory`, informe `backend`.
6. Em `Dockerfile location`, deixe `Dockerfile`.
7. Em `Instance`, escolha o tipo `free`.
8. Em `Region`, escolha `Washington, D.C.` ou `Frankfurt`.
9. Em `Exposed ports`, configure `8787` com protocolo `HTTP`.
10. Em `Environment variables`, use `Bulk Edit` e cole as variaveis de `deploy/koyeb/.env.example`, trocando os valores pelas suas chaves reais.
11. Clique em `Deploy`.

## Variaveis minimas

Para renderizar com PiAPI usando Cloudinary como hospedagem temporaria, as variaveis essenciais sao:

```bash
NODE_ENV=production
PORT=8787
DATA_DIR=/app/data
LOOKBOOK_PROVIDER=piapi
PIAPI_API_KEY=sua_chave_piapi
PIAPI_TEMPORARY_HOST=cloudinary
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=sua_api_secret
CLOUDINARY_FOLDER=temporary
```

## Teste depois do deploy

O Koyeb vai gerar uma URL parecida com:

```text
https://ai-lookbook-backend-suaorg-xxxxxx.koyeb.app
```

Teste no navegador:

```text
https://sua-url.koyeb.app/health
```

A resposta esperada:

```json
{
  "status": "ok",
  "provider": "piapi",
  "piapiConfigured": true,
  "cloudinaryConfigured": true
}
```

Depois, coloque essa URL no app em `Conexao com IA` ou gere um APK com a URL ja embutida.
