import { Vetor3 } from './math/vector.js';

/**
 * Representa uma fonte de luz pontual (Point Light)
 */
export class PointLight {
    constructor(position = new Vetor3(), color = new Vetor3(1, 1, 1), intensity = 1.0) {
        this.position = position;
        this.color = color;
        this.intensity = intensity;
    }
}

/**
 * Gerenciador do Sistema de Iluminação do Passeio Virtual
 */
export class LightManager {
    /**
     * @param {WebGL2RenderingContext} gl 
     */
    constructor(gl) {
        this.gl = gl;
        this.staticLights = []; // Array de PointLight fixas
        this.movingLight = new PointLight(); // A única luz móvel
        
        // Configurações globais da luz ambiente do ambiente fechado
        this.ambientColor = new Vetor3(0.1, 0.1, 0.1); 
    }

    /**
     * Adiciona uma luz estática ao cenário
     */
    addStaticLight(position, color, intensity) {
        this.staticLights.push(new PointLight(position, color, intensity));
    }

    /**
     * Atualiza a posição da luz móvel com base no tempo decorrido do passeio
     * @param {number} time - Tempo em segundos (gerado no loop principal)
     */
    updateMovingLight(currentTime) {
        // Parâmetros calculados para a última sala à direita
        const centroX = 63.0;
        const centroZ = 66.0;
        const alturaY = 4.5;       // Altura intermediária para a luz flutuar na sala de altura 7
        const raioOrbita = 4.0;    // Mantém a luz a 2 blocos de distância das paredes de 12x12
        const velocidadeAngular = 1.5; // Velocidade da rotação (mude o multiplicador para acelerar/desacelerar)

        // Equações paramétricas do círculo: X = cx + R * cos(t), Z = cz + R * sin(t)
        const novaPosicaoX = centroX + raioOrbita * Math.cos(currentTime * velocidadeAngular);
        const novaPosicaoZ = centroZ + raioOrbita * Math.sin(currentTime * velocidadeAngular);

        // Atualiza a posição tridimensional no objeto de luz que o shader consome
        this.movingLight.position = new Vetor3(novaPosicaoX, alturaY, novaPosicaoZ);
    }

    /**
     * Envia todos os dados de iluminação para os Uniforms do Shader ativo
     * @param {ShaderProgram} shaderProgram 
     */
    sendToShader(shaderProgram) {
        // Enviar luz ambiente
        shaderProgram.setUniformVec3("u_ambientColor", this.ambientColor);

        // Enviar a quantidade de luzes estáticas ativas
        const gl = this.gl;
        const numStaticLoc = shaderProgram.getUniformLocation("u_numStaticLights");
        gl.uniform1i(numStaticLoc, this.staticLights.length);

        // Enviar o array de luzes estáticas para a estrutura correspondente no GLSL
        this.staticLights.forEach((light, index) => {
            shaderProgram.setUniformVec3(`u_staticLights[${index}].position`, light.position);
            shaderProgram.setUniformVec3(`u_staticLights[${index}].color`, light.color);
            
            const intensityLoc = shaderProgram.getUniformLocation(`u_staticLights[${index}].intensity`);
            gl.uniform1f(intensityLoc, light.intensity);
        });

        // Enviar a luz móvel separadamente
        shaderProgram.setUniformVec3("u_movingLight.position", this.movingLight.position);
        shaderProgram.setUniformVec3("u_movingLight.color", this.movingLight.color);
        const movingIntensityLoc = shaderProgram.getUniformLocation("u_movingLight.intensity");
        gl.uniform1f(movingIntensityLoc, this.movingLight.intensity);
    }
}