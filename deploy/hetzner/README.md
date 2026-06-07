# Deploy do AI LookBook na Hetzner

Este deploy sobe o backend em Docker e publica HTTPS com Caddy.

## Requisitos

- Um domínio ou subdomínio apontando para o IP público do servidor, por exemplo `api.seudominio.com`.
- Docker e Docker Compose instalados no servidor.
- Portas `80` e `443` liberadas no firewall.

## Primeiro deploy

No servidor:

```bash
sudo apt update
sudo apt install -y git ca-certificates curl
```

Instale Docker, se ainda não estiver instalado:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
```

Saia e entre novamente no SSH para o grupo `docker` valer.

Clone o projeto:

```bash
git clone https://github.com/19684595/ai-lookbook-mobile.git
cd ai-lookbook-mobile
```

Prepare as variáveis:

```bash
cp deploy/hetzner/.env.example deploy/hetzner/.env
nano deploy/hetzner/.env
```

No `.env`, ajuste pelo menos:

```bash
APP_DOMAIN=api.seudominio.com
LETSENCRYPT_EMAIL=seu-email@seudominio.com
LOOKBOOK_PROVIDER=mock
```

Suba os containers:

```bash
docker compose -f deploy/hetzner/docker-compose.yml up -d --build
```

Teste:

```bash
curl https://api.seudominio.com/health
```

Se responder `{"status":"ok"...}`, use essa URL no app.

## Configuração econômica recomendada

Para manter custo baixo:

- Deixe o app gerar `Looks Sugeridos` em texto por padrão.
- Renderize imagem somente quando o usuário solicitar.
- Para OpenAI, use `OPENAI_TEXT_MODEL=gpt-5.4-mini`.
- Se você quiser que cada usuário informe sua própria chave OpenAI no app, deixe `OPENAI_API_KEY=` vazio no servidor.

## Usar OpenAI como provider padrão do servidor

No `.env`:

```bash
LOOKBOOK_PROVIDER=openai
OPENAI_API_KEY=sua_chave
OPENAI_TEXT_MODEL=gpt-5.4-mini
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_RENDER_IMAGES=true
```

Reinicie:

```bash
docker compose -f deploy/hetzner/docker-compose.yml up -d --build
```

## Usar PiAPI com Cloudinary para renderização

No `.env`:

```bash
LOOKBOOK_PROVIDER=piapi
PIAPI_API_KEY=sua_chave
PIAPI_TEMPORARY_HOST=cloudinary
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=sua_api_secret
CLOUDINARY_FOLDER=lookbook-temporary
```

Reinicie:

```bash
docker compose -f deploy/hetzner/docker-compose.yml up -d --build
```

## Atualizar uma nova versão

No servidor:

```bash
cd ai-lookbook-mobile
git pull
docker compose -f deploy/hetzner/docker-compose.yml up -d --build
```

## Logs e manutenção

Ver logs:

```bash
docker compose -f deploy/hetzner/docker-compose.yml logs -f backend
docker compose -f deploy/hetzner/docker-compose.yml logs -f caddy
```

Reiniciar:

```bash
docker compose -f deploy/hetzner/docker-compose.yml restart
```

Parar:

```bash
docker compose -f deploy/hetzner/docker-compose.yml down
```

Os dados persistentes do backend ficam no volume Docker `lookbook_data`.
