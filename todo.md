# Proxy Key Manager - TODO

## Banco de Dados & Autenticação
- [x] Criar schema de usuários com suporte a autenticação própria (username/password)
- [x] Criar tabela de keys (estoque por tipo)
- [x] Criar tabela de transações (histórico)
- [x] Implementar hash de senha com bcrypt
- [x] Criar admin padrão (ADMIN/ADMIN999)

## Backend (tRPC)
- [x] Procedure de login com username/password
- [x] Procedure de logout
- [x] Procedure de criação de revendedor (admin only)
- [x] Procedure de adicionar/remover créditos (admin only)
- [x] Procedure de adicionar keys ao estoque (admin only)
- [x] Procedure de gerar keys (revendedor - desconta créditos)
- [x] Procedure de listar estoque disponível
- [x] Procedure de listar histórico de transações
- [x] Procedure de listar revendedores (admin only)

## Painel Administrativo
- [x] Layout dashboard com tabs
- [x] Página de criação de revendedores
- [x] Página de gerenciamento de créditos
- [x] Página de gerenciamento de estoque de keys
- [x] Página de visualização de revendedores
- [x] Página de histórico de transações

## Painel do Revendedor
- [x] Página /panel com visualização de keys disponíveis
- [x] Exibir custo em créditos (1, 2, 4)
- [x] Exibir quantidade em estoque
- [x] Botões para gerar keys
- [x] Exibir keys geradas com botão copiar
- [x] Histórico de gerações do revendedor

## UI & Design
- [x] Design elegante e sofisticado (tema dark)
- [x] Tema dark coerente
- [x] Rodapé fixo com "Sistema desenvolvido por ruanzada7"
- [x] Responsividade mobile (ajustes finais)
- [x] Animações suaves

## Testes
- [x] Testes unitários de autenticação
- [x] Testes de geração de keys
- [x] Testes de desconto de créditos
