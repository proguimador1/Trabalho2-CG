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
let lastTime = 0;

/**
 * Carrega o conteúdo textual de arquivos de shader externos.
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

    // Configuração responsiva imediata para cobrir todo o Canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.enable(gl.DEPTH_TEST); 
    gl.clearColor(0.01, 0.01, 0.02, 1.0); // Breu total na mina

    // Carregar e Compilar os Shaders Externos
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

    // Instanciar o Mapa Lógico Gerado pela Planta da Foto
    mineMap = new MineMap();

    // Inicializar a Câmera em Primeira Pessoa (Colocada na entrada do Corredor Central: X=37, Z=2)
    camera = new Camera(canvas);
    camera.moveSpeed = 2.0;
    camera.position = new Vetor3(37.0, 1.5, 2.0); 
    camera.updateProjection(60, 0.1, 150.0); // Far plane estendido para 150 devido ao tamanho (75)

    window.addEventListener('resize', () => {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        camera.updateProjection(60, 0.1, 150.0);
    });

    // Configurar Iluminação (Modelo de Phong)
    lightManager = new LightManager(gl);
    lightManager.ambientColor = new Vetor3(0.05, 0.05, 0.07); 

    // Configuração da luz móvel da sala do Enderman
    lightManager.movingLight.color = new Vetor3(0.6, 0.0, 1.0); // Roxo bem destacado (R, G, B)
    lightManager.movingLight.intensity = 0.5;

    // Transfere as tochas calculadas do mapa para o gerenciador de Phong do light.js
    mineMap.torchPositions.forEach(torch => {
        lightManager.addStaticLight(
            new Vetor3(torch.position[0], torch.position[1], torch.position[2]),
            new Vetor3(torch.color[0], torch.color[1], torch.color[2]),
            torch.intensity
        );
    });

    // Carregamento de Texturas
    textureLoader = new TextureManager(gl);
    try {
        const [texStone] = await Promise.all([
            textureLoader.load('assets/textures/stone.jpeg')
        ]);

        // Define a Textura de Pedra para todos os materiais conforme solicitado
        materials.stone = new Material(gl, shaderProgram.program);
        materials.stone.setTexture(texStone);
        materials.stone.setLightingProperties(16.0, 0.15);

        materials.earth = new Material(gl, shaderProgram.program);
        materials.earth.setTexture(texStone);
        materials.earth.setLightingProperties(16.0, 0.15);

        materials.diamond = new Material(gl, shaderProgram.program);
        materials.diamond.setTexture(texStone);
        materials.diamond.setLightingProperties(16.0, 0.15);

        materials.solidColor = new Material(gl, shaderProgram.program);
        materials.solidColor.setLightingProperties(32.0, 0.8);

    } catch (error) {
        console.error("Falha no carregamento dos ativos de imagem em assets/textures/.", error);
        return;
    }

    // Enviar Geometria do Cubo para a GPU
    cubeMesh = new Mesh(gl);
    cubeMesh.setGeometry(CUBE_VERTICES, CUBE_INDICES);

    lastTime = performance.now();
    requestAnimationFrame(renderLoop);
}

/**
 * Ciclo ativo de Renderização por Varredura 3D
 */
function renderLoop(currentTime) {
    currentTime *= 0.001;
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    camera.update(deltaTime);
    lightManager.updateMovingLight(currentTime);

    shaderProgram.use();

    shaderProgram.setUniformMat4("u_viewMatrix", camera.viewMatrix);
    shaderProgram.setUniformMat4("u_projectionMatrix", camera.projectionMatrix);
    shaderProgram.setUniformVec3("u_viewPos", camera.position);

    lightManager.sendToShader(shaderProgram);

    const uModelMatrixLoc = shaderProgram.getUniformLocation("u_modelMatrix");
    const uUseTextureLoc = shaderProgram.getUniformLocation("u_useTexture");

    // --- PIPELINE DE DESENHO DA CAVERNA BASEADA NA PLANTA ---
    for (let y = 0; y < mineMap.height; y++) {
        for (let x = 0; x < mineMap.width; x++) {
            for (let z = 0; z < mineMap.depth; z++) {
                
                const blockType = mineMap.getBlock(x, y, z);

                // Onde foi escavado AR (0), não desenha nada, criando o espaço livre do túnel
                if (blockType === BLOCKS.AIR) continue;

                // Constrói a transformação do bloco de pedra
                let modelMatrix = Matriz4.translation(x, y, z);
                cubeMesh.setTransform(modelMatrix);

                if (blockType === BLOCKS.SOLID_COLOR_CUBE) {
                    gl.uniform1i(uUseTextureLoc, 0);
                    materials.solidColor.apply(0);
                } else {
                    gl.uniform1i(uUseTextureLoc, 1); // Força Textura Ativa
                    
                    switch (blockType) {
                        case BLOCKS.STONE:
                        default:
                            materials.stone.apply(0);
                    }
                }

                cubeMesh.draw(uModelMatrixLoc);
            }
        }
    }

    requestAnimationFrame(renderLoop);
}

window.onload = init;