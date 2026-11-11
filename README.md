# Agenda de Coletas

Aplicação web para registrar e acompanhar coletas de amostras de um laboratório
veterinário. Utiliza Next.js, TypeScript, SQLite e Tailwind CSS.

## Como executar

1. Use Node.js 22.13.0 ou mais recente. O banco usa o módulo `node:sqlite`,
   integrado ao Node.js, sem precisar compilar uma dependência nativa.
2. Instale as dependências: `npm install`.
3. Crie o arquivo `.env.local` a partir do exemplo. No PowerShell, execute
   `Copy-Item .env.example .env.local`. Edite o arquivo e substitua os valores
   de exemplo de `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `AUTH_SECRET` pelos seus.
   `AUTH_SECRET` deve ter pelo menos 32 caracteres; não reutilize esses valores
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

### 1. Ferramentas
Claude e ChatGPT para decisões iniciais sobre estrutura do código e setup, e Copilot para o auxílio do código em tempo real no VSCode

### 2. Prompts

1. “Impeça a criação de agendamentos no passado e em horários que conflitem com outro agendamento ativo. Faça a validação no servidor, considere o fuso horário e preserve o comportamento existente.”

2. “Adicione filtros por status, data e clínica à lista. Não permita que agendamentos cancelados ou coletados voltem ao estado agendado, e mantenha essa regra também na API.”

3. “Permita editar agendamentos ainda agendados, mas não a data nem o horário. Mantenha a interface consistente com o formulário de criação e valide que os demais fluxos continuam funcionando.”


### 3. Erros da IA
Em dado momento a adição de funcionalidade de edição de agendamentos criou um bug visual onde alguns botões se sobrepuseram, exigindo uma correção manual do layout

### 4. Decisões suas
O modelo de dados e algumas coisas referentes às estruturas das páginas foram decididos sem o uso da IA, ou trabalhados sobre o produto que a IA entregou.
Outra coisa foi o layout/design da página, depois de criado o rascunho, foi trabalhado em cima, por exemplo, a criação de agendamentos não explicita se deve ser necessário poder criar um agendamento com um estado diferente de "agendado" como inicial, como não faria sentido criar um agendamento já cancelado não permiti que fosse alterado logo de início, além disso também não permito que se altere a data de um agendamento na edição. Decisões sobre os filtros e design da página também foram sem o uso da IA. Mesmo que a avaliação não leve em conta a interface, acredito que uma boa UI/UX parte principalmente de decisões humanas.

### 5. Evolução
Alterar o layout da página para melhorar a usabilidade no mobile, fazendo com que a lista de agendamentos apareça primeiro, colocar um botão de "adicionar" agendamento no topo da lista ao invés de deixar sempre visível no canto/topo da tela, além de melhorias quanto à inserção de agendamentos e visualização deles em um formato diferente, como se fosse uma agenda.