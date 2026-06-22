import { Matriz4 } from './engine/math/matrix.js';
import { Vetor3 } from './engine/math/vector.js';
import { ShaderProgram } from './engine/renderer/shader-program.js';
import { Mesh } from './engine/renderer/mesh.js';
import { Material } from './engine/renderer/material.js';
import { LightManager } from './engine/light.js';
import { Camera } from './engine/camera.js';
import { TextureManager } from './engine/texture.js';
import { MineMap, BLOCKS } from './engine/map.js';
import { CUBE_VERTICES, CUBE_INDICES } from './cube-data.js';

// --- VARIÁVEIS GLOBAIS DE CONTROLE ---
let gl = null;
let shaderProgram = null;
let camera = null;
let lightManager = null;
let textureLoader = null;
let mineMap = null;

// Elementos de Renderização
let cubeMesh = null;
const materials = {};

// Controle de tempo para frames dinâmicos (Delta Time)
let lastTime = 0;

/**
 * Carrega o conteúdo textual de arquivos de shader externos.
 * @param {string} url - Caminho para o arquivo .glsl
 * @returns {Promise<string>} O código fonte do shader como string.
 */
async function loadShaderFile(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Falha ao carregar o arquivo de shader: ${url}`);
    }
    return await response.text();
}

/**
 * Inicialização e orquestração do pipeline gráfico do passeio virtual
 */
async function init() {
    // 1. Capturar e Inicializar o Contexto Gráfico WebGL2 (Requisito VII)
    const canvas = document.getElementById("glcanvas");
    if (!canvas) {
        console.error("Canvas com id 'glcanvas' não foi encontrado.");
        return;
    }

    gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("Seu navegador não suporta WebGL2.");
        return;
    }

    // Configurações globais do Pipeline de Processamento da GPU
    gl.enable(gl.DEPTH_TEST); // Ativa o Z-Buffer para oclusão tridimensional correta
    gl.clearColor(0.01, 0.01, 0.03, 1.0); // Fundo escuro simulando o breu da mina

    // 2. Carregar e Compilar os Shaders Físicos Divididos (Vertex e Fragment)
    let vertexSource, fragmentSource;
    try {
        vertexSource = await loadShaderFile('shaders/vertex.glsl');
        fragmentSource = await loadShaderFile('shaders/fragment.glsl');
    } catch (error) {
        console.error("Erro crítico na leitura dos arquivos de shader:", error);
        return;
    }

    shaderProgram = new ShaderProgram(gl);
    if (!shaderProgram.init(vertexSource, fragmentSource)) {
        console.error("Erro na compilação ou vinculação do Shader Program.");
        return;
    }

    // 3. Inicializar a Câmera em Primeira Pessoa (Requisitos b-I e b-II)
    camera = new Camera(canvas);
    camera.moveSpeed = 2.0;
    // Posiciona o observador no ar dentro do corredor livre (X=2, Y=1.2, Z=2)
    camera.position = new Vetor3(2.0, 1.2, 2.0);
    camera.updateProjection(60, 0.1, 100.0);

    // Ajustar o Viewport dinamicamente caso a janela mude de tamanho
    window.addEventListener('resize', () => {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        camera.updateProjection(60, 0.1, 100.0);
    });

    // 4. Instanciar os Dados Lógicos do Mapa da Mina (Estrutura Quadrangular)
    mineMap = new MineMap();

    // 5. Configurar O Gerenciador do Modelo de Reflexão de Phong (Requisito II)
    lightManager = new LightManager(gl);
    lightManager.ambientColor = new Vetor3(0.04, 0.04, 0.06); // Luz ambiente residual

    // Adiciona N fontes de luz fixas (Tochas) mapeadas pelas coordenadas da caverna
    lightManager.addStaticLight(new Vetor3(2.0, 1.8, 1.0), new Vetor3(1.0, 0.5, 0.2), 1.3); // Tocha inicial quente
    lightManager.addStaticLight(new Vetor3(2.0, 1.8, 5.0), new Vetor3(1.0, 0.5, 0.2), 1.3); // Tocha final quente

    // 6. Carregamento de Texturas e Associação aos Materiais (Requisito IV e V)
    textureLoader = new TextureManager(gl);
    try {
        // Carrega apenas a textura de stone disponível para o teste
        const [texStone] = await Promise.all([
            textureLoader.load('assets/textures/stone.jpeg')
        ]);

        // Configuração do Material de Pedra Principal
        materials.stone = new Material(gl, shaderProgram.program);
        materials.stone.setTexture(texStone);
        materials.stone.setLightingProperties(16.0, 0.2); // Pedra fosca

        // Configuração segura (Fallback): Mapeia os outros blocos para a textura de pedra
        // Isso evita erros de "undefined" no laço de repetição do renderLoop
        materials.earth = new Material(gl, shaderProgram.program);
        materials.earth.setTexture(texStone);
        materials.earth.setLightingProperties(8.0, 0.05);

        materials.diamond = new Material(gl, shaderProgram.program);
        materials.diamond.setTexture(texStone);
        materials.diamond.setLightingProperties(128.0, 1.8); // Alto brilho especular

        // Material exclusivo para renderização de cor sólida (Luz móvel e blocos tipo 7)
        materials.solidColor = new Material(gl, shaderProgram.program);
        materials.solidColor.setLightingProperties(32.0, 0.7);

    } catch (error) {
        console.error("Falha no carregamento dos ativos de imagem em assets/textures/.", error);
        return;
    }

    // 7. Enviar a Geometria do Cubo Base para a VRAM da GPU uma única vez (cube-data.js)
    cubeMesh = new Mesh(gl);
    cubeMesh.setGeometry(CUBE_VERTICES, CUBE_INDICES);

    // Iniciar o ciclo ativo do motor de renderização
    lastTime = performance.now();
    requestAnimationFrame(renderLoop);
}

/**
 * Ciclo contínuo de renderização do passeio (Sincronizado com a taxa de atualização da tela)
 */
function renderLoop(currentTime) {
    // Normalização do tempo em segundos e computação do Delta Time
    currentTime *= 0.001;
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    // Limpar buffers da tela antes de redesenhar
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Atualizar posição do espectador (Teclado WASD e visão via Mouse PointerLock)
    camera.update(deltaTime);

    // Atualizar a órbita/trajetória da Única Fonte de Luz Móvel (Requisito II)
    lightManager.updateMovingLight(currentTime);

    // Ativar o Shader Program que foi lido e compilado externamente
    shaderProgram.use();

    // Enviar Uniforms de matrizes da câmera para transformações projetivas globais
    shaderProgram.setUniformMat4("u_viewMatrix", camera.viewMatrix);
    shaderProgram.setUniformMat4("u_projectionMatrix", camera.projectionMatrix);
    shaderProgram.setUniformVec3("u_viewPos", camera.position);

    // Despachar todo o estado de iluminação (Luz ambiente, N estáticas e 1 móvel) para a GPU
    lightManager.sendToShader(shaderProgram);

    // Obter referências de controle e flags internas localizadas nos Shaders
    const uModelMatrixLoc = shaderProgram.getUniformLocation("u_modelMatrix");
    const uUseTextureLoc = shaderProgram.getUniformLocation("u_useTexture");

    // --- PIPELINE DE DESENHO PROCEDURAL DA CAVERNA ---
    for (let y = 0; y < mineMap.height; y++) {
        for (let x = 0; x < mineMap.width; x++) {
            for (let z = 0; z < mineMap.depth; z++) {
                
                const blockType = mineMap.getBlock(x, y, z);

                // Ignora blocos de ar (0) liberando o canal de processamento
                if (blockType === BLOCKS.AIR) continue;

                // 1. Computa a translação do cubo base na coordenada atual da grade
                let modelMatrix = Matriz4.translation(x, y, z);
                cubeMesh.setTransform(modelMatrix);

                // 2. Chaveia o material e liga/desliga o mapeamento de textura no Fragment Shader
                if (blockType === BLOCKS.SOLID_COLOR_CUBE) {
                    gl.uniform1i(uUseTextureLoc, 0); // Comunica ao shader o uso de Cor Sólida (Requisito V)
                    materials.solidColor.apply(0);
                } else {
                    gl.uniform1i(uUseTextureLoc, 1); // Ativa amostragem de Textura (Requisito IV)
                    
                    switch (blockType) {
                        case BLOCKS.STONE:
                            materials.stone.apply(0);
                            break;
                        case BLOCKS.EARTH:
                            materials.earth.apply(0);
                            break;
                        case BLOCKS.DIAMOND:
                            materials.diamond.apply(0);
                            break;
                        default:
                            materials.stone.apply(0);
                    }
                }

                // 3. Renderiza a instância da malha do cubo na GPU
                cubeMesh.draw(uModelMatrixLoc);
            }
        }
    }

    // --- OBJETO ANIMADO POR TRANSFORMAÇÕES GEOMÉTRICAS (Requisito III) ---
    // Desenha uma representação visual (Lanterna flutuante) seguindo as coordenadas da Luz Móvel
    let animMatrix = Matriz4.translation(
        lightManager.movingLight.position.x,
        lightManager.movingLight.position.y,
        lightManager.movingLight.position.z
    );
    // Multiplica as matrizes da nossa classe math gerando uma rotação contínua sobre o próprio eixo
    animMatrix = animMatrix.multiply(Matriz4.rotationY(currentTime * 3.0));

    // Configura o objeto com comportamento de cor sólida (sem textura)
    gl.uniform1i(uUseTextureLoc, 0);
    materials.solidColor.apply(0);

    cubeMesh.setTransform(animMatrix);
    cubeMesh.draw(uModelMatrixLoc);

    // Solicitar o reprocessamento de tela sincronizado no próximo frame
    requestAnimationFrame(renderLoop);
}

// Inicializa a aplicação gráfica assim que o escopo global DOM terminar o carregamento
window.onload = init;