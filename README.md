# AI Lookbook Mobile

Aplicativo mobile em React Native com Expo para:

- cadastrar uma modelo por foto tirada na câmera ou carregada da galeria;
- cadastrar várias peças de roupa com categoria e nome;
- gerar sugestões de looks com uma camada de IA desacoplada do app;
- preparar o prompt técnico para um backend de virtual try-on quando o provedor for definido.
- conversar com um backend local/remoto que centraliza a integração com a IA.

## Como rodar

```bash
npm install
npm run start
```

Para Android:

```bash
npm run android
```

Para gerar uma APK com instalação separada e API pré-configurada:

```bash
npm run build:android:configured -- -ApiUrl https://sua-api-publica.onrender.com -BuildId cliente-a
```

Esse fluxo:

- embute `EXPO_PUBLIC_STYLING_API_URL` no bundle
- gera `applicationId` próprio por build
- permite instalar várias builds lado a lado
- copia a APK final com nome próprio na pasta de release

Você também pode trabalhar com perfis prontos.

1. Copie [build-profiles.example.json](D:/01ALESSANDRO/DEVOPS/Deisign%20mobile/build-profiles.example.json) para `build-profiles.json`
2. Ajuste a URL da API, `applicationId`, nome e versão
3. Rode:

```bash
npm run build:android:profile -- -Profile cliente-a
```

Para iniciar o backend local:

```bash
npm run server
```

Para operar a API local de forma automatizada no Windows:

```bash
npm run api:start
npm run api:stop
npm run api:restart
npm run api:install-startup
npm run api:remove-startup
npm run api:open-firewall
npm run api:close-firewall
```

Esses comandos:

- `api:start`: compila o backend e sobe a API em segundo plano na porta `8787`
- `api:stop`: encerra a API iniciada pelo modo automatizado
- `api:restart`: reinicia a API automatizada
- `api:install-startup`: coloca um atalho na pasta `Inicializar` do usuário para subir a API no próximo logon do Windows
- `api:remove-startup`: remove esse atalho
- `api:open-firewall`: cria a regra de firewall para a porta `8787` no perfil privado
- `api:close-firewall`: remove essa regra

Observação sobre firewall no Windows:

- a criação da regra costuma exigir terminal com permissão de administrador;
- se preferir, abra um PowerShell como administrador e rode `npm run api:open-firewall`;
- ou execute diretamente [admin-open-lookbook-api-firewall.cmd](D:/01ALESSANDRO/DEVOPS/Deisign%20mobile/scripts/admin-open-lookbook-api-firewall.cmd)

## Arquitetura

- `App.tsx`: fluxo principal da experiência.
- `src/components`: componentes visuais reaproveitáveis.
- `src/services/stylingService.ts`: escolhe entre mock local e backend remoto.
- `src/services/mockStylingEngine.ts`: gera combinações locais para validar UX e regras de negócio.

## Backend

O backend fica em [backend](D:/01ALESSANDRO/DEVOPS/Deisign%20mobile/backend) e expõe:

- `GET /`
- `GET /health`
- `POST /auth/register`
- `POST /generate-look`
- `GET /history?sessionId=...`
- `GET /history?userId=...`
- `GET /history/:id`
- `GET /favorites?userId=...`
- `POST /favorites/toggle`

Copie `backend/.env.example` para `backend/.env` e comece com:

```bash
cd backend
npm install
npm run dev
```

Por padrão o backend usa `LOOKBOOK_PROVIDER=mock`, então o fluxo completo funciona sem provedor externo.
Se `PIAPI_API_KEY` estiver configurada e `LOOKBOOK_PROVIDER` não for definida, o backend passa automaticamente para `piapi`.
Se `OPENAI_API_KEY` estiver configurada e `LOOKBOOK_PROVIDER` não for definida e a `PIAPI_API_KEY` estiver vazia, o backend passa automaticamente para `openai`.

Para validar o endpoint completo sem abrir o app:

```bash
cd backend
npm run smoke
```

Esse smoke test sobe a API em porta aleatória, chama `GET /health`, envia um payload de exemplo para `POST /generate-look` e confirma se pelo menos um look foi devolvido.

## Não colocar chaves no APK

Mesmo em app mobile, não é seguro embutir no APK:

- `PIAPI_API_KEY`
- `CLOUDINARY_API_SECRET`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Essas chaves podem ser extraídas da aplicação e usadas por terceiros. O caminho recomendado é publicar o backend e deixar o app conversar com uma URL HTTPS pública.

## Publicar o backend na nuvem

O projeto ficou preparado para deploy com Docker em [backend/Dockerfile](D:/01ALESSANDRO/DEVOPS/Deisign%20mobile/backend/Dockerfile).

Também deixei um exemplo de blueprint em [render.yaml](D:/01ALESSANDRO/DEVOPS/Deisign%20mobile/render.yaml).

Variáveis importantes para produção:

```bash
NODE_ENV=production
PORT=8787
DATA_DIR=/app/data
LOOKBOOK_PROVIDER=piapi
PIAPI_API_KEY=sua_chave
PIAPI_POLL_INTERVAL_MS=4000
PIAPI_MAX_POLL_ATTEMPTS=30
PIAPI_TEMPORARY_HOST=cloudinary
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=sua_api_secret
CLOUDINARY_FOLDER=temporary
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SECRET_KEY=sua_secret_key
SUPABASE_STORAGE_BUCKET=tryon-temp
SUPABASE_STORAGE_PATH_PREFIX=temporary
```

### Exemplo com Render

1. Crie um novo `Web Service` no Render a partir deste projeto.
2. Escolha `Docker`.
3. Use o `rootDir` apontando para `backend` ou o blueprint em `render.yaml`.
4. Configure as variáveis de ambiente acima.
5. Não adicione `Disk` nesta fase. Use Cloudinary/Supabase para imagens temporárias e trate `/app/data` como temporário.

Depois do deploy, pegue a URL pública gerada e use no app em `Conexão com IA`.

### Exemplo com Koyeb Free

Também há um passo a passo dedicado em [deploy/koyeb](D:/01ALESSANDRO/DEVOPS/Deisign%20mobile/deploy/koyeb).

Configuração recomendada na interface do Koyeb:

1. `Create Web Service`.
2. Fonte `GitHub`: `19684595/ai-lookbook-mobile`.
3. Builder `Dockerfile`.
4. Work directory `backend`.
5. Dockerfile location `Dockerfile`.
6. Instance `free`.
7. Exposed port `8787` com protocolo `HTTP`.
8. Environment variables via `Bulk Edit` usando [deploy/koyeb/.env.example](D:/01ALESSANDRO/DEVOPS/Deisign%20mobile/deploy/koyeb/.env.example).

Depois teste:

```bash
curl https://sua-url.koyeb.app/health
```

No plano Free, o Koyeb não permite volumes persistentes anexados. Use Cloudinary ou Supabase para imagens temporárias e trate `/app/data` como temporário.

### Exemplo com Hetzner

Também há um deploy pronto para seu servidor Hetzner em [deploy/hetzner](D:/01ALESSANDRO/DEVOPS/Deisign%20mobile/deploy/hetzner).

Ele usa:

- Docker Compose para subir o backend.
- Caddy como proxy HTTPS com certificado automático.
- Volume Docker persistente para `/app/data`.
- `.env` local no servidor para guardar chaves sem colocar segredos no APK.

Resumo do fluxo no servidor:

```bash
git clone https://github.com/19684595/ai-lookbook-mobile.git
cd ai-lookbook-mobile
cp deploy/hetzner/.env.example deploy/hetzner/.env
nano deploy/hetzner/.env
docker compose -f deploy/hetzner/docker-compose.yml up -d --build
```

Depois teste:

```bash
curl https://seu-subdominio/health
```

O passo a passo completo está em [deploy/hetzner/README.md](D:/01ALESSANDRO/DEVOPS/Deisign%20mobile/deploy/hetzner/README.md).

## Como integrar uma API real

Defina a variável de ambiente `EXPO_PUBLIC_STYLING_API_URL` apontando para o backend. O app envia as imagens em base64 para `POST /generate-look` com este payload:

```json
{
  "sessionId": "session-abc",
  "modelImage": {
    "fileName": "modelo.jpg",
    "mimeType": "image/jpeg",
    "base64": "...",
    "sourceUrl": "https://..."
  },
  "garments": [
    {
      "id": "garment-1",
      "label": "Blazer bege",
      "category": "top",
      "image": {
        "fileName": "blazer.jpg",
        "mimeType": "image/jpeg",
        "base64": "...",
        "sourceUrl": "https://..."
      }
    }
  ],
  "styleBrief": "casual elegante",
  "maxLooks": 3
}
```

Quando `sessionId` for enviado, o backend salva o resultado em histórico local e devolve os headers:

- `x-session-id`
- `x-look-history-id`

Depois disso, você pode listar gerações anteriores da sessão em `GET /history?sessionId=session-abc`.

No app, cada execução cria um `sessionId` local e a interface passa a mostrar o histórico dessa sessão para reabrir looks anteriores sem gerar tudo de novo.
O app também permite buscar no histórico por texto e marcar gerações favoritas localmente no aparelho.
Se a pessoa preencher nome e e-mail no bloco de perfil, o app registra um `userId` e passa a sincronizar histórico e favoritos com o backend por usuário.

## Conectar o celular ao backend

O app agora também permite salvar a URL do backend diretamente na tela inicial, sem rebuild.
Na mesma área, o usuário escolhe o provedor de IA: `PiAPI`, usando as chaves seguras configuradas no backend, ou `OpenAI`, usando uma chave OpenAI informada no próprio aparelho.

Para testar no celular:

1. Inicie o backend no computador com `npm run server` dentro de `backend`.
2. Descubra o IP local do computador na mesma rede Wi-Fi do celular.
3. No app, em `Conexão com IA`, informe algo como `http://192.168.0.10:8787`.
4. Toque em `Testar conexão`.
5. Depois toque em `Salvar URL da API`.

Se o campo ficar vazio, o app volta automaticamente para o modo mock local.

O endpoint deve devolver uma lista de looks no formato:

```json
[
  {
    "id": "look-1",
    "title": "Look 1",
    "summary": "Descrição curta",
    "pieces": [],
    "prompt": "Prompt consolidado para virtual try-on",
    "previewUri": "https://..."
  }
]
```

Se quiser usar OpenAI inicialmente para a etapa de sugestão dos looks, configure no backend:

```bash
LOOKBOOK_PROVIDER=openai
OPENAI_API_KEY=sua_chave
OPENAI_TEXT_MODEL=gpt-5.5
OPENAI_IMAGE_MODEL=gpt-5
OPENAI_RENDER_IMAGES=true
```

Nesse modo, o backend usa a OpenAI para sugerir combinações com saída estruturada e também pode renderizar um preview visual de cada look usando a foto da modelo e as imagens das peças como referência.

Modelos recomendados nas docs oficiais em 24 de maio de 2026:

- texto estruturado e raciocínio do styling: `gpt-5.5`
- modelo principal para acionar a ferramenta de imagem no Responses API: `gpt-5`

Depois de configurar a chave, você também pode validar o fluxo com:

```bash
cd backend
set LOOKBOOK_PROVIDER=openai
npm run smoke
```

Observação importante:

- esta versão entrega um primeiro try-on por referência visual;
- para controle fino de máscara, pose ou substituição por região, o próximo passo natural é acrescentar um fluxo de image edit/inpainting ou um provedor especializado em virtual try-on.

## Como iniciar com PiAPI

Para usar a PiAPI/Kling Virtual Try-On no backend:

```bash
LOOKBOOK_PROVIDER=piapi
PIAPI_API_KEY=sua_chave
PIAPI_POLL_INTERVAL_MS=4000
PIAPI_MAX_POLL_ATTEMPTS=30
PIAPI_TEMPORARY_HOST=catbox
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=sua_api_secret
CLOUDINARY_FOLDER=temporary
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
SUPABASE_STORAGE_BUCKET=tryon-temp
SUPABASE_STORAGE_PATH_PREFIX=temporary
```

Nesse modo, o backend cria a tarefa em `POST https://api.piapi.ai/api/v1/task` e faz polling em `GET /api/v1/task/{task_id}` até receber a imagem final.

Como usar com Catbox no MVP:

1. Defina `PIAPI_TEMPORARY_HOST=catbox`.
2. O backend sobe a imagem temporariamente no Catbox sem credenciais extras.
3. A PiAPI consome essa URL pública para o try-on.

Observação importante:

- esse caminho é o que se mostrou mais estável na prova de conceito atual;
- o Catbox não oferece cleanup controlado no mesmo nível do Cloudinary/Supabase;
- por isso, ele é bom para validar o fluxo, mas não é a melhor opção final de produção.

Como usar com Cloudinary:

1. Crie uma conta e um product environment no Cloudinary.
2. Copie `cloud name`, `api key` e `api secret`.
3. Configure as variáveis acima no backend.
4. Opcionalmente ajuste `CLOUDINARY_FOLDER` para separar os uploads temporários.

Como fallback com Supabase Free:

1. Crie um projeto no Supabase Free.
2. Crie um bucket público chamado `tryon-temp`.
3. Copie `Project URL` e `service_role key`.
4. Configure as variáveis acima no backend.

Depois disso:

- se a imagem já vier com `sourceUrl`, o backend usa a URL existente;
- se a imagem vier apenas em `base64`, o backend usa o host definido em `PIAPI_TEMPORARY_HOST`;
- com `catbox`, esse é o caminho atual mais confiável para a prova de conceito;
- com `cloudinary`, o backend continua pronto para testes adicionais;
- se nenhum host específico estiver configurado, o backend tenta Cloudinary, depois Supabase e por fim Catbox;
- a URL pública é enviada para a PiAPI;
- ao terminar, o backend tenta remover os arquivos temporários.

Observação importante:

- a PiAPI precisa acessar as URLs diretamente;
- por isso, use nomes aleatórios e mantenha os arquivos apenas pelo tempo necessário;
- o Supabase continua disponível como fallback, mas o Cloudinary passa a ser o caminho preferencial para PiAPI.

Referências oficiais usadas:

- [PiAPI Quickstart](https://piapi.ai/docs/quickstart)
- [Kling Virtual Try-On](https://piapi.ai/docs/kling-api/virtual-try-on-api)
- [Get Task](https://piapi.ai/docs/kling-api/get-task)
- [PiAPI Account Info](https://piapi.ai/docs/account-info-api)
- [File Upload API](https://piapi.ai/docs/tools/file-upload)

## Próximo passo recomendado

Criar um backend intermediário para:

1. subir as imagens para armazenamento temporário;
2. persistir histórico de looks por usuário;
3. acrescentar autenticação;
4. evoluir o preview para um fluxo com máscara e edição por área.
