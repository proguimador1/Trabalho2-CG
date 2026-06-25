/**
 * Gerenciador de Contexto WebGL2.
 * Encapsula a inicialização, estados gráficos globais e redimensionamento automático.
 */
export class GLContext {
    /**
     * @param {string} canvasId - O ID do elemento <canvas> no HTML.
     */
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Elemento canvas com id '${canvasId}' não foi encontrado.`);
        }
        this.gl = null;
    }

    /**
     * Inicializa o contexto WebGL2 e configura os estados fundamentais de renderização.
     * @returns {WebGL2RenderingContext}
     */
    init() {
        this.gl = this.canvas.getContext('webgl2', {
            antialias: true,             // Ativa serrilhado suave básico nas bordas
            powerPreference: "high-performance" // Solicita GPU dedicada se disponível
        });

        if (!this.gl) {
            throw new Error("WebGL2 não é suportado pelo seu navegador.");
        }

        // Configurações Globais de Renderização 3D
        const gl = this.gl;
        
        // 1. Teste de Profundidade: Garante que paredes da frente ocultem o que está atrás
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        // 2. Culling (Descarte de Faces): Otimização crucial. Não renderiza o interior de paredes ocas
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        // 3. Cor padrão para limpar a tela a cada frame (Cor de fundo escura para o ambiente)
        gl.clearColor(0.02, 0.02, 0.02, 1.0);

        // Configurar ajuste inicial de tamanho
        this.resize();

        return this.gl;
    }

    /**
     * Ajusta a resolução interna do buffer WebGL para bater exatamente com o CSS do navegador.
     * Evita imagens esticadas ou borradas em telas de alta densidade (Retina/4K).
     * @param {function} onResizeCallback - Callback opcional para atualizar matrizes de projeção de câmeras.
     */
    resize(onResizeCallback) {
        const displayWidth  = this.canvas.clientWidth;
        const displayHeight = this.canvas.clientHeight;

        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width  = displayWidth;
            this.canvas.height = displayHeight;
            
            // Atualiza a área de renderização do WebGL para os novos tamanhos
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

            // Dispara a notificação para a câmera atualizar sua matriz de Projeção Perspectiva
            if (onResizeCallback) {
                onResizeCallback();
            }
        }
    }

    /**
     * Limpa os buffers de cor e profundidade para preparar a tela para o próximo frame.
     */
    clear() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }
}