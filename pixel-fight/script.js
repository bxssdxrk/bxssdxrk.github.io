const canvas = document.getElementById("pixelCanvas");
const ctx = canvas.getContext("2d");

// Configurações iniciais
let resolution = 50; // Resolução padrão 50x50
let teamsCount = 4;
let tickRate = 20;
let running = false;
let paused = false;
let pixelSize;
let grid = [];
let teamColors = [];
let addTeamMode = false;
let animationInterval = null;

// Funções auxiliares
function randomColor() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
}

// Calcula dimensões da grade de times
function getGridDimensions(teamsCount) {
  let rows = Math.floor(Math.sqrt(teamsCount));
  let cols = Math.ceil(teamsCount / rows);
  if (rows * cols < teamsCount) {
    rows++;
    cols = Math.ceil(teamsCount / rows);
  }
  return { rows, cols };
}

// Ajusta a resolução para ser múltiplo do LCM das dimensões da grade
function adjustResolution(resolution, rows, cols) {
  const lcmValue = lcm(rows, cols);
  let adjustedResolution = resolution - (resolution % lcmValue);
  if (adjustedResolution < 6) {
    adjustedResolution = 6;
  } else if (adjustedResolution > 150) {
    adjustedResolution = 150;
  }
  return adjustedResolution;
}

// Funções para LCM/GCD
function gcd(a, b) {
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

function lcm(a, b) {
  return (a * b) / gcd(a, b);
}

// Inicializa o grid com disposição em grade
function initGrid() {
  grid = Array(resolution).fill().map(() => Array(resolution).fill(-1));
  
  // Calcular grade proporcional para times
  const { rows, cols } = getGridDimensions(teamsCount);
  
  const blockSizeX = Math.floor(resolution / cols);
  const blockSizeY = Math.floor(resolution / rows);
  
  for (let team = 0; team < teamsCount; team++) {
    const row = Math.floor(team / cols);
    const col = team % cols;
    
    const startX = col * blockSizeX;
    const startY = row * blockSizeY;
    const endX = Math.min(startX + blockSizeX, resolution);
    const endY = Math.min(startY + blockSizeY, resolution);
    
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        grid[y][x] = team;
      }
    }
  }
}

// Função de desenho
function drawGrid() {
  pixelSize = Math.floor(
    Math.min(window.innerWidth, window.innerHeight) * 0.6 / resolution
  );
  canvas.width = resolution * pixelSize;
  canvas.height = resolution * pixelSize;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const team = grid[y][x];
      if (team === -1) continue; // Pixels vazios
      
      ctx.fillStyle = teamColors[team] || "transparent";
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }
  }
}

// Lógica do jogo
function tick() {
  if (!running || paused) return;
  
  // Verificar times ativos
  const pixelCountByTeam = new Map();
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const team = grid[y][x];
      if (team !== -1) {
        pixelCountByTeam.set(team, (pixelCountByTeam.get(team) || 0) + 1);
      }
    }
  }

  // Remover times que não têm pixels
  const eliminatedTeams = [];
  for (let i = 0; i < teamsCount; i++) {
    if (!pixelCountByTeam.has(i)) {
      eliminatedTeams.push(i);
    }
  }

  if (eliminatedTeams.length > 0) {
    // Remove times do array de cores
    teamColors = teamColors.filter((_, idx) => !eliminatedTeams.includes(idx));
    teamsCount = teamColors.length;

    // Reindexar grid para ajustar IDs de times
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const team = grid[y][x];
        if (team !== -1) {
          // Ajusta índice baseado nos times eliminados antes dele
          const removedBefore = eliminatedTeams.filter(t => t < team).length;
          grid[y][x] -= removedBefore;
        }
      }
    }
  }

  // Continua a simulação
  let newGrid = grid.map(row => [...row]);
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const team = grid[y][x];
      if (team === -1) continue;
      
      const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= resolution || ny < 0 || ny >= resolution) continue;
        
        const neighbor = grid[ny][nx];
        if (neighbor !== team && neighbor !== -1 && Math.random() < 0.25) {
          newGrid[ny][nx] = team;
        }
      }
    }
  }

  grid = newGrid;
  drawGrid();

  // Atualizar verificação de vencedor
  const activeTeams = new Set();
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      if (grid[y][x] !== -1) activeTeams.add(grid[y][x]);
    }
  }
  checkWinner(activeTeams);
}

function checkWinner(activeTeams) {
  if (activeTeams.size === 1) {
    running = false;
    const winner = [...activeTeams][0];
    document.getElementById("btnStartStop").textContent = "Reiniciar";
    alert(`Time ${winner + 1} venceu!`);
  } else if (activeTeams.size === 0) {
    running = false;
    document.getElementById("btnStartStop").textContent = "Reiniciar";
    alert("Todos os times foram eliminados!");
  }
}

// Controle do jogo
function startGame() {
  if (!running) {
    initGrid();
    running = true;
    paused = false;
    document.getElementById("btnStartStop").textContent = "Parar";
    document.getElementById("btnPause").textContent = "⏸️";
    loop();
  } else {
    running = false;
    document.getElementById("btnStartStop").textContent = "Iniciar";
  }
}

function loop() {
  if (running) {
    tick();
    setTimeout(loop, 1000 / tickRate);
  }
}

// Modal de configurações
const configModal = document.getElementById("configModal");
document.getElementById("btnConfig").addEventListener("click", () => {
  updateTeamColorsUI();
  configModal.classList.remove("hidden");
});

document.getElementById("btnCloseConfig").addEventListener("click", () => {
  configModal.classList.add("hidden");
});

// Fechar modal ao clicar fora
window.addEventListener('click', (e) => {
  if (e.target === configModal) {
    configModal.classList.add("hidden");
  }
});

// Alterar tema
document.getElementById("themeSelect").addEventListener("change", (e) => {
  const theme = e.target.value;
  switch (theme) {
    case "light":
      document.documentElement.style.setProperty("--bg-color", "#ffffff");
      document.documentElement.style.setProperty("--text-color", "#000000");
      break;
    case "amoled":
      document.documentElement.style.setProperty("--bg-color", "#000000");
      document.documentElement.style.setProperty("--text-color", "#ffffff");
      break;
    case "gray":
      document.documentElement.style.setProperty("--bg-color", "#444444");
      document.documentElement.style.setProperty("--text-color", "#ffffff");
      break;
    case "blue":
      document.documentElement.style.setProperty("--bg-color", "#0a1a2f");
      document.documentElement.style.setProperty("--text-color", "#ffffff");
      break;
  }
  drawGrid();
});

// Alterar resolução (máximo alterado para 150)
document.getElementById("resolutionInput").addEventListener("input", (e) => {
  const newResolution = Math.min(150, Math.max(6, parseInt(e.target.value) || 50));
  document.getElementById("resolutionValue").textContent = newResolution;
});

// Alterar quantidade de times
document.getElementById("teamsInput").addEventListener("input", (e) => {
  const newCount = parseInt(e.target.value);
  if (![2, 3, 4, 6, 8, 9].includes(newCount)) {
    e.target.value = teamsCount; // Mantém o valor atual se inválido
    document.getElementById("teamsValue").textContent = teamsCount;
    return;
  }
  
  teamsCount = newCount;
  document.getElementById("teamsValue").textContent = teamsCount;
  
  // Atualiza cores dos times
  if (teamsCount < teamColors.length) {
    teamColors = teamColors.slice(0, teamsCount);
  } else {
    while (teamColors.length < teamsCount) {
      teamColors.push(randomColor());
    }
  }
  
  // Atualiza a resolução se necessário
  const { rows, cols } = getGridDimensions(teamsCount);
  const adjustedResolution = adjustResolution(resolution, rows, cols);
  if (adjustedResolution !== resolution) {
    resolution = adjustedResolution;
    document.getElementById("resolutionInput").value = resolution;
    document.getElementById("resolutionValue").textContent = resolution;
  }
  
  // Reinicializa o grid
  initGrid();
  drawGrid();
  updateTeamColorsUI();
});

// Alterar tick rate
document.getElementById("tickRateInput").addEventListener("input", (e) => {
  const newTickRate = Math.max(1, parseInt(e.target.value) || 20);
  tickRate = newTickRate;
  document.getElementById("tickRateValue").textContent = tickRate;
});

// Alterar cor dos times
function updateTeamColorsUI() {
  const container = document.getElementById("teamColorsContainer");
  container.innerHTML = "";
  
  teamColors.forEach((color, i) => {
    const div = document.createElement("div");
    div.className = "team-color-picker";
    div.innerHTML = `
      <label>Time ${i + 1}:
        <div class="color-input-group">
          <input type="color" value="${color}" data-team="${i}" class="color-input">
          <input type="text" value="${color}" maxlength="7" data-team="${i}" class="color-text">
        </div>
      </label>
    `;
    container.appendChild(div);
  });
  
  container.querySelectorAll('.color-input').forEach(inp => {
    inp.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.team);
      teamColors[idx] = e.target.value;
      e.target.parentNode.querySelector('.color-text').value = e.target.value;
      drawGrid();
    });
  });
  
  container.querySelectorAll('.color-text').forEach(inp => {
    inp.addEventListener("input", (e) => {
      const val = e.target.value;
      const idx = parseInt(e.target.dataset.team);
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        teamColors[idx] = val;
        e.target.parentNode.querySelector('.color-input').value = val;
        drawGrid();
      }
    });
  });
}

// Resetar configurações
document.getElementById("btnResetConfig").addEventListener("click", () => {
  resolution = 50; // Padrão alterado para 50
  teamsCount = 4;
  tickRate = 20;
  teamColors = Array(teamsCount).fill().map(randomColor);
  initGrid();
  drawGrid();
  updateTeamColorsUI();
  
  // Resetar inputs
  document.getElementById("resolutionInput").value = resolution;
  document.getElementById("teamsValue").textContent = teamsCount;
  document.getElementById("resolutionValue").textContent = resolution;
  document.getElementById("tickRateInput").value = tickRate;
  document.getElementById("tickRateValue").textContent = tickRate;
});

// Screenshot
document.getElementById("btnScreenshot").addEventListener("click", () => {
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  
  // Criar canvas temporário com fundo branco
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  tempCtx.fillStyle = '#FFFFFF';
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  tempCtx.drawImage(canvas, 0, 0);
  
  const link = document.createElement("a");
  link.download = `PixelFight-${Date.now()}.png`;
  link.href = tempCanvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// Adicionar novo time
document.getElementById("btnAddTeam").addEventListener("click", () => {
  if (teamsCount >= 9) {
    alert("Máximo de 9 times atingido!");
    return;
  }
  
  const newColor = randomColor();
  teamColors.push(newColor);
  teamsCount++;
  
  // Atualiza cores dos times
  updateTeamColorsUI();
  
  // Atualiza a resolução se necessário
  const { rows, cols } = getGridDimensions(teamsCount);
  const adjustedResolution = adjustResolution(resolution, rows, cols);
  if (adjustedResolution !== resolution) {
    resolution = adjustedResolution;
    document.getElementById("resolutionInput").value = resolution;
    document.getElementById("resolutionValue").textContent = resolution;
  }
  
  // Ativar modo de adição
  addTeamMode = true;
  alert("Clique em QUALQUER pixel para adicionar o novo time.");
});

// Evento de clique no canvas para adicionar time
canvas.addEventListener("click", (e) => {
  if (!addTeamMode) return;
  
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / pixelSize);
  const y = Math.floor((e.clientY - rect.top) / pixelSize);
  
  if (x >= 0 && x < resolution && y >= 0 && y < resolution) {
    // Permite adicionar em QUALQUER pixel (vazio ou ocupado)
    grid[y][x] = teamsCount - 1;
    drawGrid();
    addTeamMode = false;
  }
});

// Botões principais
document.getElementById("btnStartStop").addEventListener("click", startGame);
document.getElementById("btnPause").addEventListener("click", () => {
  paused = !paused;
  document.getElementById("btnPause").textContent = paused ? "▶️" : "⏸️";
});

// Evento de aplicar configurações
document.getElementById("btnApplyConfig").addEventListener("click", () => {
  // Validações
  const newResolution = parseInt(document.getElementById("resolutionInput").value);
  const newTeamsCount = parseInt(document.getElementById("teamsInput").value);
  const newTickRate = parseInt(document.getElementById("tickRateInput").value);

  // Valores válidos para times
  const validTeamsValues = [2, 3, 4, 6, 8, 9];
  if (!validTeamsValues.includes(newTeamsCount)) {
    alert("Número de times inválido. Valores válidos: 2, 3, 4, 6, 8, 9.");
    return;
  }

  // Calcula dimensões da grade
  const { rows, cols } = getGridDimensions(newTeamsCount);
  const adjustedResolution = adjustResolution(newResolution, rows, cols);

  // Define resolução ajustada
  resolution = adjustedResolution;
  teamsCount = newTeamsCount;
  tickRate = newTickRate;

  // Atualiza cores dos times
  if (teamsCount < teamColors.length) {
    teamColors = teamColors.slice(0, teamsCount);
  } else {
    while (teamColors.length < teamsCount) {
      teamColors.push(randomColor());
    }
  }

  // Reinicializa o grid
  initGrid();
  drawGrid();
  updateTeamColorsUI();
  document.getElementById("configModal").classList.add("hidden");
});

// Inicialização
teamColors = Array(teamsCount).fill().map(randomColor);
initGrid();
drawGrid();
window.addEventListener("resize", drawGrid);
