// app.js (Versão Final com Gerenciamento de Estado)

/**
 * Objeto de estado global para rastrear os acessórios aplicados.
 * Chave: modelPart (ex: 'head'), Valor: Objeto JSON do item.
 */
let appliedAccessories = {}; 

/**
 * Função responsável por fundir a skin base + TODOS os acessórios ativos e renderizar.
 */
async function renderAllAccessories() {
    const viewer = window.skinViewer;
    
    // 1. Encontrar a skin base correta (Steve ou Alex)
    const currentModelConfig = (viewer.playerModel === 'slim') 
        ? config.DEFAULT_SLIM_SKIN_FILE 
        : config.DEFAULT_SKIN_FILE;
    const baseSkinUrl = config.SKIN_BASE_URL + currentModelConfig;

    // 2. Coletar as URLs de textura de TODOS os acessórios no estado
    const accessoryUrls = Object.values(appliedAccessories)
        // Ordenar garante que os acessórios sempre se sobreponham na mesma ordem, se houver.
        .sort((a, b) => a.modelPart.localeCompare(b.modelPart)) 
        .map(item => item.texturePath);
    
    // 3. Fundir a skin base com TODOS os acessórios
    const newMergedSkinUrl = await mergeTexture(baseSkinUrl, accessoryUrls);

    // 4. Carrega a skin fundida no visualizador
    viewer.loadSkin(newMergedSkinUrl);
}

// ...
// O restante da função renderItemList (que você já tinha definido)
// ...
function renderItemList(items) {
    const itemsHtml = items.map(item => {
      return `
      <button class="item-button" data-item-id="${item.id}">
        ${item.name}
      </button>`;
    }).join(''); 
        // A categoria precisa ser definida UMA VEZ.
    const containerId = `${items[0].category}-list`; // Pega a categoria do primeiro item.
    const container = document.getElementById(containerId);

    
    container.innerHTML = itemsHtml;
}

// app.js (Bloco DOMContentLoaded com ordem corrigida)
// O bloco principal de inicialização
document.addEventListener('DOMContentLoaded', async () => {
    
    console.log("Aplicação iniciada. Carregando dados iniciais...");
    
    // 1. CARREGAR DADOS
    const [hats, pants, eyes, hairs, shirts] = await Promise.all([
        loadCategoryItems('hats'),
        loadCategoryItems('hairs'),
        loadCategoryItems('eyes'),
        loadCategoryItems('shirts'),
        loadCategoryItems('pants')
    ]);

    console.log("Categorias carregadas.");
    
    // 2. RENDERIZAR INTERFACE (ESTE BLOCO VEM PRIMEIRO)
    renderItemList(hats);
    renderItemList(hairs);
    renderItemList(eyes);
    renderItemList(shirts);
    renderItemList(pants);
    
    // 3. CONFIGURAR LISTENERS (ESTE BLOCO VEM DEPOIS)
    const allItems = [
      ...hats, 
      ...hairs,
      ...eyes,
      ...shirts,
      ...pants,
    ];

    // Re-renderizar todos os acessórios ao trocar o modelo Steve/Alex
    const slimToggle = document.getElementById('slim-toggle');
    slimToggle.addEventListener('change', renderAllAccessories); 

    const itemButtons = document.querySelectorAll('.item-button');
    
    itemButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const clickedId = button.dataset.itemId; 
            const itemToApply = allItems.find(item => item.id === clickedId);
            const partKey = itemToApply.modelPart;
            
            // Lógica de Estado
            if (appliedAccessories[partKey] && appliedAccessories[partKey].id === clickedId) {
                delete appliedAccessories[partKey];
                console.log(`Removido: ${itemToApply.name}`);
            } else {
                appliedAccessories[partKey] = itemToApply;
                console.log(`Aplicado: ${itemToApply.name} (Substituindo item anterior na parte: ${partKey})`);
            }
            
            await renderAllAccessories();
        });
    });
    
    const loadingText = document.querySelector('.loading-text');
    if (loadingText) loadingText.remove();
});