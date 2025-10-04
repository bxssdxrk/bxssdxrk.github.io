// preview3D.js

// Nota: A variável 'config' vem de 'config.js'
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializa o visualizador 3D (canvas: id="skin-viewer")
    const skinViewer = new skinview3d.SkinViewer({
        canvas: document.getElementById("skin-viewer"),
        width: config.VIEWER_WIDTH,
        height: config.VIEWER_HEIGHT,
        skin: config.SKIN_BASE_URL + config.DEFAULT_SKIN_FILE, // Começa com Steve (Wide)
        model: 'default' // 'default' é Steve (Wide)
    });

    // 2. Configura a interatividade (Rotação, Zoom e Movimentação)
    skinViewer.zoom = 0.5;
    skinViewer.fov = 60.0;
    // O controle de mouse e toque é ativado por padrão pela biblioteca, 
    // permitindo girar e movimentar a câmera.
    
    // Adiciona uma animação de caminhada para deixar mais vivo
    skinViewer.animation = null;

    // 3. Adiciona o listener para o Toggle Steve/Alex
    const slimToggle = document.getElementById('slim-toggle');
    slimToggle.addEventListener('change', () => {
        const isSlim = slimToggle.checked;
        
        // Define o modelo (Wide/Slim)
        skinViewer.playerModel = isSlim ? 'slim' : 'default'; // 'slim' é Alex, 'default' é Steve
        
        // A skin base também é atualizada para corresponder ao modelo
        const newSkinFile = isSlim ? config.DEFAULT_SLIM_SKIN_FILE : config.DEFAULT_SKIN_FILE;
        skinViewer.loadSkin(config.SKIN_BASE_URL + newSkinFile);

        console.log(`Modelo da skin alterado para: ${skinViewer.playerModel}`);
    });
    
    // Expõe o visualizador globalmente para ser usado por 'skinComposer.js'
    window.skinViewer = skinViewer;
});