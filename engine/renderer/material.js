/**
 * Gerencia as propriedades visuais e de iluminação de uma superfície.
 * Conecta texturas e parâmetros de reflexão de luz aos Uniforms do Shader.
 */
export class Material {
    /**
     * @param {WebGL2RenderingContext} gl - O contexto WebGL2.
     * @param {WebGLProgram} shaderProgram - O programa de shader que este material utiliza.
     */
    constructor(gl, shaderProgram) {
        this.gl = gl;
        this.shaderProgram = shaderProgram;
        
        // Propriedades padrão do material
        this.texture = null; // Instância gerenciada pelo seu engine/texture.js
        this.shininess = 32.0; // Expoente de brilho especular (Phong)
        this.specularStrength = 0.5; // Intensidade do brilho
        
        // Cache das localizações dos Uniforms para ganho de performance no loop
        this.uniformLocations = {
            diffuseMap: gl.getUniformLocation(shaderProgram, "u_diffuseMap"),
            shininess: gl.getUniformLocation(shaderProgram, "u_material.shininess"),
            specularStrength: gl.getUniformLocation(shaderProgram, "u_material.specularStrength")
        };
    }

    /**
     * Define a textura principal do material.
     * @param {WebGLTexture} webglTexture - A textura WebGL já carregada e configurada.
     */
    setTexture(webglTexture) {
        this.texture = webglTexture;
    }

    /**
     * Configura as propriedades de reflexão de luz para o modelo de iluminação.
     * @param {number} shininess - O quão concentrado é o brilho (valores maiores = mais polido).
     * @param {number} strength - Intensidade do brilho especular (0.0 a 1.0).
     */
    setLightingProperties(shininess, strength) {
        this.shininess = shininess;
        this.specularStrength = strength;
    }

    /**
     * Vincula a textura e envia as propriedades do material para a GPU antes do desenho.
     * @param {number} textureUnit - A unidade de textura do WebGL a ser usada (padrão: 0).
     */
    apply(textureUnit = 0) {
        const gl = this.gl;

        // 1. Configurar e ativar a textura do ambiente no slot correto (ex: gl.TEXTURE0)
        if (this.texture) {
            gl.activeTexture(gl.TEXTURE0 + textureUnit);
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            // Informa ao shader em qual slot de textura procurar o mapa difuso
            gl.uniform1i(this.uniformLocations.diffuseMap, textureUnit);
        }

        // 2. Enviar parâmetros que dizem à GPU como reagir às luzes estáticas e móvel
        if (this.uniformLocations.shininess) {
            gl.uniform1f(this.uniformLocations.shininess, this.shininess);
        }
        if (this.uniformLocations.specularStrength) {
            gl.uniform1f(this.uniformLocations.specularStrength, this.specularStrength);
        }
    }
}