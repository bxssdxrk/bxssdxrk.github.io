// Função para atualizar o contador de IPs
function atualizarContador() {
    // Recupera o IP salvo no localStorage (simulando com um ID gerado aleatoriamente)
    const ipUnico = localStorage.getItem('ipUnico');

    // Se o IP não foi registrado ainda, registra ele e incrementa o contador
    if (!ipUnico) {
        // Atribui um valor único para o usuário (simulando o IP aqui)
        const novoIp = Math.random().toString(36).substring(2, 15); 
        localStorage.setItem('ipUnico', novoIp);

        // Incrementa o contador no localStorage
        let contador = localStorage.getItem('contador') || 0;
        contador = parseInt(contador) + 1;
        localStorage.setItem('contador', contador);
    }

    // Atualiza o contador na página
    const contadorElemento = document.getElementById('contador-usuarios');
    contadorElemento.textContent = localStorage.getItem('contador');
}

// Chama a função para atualizar o contador quando a página carregar
window.onload = atualizarContador;
