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
    updateMovingLight(time) {
        // Exemplo: Movimento orbital simples no teto do ambiente fechado
        const radius = 5.0;
        const speed = 1.5; // Velocidade do movimento
        
        this.movingLight.position.x = Math.sin(time * speed) * radius;
        this.movingLight.position.y = 4.0; // Altura fixa
        this.movingLight.position.z = Math.cos(time * speed) * radius;
        
        // Cor dinâmica opcional para destacar que ela está se movendo
        this.movingLight.color = new Vetor3(1.0, 0.6, 0.3); // Luz quente
        this.movingLight.intensity = 1.2;
    }

    /**
     * Envia todos os dados de iluminação para os Uniforms do Shader ativo
     * @param {ShaderProgram} shaderProgram 
     */
    sendToShader(shaderProgram) {
        // 1. Enviar luz ambiente
        shaderProgram.setUniformVec3("u_ambientColor", this.ambientColor);

        // 2. Enviar a quantidade de luzes estáticas ativas
        const gl = this.gl;
        const numStaticLoc = shaderProgram.getUniformLocation("u_numStaticLights");
        gl.uniform1i(numStaticLoc, this.staticLights.length);

        // 3. Enviar o array de luzes estáticas para a estrutura correspondente no GLSL
        this.staticLights.forEach((light, index) => {
            shaderProgram.setUniformVec3(`u_staticLights[${index}].position`, light.position);
            shaderProgram.setUniformVec3(`u_staticLights[${index}].color`, light.color);
            
            const intensityLoc = shaderProgram.getUniformLocation(`u_staticLights[${index}].intensity`);
            gl.uniform1f(intensityLoc, light.intensity);
        });

        // 4. Enviar a luz móvel separadamente
        shaderProgram.setUniformVec3("u_movingLight.position", this.movingLight.position);
        shaderProgram.setUniformVec3("u_movingLight.color", this.movingLight.color);
        const movingIntensityLoc = shaderProgram.getUniformLocation("u_movingLight.intensity");
        gl.uniform1f(movingIntensityLoc, this.movingLight.intensity);
    }
}