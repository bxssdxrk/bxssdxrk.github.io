#!/data/data/com.termux/files/usr/bin/bash

# Cores para feedback visual
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar erros
check_error() {
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Erro no comando anterior!${NC}"
        exit 1
    fi
}

# Verifica se é um repositório git
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo -e "${RED}❌ Este diretório não é um repositório Git!${NC}"
    exit 1
fi

# Verifica por mudanças
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️ Nenhuma alteração detectada!${NC}"
    exit 0
fi

# Exibe status antes de adicionar
echo -e "\n${YELLOW}📋 Status do repositório:${NC}"
git status -s

# Adiciona arquivos com confirmação
echo -e "\n⌛ Adicionando arquivos..."
git add .
check_error

# Loop para mensagem de commit válida
while true; do
    read -p "✏️ Mensagem do commit: " mensagem
    
    if [ -z "$mensagem" ]; then
        echo -e "${RED}❌ Mensagem não pode ser vazia!${NC}"
    elif [ ${#mensagem} -lt 3 ]; then
        echo -e "${RED}❌ Mensagem muito curta (mín. 3 caracteres)!${NC}"
    else
        break
    fi
done

# Faz o commit
echo -e "\n🔨 Criando commit..."
git commit -m "$mensagem"
check_error

# Push com confirmação (tratando Enter como "sim")
read -p "🚀 Enviar para o repositório remoto (Github)? [S/n] " -n 1 -r
echo

# Se REPLY estiver vazio (Enter), ou for s/S/y/Y, então envia
if [[ -z "$REPLY" || "$REPLY" =~ ^[SsYy]$ ]]; then
    echo -e "\n🌐 Enviando alterações..."
    git push
    if [ $? -eq 0 ]; then
        echo -e "\n${GREEN}✅ Commit realizado e push enviado com sucesso!${NC}"
    else
        echo -e "\n${RED}❌ Erro ao enviar para o repositório remoto!${NC}"
        echo "⚠️ Tente manualmente com: git push"
    fi
else
    echo -e "\n${GREEN}✅ Commit realizado localmente (push não enviado)${NC}"
fi