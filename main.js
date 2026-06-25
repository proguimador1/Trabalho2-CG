import { Matriz4 } from './engine/math/matrix.js';
import { Vetor3 } from './engine/math/vector.js';
import { ShaderProgram } from './engine/renderer/shader-program.js';
import { Mesh } from './engine/renderer/mesh.js';
import { Material } from './engine/renderer/material.js';
import { LightManager } from './engine/light.js';
import { Camera } from './engine/camera.js';
import { TextureManager } from './engine/texture.js';
import { MineMap, BLOCKS } from './engine/map.js';
import { OBJParser } from './objParser.js';
import { CUBE_VERTICES, CUBE_INDICES } from './cube-data.js';

// --- VARIÁVEIS GLOBAIS DE CONTROLE ---
let gl = null;
let shaderProgram = null;
let camera = null;
let lightManager = null;
let textureLoader = null;
let mineMap = null;

// Elementos de Renderização de Blocos
let cubeMesh = null;
const materials = {};
let lastTime = 0;

// Elementos de Renderização do Modelo Customizado (Tocha 3D)
let torchMesh = null;
let torchMaterial = null;

// Elementos de Renderização do Modelo Customizado (Enderman 3D)
let endermanMesh = null;
let endermanMaterial = null;

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
    camera.updateProjection(60, 0.1, 150.0);

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
    lightManager.movingLight.color = new Vetor3(0.6, 0.0, 1.0); 
    lightManager.movingLight.intensity = 0.5;

    // Transfere as tochas calculadas do mapa para o gerenciador de Phong
    mineMap.torchPositions.forEach(torch => {
        lightManager.addStaticLight(
            new Vetor3(torch.position[0], torch.position[1], torch.position[2]),
            new Vetor3(torch.color[0], torch.color[1], torch.color[2]),
            torch.intensity
        );
    });

    // Carregamento de Texturas dos Blocos Cúbicos
    textureLoader = new TextureManager(gl);
    try {
        const [texPedra, texTrilho, texMadeira, texDiamante] = await Promise.all([
            textureLoader.load('assets/textures/pedra_escura.png'),
            textureLoader.load('assets/textures/trilhoEmPedra.png'),
            textureLoader.load('assets/textures/tabua.png'),
            textureLoader.load('assets/textures/diamante.png'),
        ]);

        materials.pedra = new Material(gl, shaderProgram.program);
        materials.pedra.setTexture(texPedra);
        materials.pedra.setLightingProperties(16.0, 0.15);

        materials.trilho = new Material(gl, shaderProgram.program);
        materials.trilho.setTexture(texTrilho);
        materials.trilho.setLightingProperties(128.0, 1.5); 

        materials.madeira = new Material(gl, shaderProgram.program);
        materials.madeira.setTexture(texMadeira);
        materials.madeira.setLightingProperties(8.0, 0.1); 
        
        materials.diamante = new Material(gl, shaderProgram.program);
        materials.diamante.setTexture(texDiamante);
        materials.diamante.setLightingProperties(8.0, 0.1); 

        materials.solidColor = new Material(gl, shaderProgram.program);
        materials.solidColor.setLightingProperties(32.0, 0.0);

    } catch (error) {
        console.error("Falha no carregamento dos ativos de imagem em assets/textures/.", error);
        return;
    }

    // --- CARREGAMENTO DO MODELO .OBJ DA TOCHA VIA OBJPARSER ---
    try {
        console.log("Instanciando e executando o OBJParser para a tocha...");
        const parserInstance = new OBJParser(gl, textureLoader);
        
        const torchData = await parserInstance.loadModel('assets/models/tocha.obj'); 
        
        torchMesh = new Mesh(gl);
        torchMesh.setGeometry(torchData.vertices, torchData.indices);
        
        torchMaterial = new Material(gl, shaderProgram.program);
        if (torchData.texture) {
            torchMaterial.setTexture(torchData.texture);
        }
        
        torchMaterial.setLightingProperties(16.0, 0.3);
        console.log("Modelo e textura original (tocha.png) carregados com sucesso!");
    } catch (error) {
        console.error("Erro ao processar o arquivo .obj da tocha:", error);
    }

    // --- CARREGAMENTO DO MODELO .OBJ DO ENDERMAN VIA OBJPARSER ---
    try {
        console.log("Instanciando e executando o OBJParser para o Enderman...");
        const parserInstance = new OBJParser(gl, textureLoader);
        
        const endermanData = await parserInstance.loadModel('assets/models/enderman.obj'); 
        
        endermanMesh = new Mesh(gl);
        endermanMesh.setGeometry(endermanData.vertices, endermanData.indices);
        
        endermanMaterial = new Material(gl, shaderProgram.program);
        if (endermanData.texture) {
            endermanMaterial.setTexture(endermanData.texture);
        }
        
        endermanMaterial.setLightingProperties(32.0, 0.1); 
        console.log("Modelo e textura do Enderman carregados com sucesso!");
    } catch (error) {
        console.error("Erro ao processar o arquivo .obj do Enderman:", error);
    }

    // Enviar Geometria do Cubo Base para a GPU
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
    const uColorLoc = shaderProgram.getUniformLocation("u_color");
    const uTextureBrightnessLoc = shaderProgram.getUniformLocation("u_textureBrightness");

    const lanternaX = Math.floor(lightManager.movingLight.position.x);
    const lanternaZ = Math.floor(lightManager.movingLight.position.z);
    const lanternaY = 4;

    for (let y = 0; y < mineMap.height; y++) {
        for (let x = 0; x < mineMap.width; x++) {
            for (let z = 0; z < mineMap.depth; z++) {
                
                let blockType = mineMap.getBlock(x, y, z);

                // --- LÓGICA DE INTERCEPTAÇÃO DA LANTERNA ANIMADA ---
                const ehPosicaoDaLanterna = (x === lanternaX && z === lanternaZ && y === lanternaY);
                if (ehPosicaoDaLanterna) {
                    blockType = BLOCKS.SOLID_COLOR_CUBE;
                }

                // --- PRÉ-CÁLCULO DA GEOMETRIA DO ARCO DE MADEIRA ENCOLHIDO ---
                const ehZDaTocha = (z >= 15 && z < 75 && z % 15 === 0);
                const ehPilarParede = ehZDaTocha && (y >= 1 && y <= 4) && (x === 35 || x === 39);
                const ehVigaTeto = ehZDaTocha && (y === 4) && (x >= 35 && x <= 39);
                const ehArcoMadeira = ehPilarParede || ehVigaTeto;

                const ehChaoDoTrilho = (y === 0 && x === 37);

                // Se for ar comum (e não for bloco especial do cenário), pula o desenho
                if (blockType === BLOCKS.AIR && !ehArcoMadeira && !ehPosicaoDaLanterna && !ehChaoDoTrilho) {
                    continue;
                }

                // --- CAMADA 1: RENDERIZAÇÃO DO BLOCO CÚBICO BASE ---
                let modelMatrix = Matriz4.translation(x, y, z);
                cubeMesh.setTransform(modelMatrix);

                if (blockType === BLOCKS.SOLID_COLOR_CUBE) {
                    gl.uniform1i(uUseTextureLoc, 0); 
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, null);
                    
                    if (uColorLoc) gl.uniform4f(uColorLoc, 0.0, 0.0, 0.0, 1.0);
                    if (uTextureBrightnessLoc) gl.uniform1f(uTextureBrightnessLoc, 1.0);
                    
                    materials.solidColor.apply(0);
                    cubeMesh.draw(uModelMatrixLoc);
                } else {
                    gl.uniform1i(uUseTextureLoc, 1); 
                    if (uColorLoc) gl.uniform4f(uColorLoc, 1.0, 1.0, 1.0, 1.0);
                    if (uTextureBrightnessLoc) gl.uniform1f(uTextureBrightnessLoc, 1.0);
                    
                    const alturaParedeSala = (y >= 1 && y <= 4);
                    const ehParedeFundoDiamante = (x === 4) && (z >= 20 && z <= 31) && alturaParedeSala;
                    const ehParedeSulDiamante = (z === 19) && (x >= 5 && x <= 17) && alturaParedeSala;
                    const ehParedeNorteDiamante = (z === 32) && (x >= 5 && x <= 17) && alturaParedeSala;
                    const ehParedeSalaDiamante = ehParedeFundoDiamante || ehParedeSulDiamante || ehParedeNorteDiamante;

                    if (ehChaoDoTrilho) {
                        materials.trilho.apply(0);
                    } else if (ehArcoMadeira) {
                        materials.wood ? materials.wood.apply(0) : materials.madeira.apply(0);
                    } else if (ehParedeSalaDiamante) {
                        if (materials.diamante) materials.diamante.apply(0);
                        else materials.pedra.apply(0);
                    } else {
                        materials.pedra.apply(0);
                    }

                    cubeMesh.draw(uModelMatrixLoc);
                }

                // --- CAMADA 2: INJEÇÃO DA TOCHA 3D DO MODELO OBJ NOS PILARES ---
                if (ehPilarParede && y === 3 && torchMesh && torchMaterial) {
                    let deslocamentoX = (x === 35) ? 0.55 : -0.55;
                    let targetX = x + deslocamentoX;
                    let targetY = 2.0; 
                    let targetZ = z;

                    let torchTranslation = Matriz4.translation(targetX, targetY, targetZ);
                    let torchScale = Matriz4.scale(0.15, 0.15, 0.15);
                    let finalTorchMatrix = torchTranslation.multiply(torchScale);

                    torchMesh.setTransform(finalTorchMatrix);
                    
                    gl.uniform1i(uUseTextureLoc, torchMaterial.texture ? 1 : 0);
                    if (uColorLoc) gl.uniform4f(uColorLoc, 1.0, 1.0, 1.0, 1.0);
                    if (uTextureBrightnessLoc) gl.uniform1f(uTextureBrightnessLoc, 1.8);
                    
                    torchMaterial.apply(0);
                    torchMesh.draw(uModelMatrixLoc);
                }
            }
        }
    }

    if (endermanMesh && endermanMaterial) {
        let endermanX = 63.0; 
        let endermanZ = 66.0;
        let endermanY = 3.5; 
        let escalaMundo = 0.4; 

        let endermanTranslation = Matriz4.translation(endermanX, endermanY, endermanZ);
        let endermanScale = Matriz4.scale(escalaMundo, escalaMundo, escalaMundo); 
        let finalEndermanMatrix = endermanTranslation.multiply(endermanScale);

        endermanMesh.setTransform(finalEndermanMatrix);
        
        gl.uniform1i(uUseTextureLoc, endermanMaterial.texture ? 1 : 0);
        if (uColorLoc) gl.uniform4f(uColorLoc, 1.0, 1.0, 1.0, 1.0);
        if (uTextureBrightnessLoc) gl.uniform1f(uTextureBrightnessLoc, 1.5);
        
        endermanMaterial.apply(0);
        endermanMesh.draw(uModelMatrixLoc);
    }

    requestAnimationFrame(renderLoop);
}

window.onload = init;