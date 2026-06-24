/**
 * Gerenciador de Buffers WebGL
 * Otimizado para renderização estática de alta performance para o ambiente do passeio.
 */
export class GeometryBuffer {
    /**
     * @param {WebGL2RenderingContext} gl - O contexto WebGL2 da aplicação.
     */
    constructor(gl) {
        this.gl = gl;
        this.vao = null;
        this.vbo = null;
        this.ebo = null;
        this.indexCount = 0;
    }

    /**
     * Inicializa os buffers na GPU com os dados geométricos do cenário.
     * @param {Float32Array} interleavedData - Array contendo Vértices, Normais e UVs combinados.
     * @param {Uint16Array|Uint32Array} indices - Array de índices para desenho (Triângulos).
     */
    init(interleavedData, indices) {
        const gl = this.gl;
        this.indexCount = indices.length;

        // 1. Criar e vincular o Vertex Array Object (VAO)
        // O VAO grava todo o estado de configuração dos atributos que faremos a seguir.
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // 2. Criar e configurar o Vertex Buffer Object (VBO)
        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        // Usamos STATIC_DRAW porque o cenário é fixo do início ao fim do passeio
        gl.bufferData(gl.ARRAY_BUFFER, interleavedData, gl.STATIC_DRAW);

        // 3. Criar e configurar o Element Buffer Object (EBO / Index Buffer)
        this.ebo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        // 4. Definir o layout dos dados (Stride e Offsets)
        // Assumindo o layout padrão de alta performance: Posição (3f), Normal (3f), Coordenada UV (2f)
        // Total por vértice = 8 floats * 4 bytes = 32 bytes
        const STRIDE = 8 * Float32Array.BYTES_PER_ELEMENT; 

        // Atributo 0: Posição (X, Y, Z)
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);

        // Atributo 1: Normais (Nx, Ny, Nz) -> Crucial para as luzes estáticas e móvel
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, STRIDE, 3 * Float32Array.BYTES_PER_ELEMENT);

        // Atributo 2: Textura (U, V) -> Para o mapeamento de paredes, piso, etc.
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, STRIDE, 6 * Float32Array.BYTES_PER_ELEMENT);

        // Limpar os binds para evitar modificações acidentais no estado global do WebGL
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    /**
     * Vincula o VAO para preparar a GPU para desenhar esta geometria.
     */
    bind() {
        this.gl.bindVertexArray(this.vao);
    }

    /**
     * Desvincula o VAO atual.
     */
    unbind() {
        this.gl.bindVertexArray(null);
    }

    /**
     * Executa o comando de desenho na GPU.
     * Como usamos EBO, o comando correto é o drawElements.
     */
    draw() {
        const gl = this.gl;
        this.bind();
        
        // Verifica se os índices são de 16-bit ou 32-bit para passar a flag correta à GPU
        const indexType = this.indexCount > 65535 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
        
        gl.drawElements(gl.TRIANGLES, this.indexCount, indexType, 0);
        
        this.unbind();
    }

    /**
     * Libera a memória de vídeo (VRAM) da GPU quando o passeio terminar.
     * Essencial para boa educação de memória no navegador.
     */
    cleanUp() {
        const gl = this.gl;
        if (this.vbo) gl.deleteBuffer(this.vbo);
        if (this.ebo) gl.deleteBuffer(this.ebo);
        if (this.vao) gl.deleteVertexArray(this.vao);
    }
}