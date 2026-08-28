# Ficha Cadastral de Produtores & Setup de Granjas • Bello Alimentos

Sistema web completo para gestão cadastral de produtores de aves, aviários/instalações, vinculação de extensionistas/técnicos e controle detalhado das fichas técnicas de setup de granjas, incluindo engine inteligente de importação de planilhas Excel (.xlsx/.xls) com persistência em nuvem via Supabase.

---

## 🚀 Funcionalidades Principais

### 1. ⬆ Importação Inteligente de Base de Dados (Excel)
- **Upload Moderno**: Drag-and-drop ou seleção de arquivos `.xlsx` e `.xls`.
- **Detecção Automática de Abas**: Priorização e seleção inteligente da aba `Tbl_txt`.
- **Mapeamento Flexível de Colunas**: Reconhecimento automático dos 25 campos por cabeçalho, tolerante a espaços extras, acentos e grafias variantes.
- **Pré-visualização & Validação Prévia**:
  - Cards dinâmicos: 👨‍🌾 Produtores, 🏠 Aviários, 👷 Técnicos e ⚠️ Pendências.
  - Tabela com status linha a linha e filtros de validação.
- **Estratégia Anti-Duplicidade (Upsert Idempotente)**:
  - Produtor identificado por Nome.
  - Extensionista/Técnico identificado por Nome.
  - Aviário identificado unicamente pela chave `Produtor + Instalação`.
  - Setup atualizado automaticamente sem criar duplicatas.
- **Progresso em Tempo Real**: Barra animada com checklist de etapas (`Técnicos`, `Produtores`, `Aviários`, `Setups`).
- **Relatório de Conclusão**: Resumo de registros criados/atualizados e download de arquivo de erros em CSV.
- **Histórico & Auditoria**: Registro permanente de todas as importações com logs no Supabase.

### 2. 📋 Ficha Técnica de Setup de Granja (Fiel ao PDF Oficial)
- **Estrutura Baseada no PDF da Bello Alimentos**:
  - Pressão de Vedação (Exaustor, Manômetro, Painel Controlador, Média).
  - Pressão de Trabalho (Exaustor, Manômetro, Painel Controlador, Média).
  - Ventilação Total em m/s (Lateral Direita, Meio, Lateral Esquerda, Média) e Quantidade de Exaustores.
  - Ventilação Entrada de Ar em m/s (Lado 01 Fornos e Lado 02 - Frente, Centro, Fundo).
  - Iluminação / Lux (Sob Lâmpada, Lateral, Triângulo, Lux 100%).
  - Placa Evaporativa (Tamanho da Placa em m², Tempo para Molhar a Placa).
  - Dimensões do Galpão (Altura Frente/Meio/Fundo/Média, Comprimento, Largura).
  - Recursos Hídricos (Vazão Poço 1, Poço 2, Entrada no Galpão, Armazenamento).
  - Painel de Alarmes com status visual (Casa, Aviário, Caixas Centrais - Possui Alarme / Em Funcionamento).
- **Edição em Tempo Real**: Permite alterar qualquer parâmetro diretamente na tela e salvar no Supabase.
- **Impressão / PDF**: Layout otimizado para impressão idêntico ao modelo físico.

### 3. 🔍 Filtro em Cascata & Visões
- **Cascata Dinâmica**: `1. Produtor` ➔ `2. Aviários (chips interativos)` ➔ `3. Ficha de Setup`.
- **Visão Produtores**: Listagem consolidada com total de aviários e atalhos diretos.
- **Visão Extensionistas**: Gestão completa (CRUD) com cadastro de novos técnicos, edição de informações de contato, desvinculação e exclusão segura.
- **Visão Histórico**: Auditoria de importações passadas e download de relatórios de erros.

---

## 📖 Documentação Completa
Para detalhes aprofundados sobre arquitetura, modelagem de banco de dados e diagramas ER, consulte o arquivo [DOCUMENTACAO.md](DOCUMENTACAO.md).

---

## 🛠️ Stack Tecnológica

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Canvas Confetti.
- **Engine Excel**: SheetJS (`xlsx`).
- **Backend / Database**: Supabase (PostgreSQL 15) com Row Level Security (RLS) e Constraints Únicas.
- **Bundler & Tooling**: Vite, Bun.

---

## 📦 Como Executar Localmente

1. Clone o repositório:
```bash
git clone https://github.com/lucaszinatto-beep/ficha-cadastral-produtores.git
cd ficha-cadastral-produtores
```

2. Instale as dependências:
```bash
bun install
```

3. Inicie o servidor de desenvolvimento:
```bash
bun dev
```

Acesse no seu navegador: `http://localhost:5173`.
