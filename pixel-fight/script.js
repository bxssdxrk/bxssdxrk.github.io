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
let gameHistory = [];
let isRecording = false;
let sandboxMode = false;
let teamExpansionSpeeds = [];
let zoomLevel = 1;
let showStatistics = false;
let lastPixelCounts = {};
let lastCountTime = 0;
let recordFrame = 0;
let statFrame = 0;

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
function getPixelCountsByTeam(bypassCache = false) {
  const now = Date.now();
  if (!bypassCache && lastCountTime > 0 && now - lastCountTime < 100) {
    return lastPixelCounts;
  }
  
  const counts = {};
  for (let i = 0; i < teamsCount; i++) {
    counts[i] = 0;
  }
  
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const team = grid[y][x];
      if (team !== -1) {
        counts[team]++;
      }
    }
  }
  
  lastPixelCounts = counts;
  lastCountTime = now;
  return counts;
}

// Feature 3: Salvar estado para gravação (otimizado - a cada 10 frames)
function saveGameState() {
  if (isRecording) {
    recordFrame++;
    if (recordFrame % 10 === 0) {
      gameHistory.push(grid.map(row => [...row]));
    }
  }
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
  
  // Inicializar velocidades de expansão (Feature 4)
  teamExpansionSpeeds = Array(teamsCount).fill(1);
}

// Função de desenho (otimizada)
function drawGrid() {
  pixelSize = Math.floor(
    Math.min(window.innerWidth, window.innerHeight) * 0.6 / resolution
  ) * zoomLevel;
  canvas.width = resolution * pixelSize;
  canvas.height = resolution * pixelSize;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Desenhar pixels otimizado
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const team = grid[y][x];
      if (team === -1) continue;
      
      ctx.fillStyle = teamColors[team] || "transparent";
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }
  }
  
  // Desenhar grid se zoom > 2 (otimizado com batch)
  if (zoomLevel > 2) {
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.2)';
    ctx.lineWidth = 0.5;
    
    // Desenhar todas as linhas verticais em um path
    ctx.beginPath();
    for (let x = 0; x <= resolution; x++) {
      const px = x * pixelSize;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, canvas.height);
    }
    ctx.stroke();
    
    // Desenhar todas as linhas horizontais em um path
    ctx.beginPath();
    for (let y = 0; y <= resolution; y++) {
      const py = y * pixelSize;
      ctx.moveTo(0, py);
      ctx.lineTo(canvas.width, py);
    }
    ctx.stroke();
  }
}

// Lógica do jogo (otimizada)
function tick() {
  if (!running || paused) return;
  
  // Salvar estado para gravação (Feature 3)
  saveGameState();
  
  // Verificar times ativos - usar contagem com cache
  const pixelCountByTeam = getPixelCountsByTeam(true);

  // Remover times que não têm pixels
  const eliminatedTeams = [];
  for (let i = 0; i < teamsCount; i++) {
    if (pixelCountByTeam[i] === 0) {
      eliminatedTeams.push(i);
    }
  }

  if (eliminatedTeams.length > 0) {
    // Remove times do array de cores
    teamColors = teamColors.filter((_, idx) => !eliminatedTeams.includes(idx));
    teamExpansionSpeeds = teamExpansionSpeeds.filter((_, idx) => !eliminatedTeams.includes(idx));
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

  // Continua a simulação (otimizada)
  let newGrid = grid.map(row => [...row]);
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  const randomValues = new Float32Array(resolution * resolution);
  for (let i = 0; i < randomValues.length; i++) {
    randomValues[i] = Math.random();
  }
  
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const team = grid[y][x];
      if (team === -1) continue;
      
      const speed = teamExpansionSpeeds[team];
      const threshold = 0.25 * speed;
      let randIdx = 0;
      
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= resolution || ny < 0 || ny >= resolution) continue;
        
        const neighbor = grid[ny][nx];
        if (neighbor !== team && neighbor !== -1 && randomValues[y * resolution + x + randIdx] < threshold) {
          newGrid[ny][nx] = team;
        }
        randIdx++;
      }
    }
  }

  grid = newGrid;
  drawGrid();
  updateStatistics();

  // Atualizar verificação de vencedor (otimizado - usar Set da contagem)
  const activeTeams = new Set();
  for (const [team, count] of Object.entries(pixelCountByTeam)) {
    if (count > 0) activeTeams.add(parseInt(team));
  }
  checkWinner(activeTeams);
}

function checkWinner(activeTeams) {
  if (activeTeams.size === 1) {
    running = false;
    const winner = [...activeTeams][0];
    document.getElementById("btnStartStop").textContent = "Reiniciar";
    
    // Salvar no histórico de resultados
    gameHistory.push({
      winner: winner,
      winnerColor: teamColors[winner],
      timestamp: new Date(),
      teamCount: teamsCount,
      resolution: resolution
    });
    
    alert(`Time ${winner + 1} venceu!`);
  } else if (activeTeams.size === 0) {
    running = false;
    document.getElementById("btnStartStop").textContent = "Reiniciar";
    alert("Todos os times foram eliminados!");
  }
}

// Encerrar partida e determinar vencedor por pixels
function endGameAndDeclareWinner() {
  if (!running && !paused) {
    alert("Nenhuma partida em andamento!");
    return;
  }
  
  running = false;
  isRecording = false;
  const pixelCounts = getPixelCountsByTeam(true);
  
  // Encontrar time(s) com mais pixels
  const maxPixels = Math.max(...Object.values(pixelCounts));
  const winners = Object.entries(pixelCounts)
    .filter(([_, count]) => count === maxPixels)
    .map(([team, _]) => parseInt(team));
  
  document.getElementById("btnStartStop").textContent = "Reiniciar";
  
  // Salvar no histórico
  gameHistory.push({
    winners: winners,
    winnerColors: winners.map(w => teamColors[w]),
    timestamp: new Date(),
    teamCount: teamsCount,
    resolution: resolution,
    pixelCounts: pixelCounts,
    endedManually: true
  });
  
  // Determinar mensagem
  if (winners.length === 1) {
    alert(`Time ${winners[0] + 1} venceu com ${maxPixels} pixels!`);
  } else {
    const teamNumbers = winners.map(w => `Time ${w + 1}`).join(", ");
    alert(`${teamNumbers} empataram com ${maxPixels} pixels cada!`);
  }
}

// Feature 5: Atualizar estatísticas em tempo real (otimizado - a cada 5 frames)
function updateStatistics() {
  const statsDiv = document.getElementById("statsDisplay");
  if (!statsDiv || !showStatistics) return;
  
  statFrame++;
  // Atualiza apenas a cada 5 frames para não sobrecarregar
  if (statFrame % 5 !== 0) return;
  
  const pixelCounts = lastPixelCounts;
  let statsHTML = "<h3>Stats</h3>";
  
  const sorted = Object.entries(pixelCounts)
    .sort((a, b) => b[1] - a[1]);
  
  for (const [team, count] of sorted) {
    const percentage = ((count / (resolution * resolution)) * 100).toFixed(1);
    const color = teamColors[team];
    statsHTML += `<div class="stat-item"><span style="color: ${color}; font-weight: bold;">T${parseInt(team) + 1}:</span> ${count}px (${percentage}%)</div>`;
  }
  
  statsDiv.innerHTML = statsHTML;
}

// Controle do jogo
function startGame() {
  if (!running) {
    initGrid();
    running = true;
    paused = false;
    gameHistory = [];
    isRecording = true;
    document.getElementById("btnStartStop").textContent = "Parar";
    document.getElementById("btnPause").textContent = "⏸️";
    loop();
  } else {
    running = false;
    isRecording = false;
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

// Sistema de abas
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove ativo de todos os botões e conteúdos
    tabButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    // Ativa o selecionado
    btn.classList.add('active');
    const tabId = btn.dataset.tab + '-tab';
    document.getElementById(tabId).classList.add('active');
  });
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
  resolution = newResolution;
  document.getElementById("resolutionValue").textContent = newResolution;
  if (!running) {
    drawGrid();
  }
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
  
  // Feature 9: Velocidade de expansão customizável por time
  for (let i = 0; i < teamColors.length; i++) {
    const color = teamColors[i];
    const speed = teamExpansionSpeeds[i] || 1;
    
    const div = document.createElement("div");
    div.className = "team-color-picker";
    div.innerHTML = `
      <label>Time ${i + 1}:
        <div class="color-input-group">
          <input type="color" value="${color}" data-team="${i}" class="color-input">
          <input type="text" value="${color}" maxlength="7" data-team="${i}" class="color-text">
          <input type="range" min="0.5" max="2" step="0.1" value="${speed}" data-team="${i}" class="speed-input" title="Velocidade">
        </div>
      </label>
    `;
    container.appendChild(div);
  }
  
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
  
  container.querySelectorAll('.speed-input').forEach(inp => {
    inp.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.team);
      teamExpansionSpeeds[idx] = parseFloat(e.target.value);
    });
  });
}

// Resetar configurações
document.getElementById("btnResetConfig").addEventListener("click", () => {
  resolution = 50; // Padrão alterado para 50
  teamsCount = 4;
  tickRate = 20;
  zoomLevel = 1;
  teamColors = Array(teamsCount).fill().map(randomColor);
  teamExpansionSpeeds = Array(teamsCount).fill(1);
  initGrid();
  drawGrid();
  updateTeamColorsUI();
  
  // Resetar inputs
  document.getElementById("resolutionInput").value = resolution;
  document.getElementById("teamsValue").textContent = teamsCount;
  document.getElementById("resolutionValue").textContent = resolution;
  document.getElementById("tickRateInput").value = tickRate;
  document.getElementById("tickRateValue").textContent = tickRate;
  document.getElementById("zoomInput").value = zoomLevel;
  document.getElementById("zoomValue").textContent = (zoomLevel * 100).toFixed(0) + "%";
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

document.getElementById("btnEndGame").addEventListener("click", endGameAndDeclareWinner);

// Feature 6: Zoom in/out (Feature 8)
const zoomInput = document.getElementById("zoomInput");
if (zoomInput) {
  zoomInput.addEventListener("input", (e) => {
    zoomLevel = parseFloat(e.target.value);
    document.getElementById("zoomValue").textContent = (zoomLevel * 100).toFixed(0) + "%";
    drawGrid();
  });
}

// Feature 9: Toggle Estatísticas
const statsToggle = document.getElementById("statsToggle");
if (statsToggle) {
  statsToggle.addEventListener("change", (e) => {
    showStatistics = e.target.checked;
    const statsDiv = document.getElementById("statsDisplay");
    if (statsDiv) {
      statsDiv.style.display = showStatistics ? "block" : "none";
    }
  });
}

// Feature 10: Modo Sandbox (sem vencedor)
const sandboxToggle = document.getElementById("sandboxToggle");
if (sandboxToggle) {
  sandboxToggle.addEventListener("change", (e) => {
    sandboxMode = e.target.checked;
  });
}

// Feature 7: Exportar configurações
document.getElementById("btnExportConfig").addEventListener("click", () => {
  const config = {
    resolution,
    teamsCount,
    tickRate,
    teamColors,
    teamExpansionSpeeds,
    zoomLevel
  };
  const json = JSON.stringify(config, null, 2);
  const link = document.createElement("a");
  link.download = `PixelFight-Config-${Date.now()}.json`;
  link.href = `data:text/json,${encodeURIComponent(json)}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// Feature 8: Importar configurações
document.getElementById("btnImportConfig").addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target.result);
        resolution = config.resolution || 50;
        teamsCount = config.teamsCount || 4;
        tickRate = config.tickRate || 20;
        teamColors = config.teamColors || Array(teamsCount).fill().map(randomColor);
        teamExpansionSpeeds = config.teamExpansionSpeeds || Array(teamsCount).fill(1);
        zoomLevel = config.zoomLevel || 1;
        
        document.getElementById("resolutionInput").value = resolution;
        document.getElementById("teamsInput").value = teamsCount;
        document.getElementById("tickRateInput").value = tickRate;
        document.getElementById("zoomInput").value = zoomLevel;
        
        initGrid();
        drawGrid();
        updateTeamColorsUI();
        alert("Configuração importada com sucesso!");
      } catch (err) {
        alert("Erro ao importar configuração: " + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
});

// Feature 9: Histórico de resultados
document.getElementById("btnShowHistory").addEventListener("click", () => {
  if (gameHistory.length === 0) {
    alert("Nenhum jogo foi finalizado ainda!");
    return;
  }
  
  let historyText = "Histórico de Resultados:\n\n";
  gameHistory.forEach((result, idx) => {
    if (result.winner !== undefined) {
      historyText += `${idx + 1}. Time ${result.winner + 1} venceu (${result.teamCount} times, resolução ${result.resolution})\n`;
    }
  });
  alert(historyText);
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
    teamExpansionSpeeds = teamExpansionSpeeds.slice(0, teamsCount);
  } else {
    while (teamColors.length < teamsCount) {
      teamColors.push(randomColor());
      teamExpansionSpeeds.push(1);
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

// Event listener de resize otimizado (debounce)
let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(drawGrid, 150);
});
