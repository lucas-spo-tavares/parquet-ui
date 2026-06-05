# Parquet UI

Parquet UI - Local Parquet Explorer e uma SPA 100% frontend para visualizar, explorar, consultar e criar graficos de arquivos `.parquet` diretamente no navegador.

## O problema

Arquivos Parquet sao comuns em pipelines de dados, mas muitas vezes exigem notebook, CLI, backend ou ferramentas pesadas para uma primeira inspecao. Este projeto oferece uma interface local, instalavel como PWA, para abrir um Parquet, ver schema, preview, profiling, executar SQL e montar graficos sem enviar dados para servidores.

## Stack

- React, TypeScript e Vite
- Tailwind CSS com componentes no estilo shadcn/ui
- TanStack Table
- Recharts
- DuckDB-WASM para SQL client-side
- hyparquet para leitura Parquet no browser
- PWA com Web App Manifest e Service Worker
- Terraform para S3 privado, CloudFront, OAC, ACM e Route53
- AWS CLI para deploy dos assets estaticos

## Parquet-only

A aplicacao aceita exclusivamente arquivos `.parquet`. CSV, JSON, Excel e outros formatos sao rejeitados na importacao.

CSV existe apenas como formato de exportacao para:

- preview visivel
- resultado SQL atual
- profiling das colunas
- dados agregados de graficos

## Privacidade

- O arquivo Parquet e lido localmente no navegador.
- Nenhum arquivo e enviado para servidores.
- Nao existe backend, API, Lambda, autenticacao ou banco remoto.
- A hospedagem entrega apenas HTML, CSS, JavaScript, WASM e assets estaticos.
- Nenhum dado do arquivo e armazenado remotamente.

## Funcionalidades

- Upload por drag and drop ou seletor de arquivo, aceitando apenas `.parquet`.
- Lista de arquivos Parquet carregados na sessao.
- Schema com tipo original, tipo inferido, nullability, exemplo e estimativas.
- Preview com TanStack Table, busca, ordenacao, paginacao e export CSV.
- Profiling por coluna com estatisticas numericas, texto/categoria, booleanos e datas quando inferidas.
- SQL local com DuckDB-WASM usando a tabela `data`.
- Dashboard com graficos de barra, linha e pizza usando Recharts.
- PWA instalavel, standalone e com abertura offline apos o primeiro acesso.

## Rodar localmente

```bash
npm install
npm run dev
```

Build de producao:

```bash
npm run build
```

Preview do build:

```bash
npm run preview
```

Validacoes:

```bash
npm run lint
npm run typecheck
```

## PWA

A aplicacao inclui:

- Manifest em `public/manifest.webmanifest`.
- Service Worker em `public/sw.js`.
- Cache dos assets estaticos da SPA.
- Abertura offline apos o primeiro acesso.
- Modo `standalone`.
- Mensagem amigavel quando o usuario esta offline.
- Icones da UI com `lucide-react` e icone instalavel no mesmo estilo visual.

Nome curto: `Parquet UI`

Nome completo: `Parquet UI - Local Parquet Explorer`

### Como instalar a PWA no navegador

1. Acesse a aplicacao pelo navegador.
2. Aguarde o primeiro carregamento completo.
3. No Chrome ou Edge, clique no icone de instalacao na barra de endereco ou abra o menu e escolha `Instalar Parquet UI`.
4. No Android, abra o menu do navegador e escolha `Adicionar a tela inicial` ou `Instalar app`.
5. Depois de instalada, abra `Parquet UI` pela area de trabalho, menu de apps ou tela inicial.

Para validar offline, abra a PWA uma vez online, feche, desconecte a internet e abra novamente.

## Deploy na AWS

O dominio esperado e:

```txt
https://parquet-ui.lucas-tavares.com
```

Configure credenciais AWS com AWS CLI, SSO ou variaveis de ambiente. Nao coloque credenciais AWS no `.env`.

Fluxo de infraestrutura:

```bash
npm install
npm run infra:init
npm run infra:plan
npm run infra:apply
```

O Terraform cria:

- Bucket S3 privado para assets estaticos.
- CloudFront como CDN publica.
- Origin Access Control para acesso privado ao S3.
- Certificado ACM em `us-east-1`.
- Registro Route53 para `parquet-ui.lucas-tavares.com`.
- Fallback de SPA para `index.html`.

Depois, use os outputs do Terraform no deploy:

```bash
export S3_BUCKET=<bucket-output>
export CLOUDFRONT_DISTRIBUTION_ID=<distribution-id-output>
npm run deploy
```

Exemplo:

```bash
export S3_BUCKET=parquet-ui-lucas-tavares-com
export CLOUDFRONT_DISTRIBUTION_ID=XXXXXXXXXXXXXX
npm run deploy
```

O `npm run deploy` executa build, sincroniza `dist/` com o S3 e invalida o cache do CloudFront. O bucket nao deve ser publico; o acesso publico acontece somente pelo CloudFront.

Para destruir a infraestrutura:

```bash
npm run infra:destroy
```

Para verificar DNS:

```bash
dig parquet-ui.lucas-tavares.com
```

## Variaveis de deploy

Veja `.env.example`:

```bash
S3_BUCKET=parquet-ui-lucas-tavares-com
CLOUDFRONT_DISTRIBUTION_ID=XXXXXXXXXXXXXX
```

Essas variaveis documentam o deploy. Elas nao devem conter credenciais AWS.

## Limitacoes conhecidas

- Preview e profiling usam amostragem inicial para proteger a UI em arquivos grandes.
- Resultados SQL grandes sao limitados antes de renderizar.
- Dashboard usa amostra ou resultado SQL atual; agregacoes completas devem ser feitas via SQL quando necessario.
- File handling nativo para abrir `.parquet` direto pela PWA ainda fica no roadmap.
- Web Workers dedicados para profiling avancado ainda nao foram adicionados.

## Roadmap futuro

- Suporte a multiplos arquivos Parquet em queries conjuntas.
- Comparacao entre arquivos Parquet.
- Exportacao de resultado de query para Parquet.
- Exportacao de dashboard como imagem.
- Persistencia local via IndexedDB.
- Suporte a arquivos Parquet remotos via URL publica.
- Exportacao em Parquet alem de CSV para resultados de query e dados derivados.
- Melhorias com Web Workers.
- Mais tipos de graficos.
- Histograma automatico por coluna.
- Deteccao automatica de colunas temporais.
- Layout de dashboard com drag and drop.
- Salvamento local de dashboards.
- Views SQL nomeadas, criadas a partir de queries salvas, para que cada grafico do dashboard possa selecionar sua propria fonte de dados em vez de depender de uma selecao global.
- Highlight de sintaxe e autocomplete para o editor SQL.
- Internacionalizacao com React i18n, incluindo ingles, portugues, espanhol, frances, alemao, italiano, chines e japones; detectar idioma pelo navegador, usar ingles como fallback e oferecer seletor de idioma na UI.
- File handling para abrir arquivos `.parquet` diretamente com a PWA instalada, quando suportado pelo navegador.
- Cache offline avancado.
- Deteccao de atualizacao disponivel.
