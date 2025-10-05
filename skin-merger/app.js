// app.js

// Ordem de renderização, do mais baixo (desenhar primeiro) para o mais alto (desenhar por último)
const RENDER_ORDER = [
    'socks',
    'shoes',
    'underwears',
    'pants',
    'pants-accessories',
    'shirts',
    't-shirts',
    'torso-accessories',
    'mouths',
    'eyes',
    'eyebrows',
    'hairs',
    'face-accessories',
    'head-accessories',
    'hats'
];

let appliedAccessories = {}; 

/**
 * Função responsável por fundir a skin base + TODOS os acessórios ativos e renderizar.
 */

async function renderAllAccessories() {
    const viewer = window.skinViewer;
    
    // 1. Encontrar a skin base correta
    const currentModelConfig = (viewer.playerModel === 'slim') 
        ? config.DEFAULT_SLIM_SKIN_FILE 
        : config.DEFAULT_SKIN_FILE;
    const baseSkinUrl = config.SKIN_BASE_URL + currentModelConfig;

    // 2. Coletar e ORDENAR as URLs de textura
    const accessoryUrls = Object.values(appliedAccessories)
        .sort((a, b) => {
            // Encontra a posição de cada categoria no array RENDER_ORDER.
            // Os itens com índice menor (que estão no início do array, como 'shoes')
            // serão desenhados PRIMEIRO.
            const indexA = RENDER_ORDER.indexOf(a.category);
            const indexB = RENDER_ORDER.indexOf(b.category);
            
            return indexA - indexB; 
        })
        .map(item => item.texturePath);
    
    // 3. Fundir a skin base com TODOS os acessórios
    const newMergedSkinUrl = await mergeTexture(baseSkinUrl, accessoryUrls);

    // 4. Carrega a skin fundida no visualizador
    viewer.loadSkin(newMergedSkinUrl);
}

function setupCategoryToggles() {
    const headers = document.querySelectorAll('.category-header');
    
    headers.forEach(header => {
        header.addEventListener('click', () => {
            // Pega o ID da div de conteúdo que deve ser exibida/ocultada
            const targetId = header.dataset.target;
            const targetContent = document.getElementById(targetId);
            
            if (targetContent) {
                // A função .toggle() adiciona a classe se ela não existir, e remove se ela existir.
                targetContent.classList.toggle('collapsed');
            }
        });
    });
}

function renderItemList(items) {
    const itemsHtml = items.map(item => {
      if (!item.enabled) return '';
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

// O bloco principal de inicialização
document.addEventListener('DOMContentLoaded', async () => {
    
    console.log("Aplicação iniciada. Carregando dados iniciais...");
    
    // 1. CARREGAR DADOS
    const [
      hats, 
      pants, 
      eyes, 
      hairs, 
      shirts,
      tshirts,
      eyebrows,
    ] = await Promise.all([
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
    setupCategoryToggles();
    
    const loadingText = document.querySelector('.loading-text');
    if (loadingText) loadingText.remove();
    
    // 3. CONFIGURAR LISTENERS (ESTE BLOCO VEM DEPOIS)
    const allItems = [
      ...hats, 
      ...pants, 
      ...eyes, 
      ...hairs, 
      ...shirts,
    ];

    // Re-renderizar todos os acessórios ao trocar o modelo Steve/Alex
    const slimToggle = document.getElementById('slim-toggle');
    slimToggle.addEventListener('change', renderAllAccessories); 

    const itemButtons = document.querySelectorAll('.item-button');
    itemButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const clickedId = button.dataset.itemId; 
            const itemToApply = allItems.find(item => item.id === clickedId);
            
            // 🚨 MUDANÇA CRÍTICA: A chave de estado agora é a CATEGORIA, não a modelPart.
            const stateKey = itemToApply.category; 
            
            // Lógica de Estado (Toggle e Substituição)
            
            // Verificamos se o item *naquela categoria* já está selecionado
            if (appliedAccessories[stateKey] && appliedAccessories[stateKey].id === clickedId) {
                // TOGGLE: Se já estiver ativo, remova a chave de CATEGORIA
                delete appliedAccessories[stateKey];
                console.log(`Removido: ${itemToApply.name}`);
            } else {
                // SUBSTITUIÇÃO: Adiciona/Substitui o item na chave de CATEGORIA
                appliedAccessories[stateKey] = itemToApply;
                console.log(`Aplicado: ${itemToApply.name} (Substituindo item anterior na categoria: ${stateKey})`);
            }
            
            await renderAllAccessories();
        });
    });
});