/**
 * Gerencia a compilação, linkagem e ativação de Shaders WebGL2.
 * Facilita a comunicação de dados (Uniforms) entre a CPU e a GPU.
 */
export class ShaderProgram {
    /**
     * @param {WebGL2RenderingContext} gl - O contexto WebGL2.
     */
    constructor(gl) {
        this.gl = gl;
        this.program = null;
        // Cache para evitar chamadas repetidas a gl.getUniformLocation
        this.uniformLocations = new Map();
    }

    /**
     * Inicializa, compila e linka o Vertex e Fragment Shader.
     * @param {string} vertexSource - Código-fonte do Vertex Shader (GLSL).
     * @param {string} fragmentSource - Código-fonte do Fragment Shader (GLSL).
     * @returns {boolean} True se a inicialização foi bem-sucedida.
     */
    init(vertexSource, fragmentSource) {
        const gl = this.gl;

        // 1. Compilar os Shaders individuais
        const vertexShader = this._compileShader(vertexSource, gl.VERTEX_SHADER);
        const fragmentShader = this._compileShader(fragmentSource, gl.FRAGMENT_SHADER);

        if (!vertexShader || !fragmentShader) {
            return false;
        }

        // 2. Criar e linkar o Programa de Shader na GPU
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        // 3. Verificar se a linkagem ocorreu sem erros
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Erro ao linkar o Shader Program:', gl.getProgramInfoLog(this.program));
            gl.deleteProgram(this.program);
            return false;
        }

        // 4. Limpar os objetos de shader individuais, pois já foram linkados ao programa principal
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        return true;
    }

    /**
     * Ativa este programa de shader no pipeline do WebGL para os próximos comandos de desenho.
     */
    use() {
        if (this.program) {
            this.gl.useProgram(this.program);
        }
    }

    /**
     * Retorna a localização de uma variável Uniform, utilizando cache para alta performance.
     * @param {string} name - Nome exato da variável uniform no código GLSL.
     * @returns {WebGLUniformLocation}
     */
    getUniformLocation(name) {
        if (this.uniformLocations.has(name)) {
            return this.uniformLocations.get(name);
        }

        const location = this.gl.getUniformLocation(this.program, name);
        this.uniformLocations.set(name, location);
        return location;
    }

    /**
     * Envia uma Matriz 4x4 (da nossa classe Mat4) para a GPU.
     * @param {string} name - Nome da uniform no shader.
     * @param {Mat4} matrix - Instância da nossa classe Mat4.
     */
    setUniformMat4(name, matrix) {
        const location = this.getUniformLocation(name);
        if (location) {
            this.gl.uniformMatrix4fv(location, false, matrix.elements);
        }
    }

    /**
     * Envia um Vetor 3D (da nossa classe Vec3) para a GPU. Useful para posições de luz e câmera.
     * @param {string} name - Nome da uniform no shader.
     * @param {Vec3} vector - Instância da nossa classe Vec3.
     */
    setUniformVec3(name, vector) {
        const location = this.getUniformLocation(name);
        if (location) {
            this.gl.uniform3f(location, vector.x, vector.y, vector.z);
        }
    }

    /**
     * Método interno para compilar uma string de shader.
     */
    _compileShader(source, type) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        // Verifica erros de compilação na sintaxe do GLSL
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const typeString = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
            console.error(`Erro de compilação no ${typeString} Shader:`, gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    /**
     * Remove o programa da memória de vídeo (VRAM) ao encerrar a aplicação.
     */
    destroy() {
        if (this.program) {
            this.gl.deleteProgram(this.program);
        }
    }
}