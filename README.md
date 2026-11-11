# Agenda de Coletas

Aplicação web para registrar e acompanhar coletas de amostras de um laboratório
veterinário. Utiliza Next.js, TypeScript, SQLite e Tailwind CSS.

## Como executar

1. Instale o Node.js (versão compatível com Next.js 16).
2. Instale as dependências: `npm install`.
3. Configure `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `AUTH_SECRET` no `.env.local`.
   O segredo deve ter pelo menos 32 caracteres; não reutilize os valores locais
   em produção.
4. Inicie o projeto: `npm run dev`.
5. Acesse [http://localhost:3000](http://localhost:3000) e entre com o e-mail e
   a senha configurados.

O SQLite cria o arquivo `data/agenda.db` automaticamente. A pasta `data` e os
arquivos `.env*` não devem ser enviados ao repositório.

## Autenticação

O projeto usa uma conta administrativa configurada por variáveis de ambiente.
Após o login, a sessão é mantida em cookie assinado, `HttpOnly`, com validade de
8 horas. A tela principal e as operações de agendamento exigem uma sessão
válida. O endpoint de saúde do banco permanece público.

## Uso de IA

Preencha esta seção com seu próprio histórico de trabalho antes de entregar:
ferramentas usadas, 3 a 5 prompts reais, problemas encontrados e correções,
decisões tomadas sem IA e como você verificou os resultados.
