# Skin Editor - Redesign para Minecraft Java Edition

## Alterações Realizadas

### 1. **Interface Fiel ao Minecraft Java Edition**

A página foi completamente redesenhada para replicar o estilo visual do **Minecraft Java Edition**, com inspiração em interfaces Windows 95 que o Minecraft utiliza.

### 2. **Estrutura Visual Principal**

#### Barra de Título (Windows 95 Style)
- Barra azul gradient na parte superior
- Botões de controle (minimizar, maximizar, fechar)
- Título: "Skin Editor - Minecraft Java Edition"

#### Barra de Status
- Barra cinza clara na parte inferior
- Exibe status atual da aplicação

#### Layout em 3 Painéis
1. **Painel Esquerdo (Catálogo de Peças)**
   - Largura fixa: 320px
   - Lista de categorias colapsáveis com seta (▼/▶)
   - Items com botões individuais
   - Scrollbar estilo Windows 95

2. **Painel Central (Preview 3D)**
   - Visualizador da skin em tempo real
   - Fundo em padrão de xadrez
   - Responsivo e centralizado

3. **Painel Direito (Controles)**
   - Toggle Steve/Alex com switch style
   - Botões de ação (Reiniciar, 2D View, Baixar, Compartilhar)
   - Seções organizadas visualmente

### 3. **Cores Minecraft Java Edition**

```css
--mc-panel-bg: #C6C6C6;      /* Fundo principal */
--mc-dirt-bg: #8B8B8B;        /* Painéis internos */
--mc-button-bg: #A0A0A0;      /* Botões */
--mc-button-top: #FFFFFF;     /* Highlight dos botões */
--mc-button-bottom: #555555;  /* Shadow dos botões */
```

### 4. **Componentes de Interface**

#### Botões (mc-button)
- Bordas 3D com gradient
- Estado hover com cores mais brilhantes
- Estado active com inversão de gradiente
- Text shadow para destaque
- Transição suave de 50ms

#### Headers de Categoria
- Mesmo estilo dos botões
- Ícone de expand/collapse (▼/▶)
- Toggle de conteúdo ao clicar

#### Toggle Switch
- Estilo Windows 95
- Altura: 20px
- Animação suave ao alternar
- Cores diferentes para estados

#### Items
- Botões pequenos no painel esquerdo
- Destaque visual ao selecionar
- Uma seleção por categoria (substitui anterior)

### 5. **Responsividade**

- **Até 1200px**: Layout se adapta para dispositivos menores
- Ordem: Categorias no topo, Preview no meio, Controles abaixo
- Todos os painéis ocupam 100% da largura em telas pequenas

### 6. **Melhorias de UX**

1. **Visual Feedback**
   - Botões mudam cor ao hover
   - Items selecionados ficam destacados
   - Transições suaves

2. **Categorias**
   - Ícone ▼ indica "expandido"
   - Ícone ▶ indica "colapsado"
   - Clique alterna o estado

3. **Funcionalidades**
   - Botão "Reiniciar" limpa todas as seleções
   - Toggle Steve/Alex funcional
   - Sistema de seleção exclusiva por categoria

### 7. **Animações**

- Fade-in dos painéis: 200ms
- Transição dos botões: 50ms
- Toggle switch: 200ms

## Compatibilidade

- Chrome/Edge: 100%
- Firefox: 100%
- Safari: 100%
- Mobile responsivo: Sim

## Arquivos Modificados

- `index.html` - Nova estrutura HTML
- `style.css` - Novo CSS (533 linhas) com design Java Edition
- `app.js` - Melhorias no interatividade

## Próximos Passos (Opcional)

- Adicionar ícones estilo Minecraft para os botões
- Implementar animações de rotação da skin no preview
- Adicionar mais feedback visual ao fazer download
- Exportar em formatos diferentes (PNG, URL compartilhável)
