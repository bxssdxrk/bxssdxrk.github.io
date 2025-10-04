// textureMerger.js (Versão Final para Múltiplas Camadas)

/**
 * Função auxiliar que carrega uma imagem (PNG) e retorna um Promise.
 */
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; 
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error(`Falha ao carregar imagem: ${url}`));
        img.src = url;
    });
}


/**
 * Funde a skin base com uma lista de acessórios.
 * @param {string} baseSkinUrl - URL da textura base.
 * @param {string[]} accessoryUrls - Array de URLs de textura dos acessórios ativos.
 * @returns {Promise<string>} Data URL da nova imagem fundida.
 */
async function mergeTexture(baseSkinUrl, accessoryUrls) {
    const canvas = document.createElement('canvas');
    canvas.width = 64; 
    canvas.height = 64; 
    const ctx = canvas.getContext('2d');
    
    try {
        // 1. URLs de todas as texturas (base + todos os acessórios)
        const allUrls = [baseSkinUrl, ...accessoryUrls];

        // 2. Carrega todas as imagens simultaneamente
        const allImages = await Promise.all(allUrls.map(url => loadImage(url)));
        
        // 3. Desenha a primeira imagem (base)
        ctx.drawImage(allImages[0], 0, 0);

        // 4. Desenha todos os acessórios por cima, um a um
        for (let i = 1; i < allImages.length; i++) {
            ctx.drawImage(allImages[i], 0, 0);
        }
        
        // 5. Retorna a URL
        return canvas.toDataURL();

    } catch (error) {
        console.error("Erro ao fundir texturas:", error);
        return baseSkinUrl; 
    }
}

// Expõe a função para ser usada pelo app.js
window.mergeTexture = mergeTexture;