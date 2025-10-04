// dataLoader.js

/**
 * Carrega os itens de uma categoria específica (Lazy Loading).
 * Esta função só é chamada quando o usuário expande a categoria no UI.
 * @param {string} categoryName - O nome do arquivo (ex: 'hats', 'shoes').
 * @returns {Promise<Array<Object>>} Uma Promise que resolve para o array de itens.
 */
async function loadCategoryItems(categoryName) {
    // 1. Constrói o caminho completo do arquivo JSON.
    // Exemplo: se categoryName é 'hats', o caminho será './data/hats.json'
    const filePath = `./data/${categoryName}.json`;

    try {
        // 2. Tenta buscar o arquivo
        const response = await fetch(filePath);

        // 3. Verifica se a requisição foi bem-sucedida (Status 200-299)
        if (!response.ok) {
            throw new Error(`Erro ${response.status}: Arquivo ${filePath} não encontrado.`);
        }

        // 4. Converte a resposta para o objeto JSON (o Array de itens)
        const items = await response.json();

        // Retorna a lista de itens.
        return items;
        
    } catch (error) {
        console.error("Falha ao carregar a categoria:", error);
        // Retorna um array vazio para não quebrar a aplicação
        return []; 
    }
}

// Expõe a função para ser usada pelo nosso script principal
window.loadCategoryItems = loadCategoryItems;
