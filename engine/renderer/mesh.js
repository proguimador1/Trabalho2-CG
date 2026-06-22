import { GeometryBuffer } from './buffer.js';
import { Mattriz4 } from '../math/matrix.js';

/**
 * Representa um objeto 3D renderizável no cenário do passeio virtual.
 * Encapsula a geometria (buffers) e sua posição/orientação no mundo.
 */
export class Mesh {
    /**
     * @param {WebGL2RenderingContext} gl - O contexto WebGL2.
     */
    constructor(gl) {
        this.gl = gl;
        this.buffer = new GeometryBuffer(gl);
        
        // Cada Mesh tem sua própria Matriz de Modelo (Model Matrix)
        // Inicializada como identidade (posição 0,0,0, sem rotação ou escala)
        this.modelMatrix = Mat4.identity();
    }

    /**
     * Carrega os dados geométricos brutos para o buffer interno da GPU.
     * @param {Float32Array} vertices - Dados intercalados [X,Y,Z, Nx,Ny,Nz, U,V]
     * @param {Uint16Array|Uint32Array} indices - Índices dos triângulos
     */
    setGeometry(vertices, indices) {
        this.buffer.init(vertices, indices);
    }

    /**
     * Define a transformação espacial desta malha no mundo 3D.
     * Como o cenário é estático, você chamará isso apenas uma vez por objeto no setup.
     * @param {Mat4} matrix - A Matriz de Modelo pré-calculada
     */
    setTransform(matrix) {
        this.modelMatrix = matrix;
    }

    /**
     * Renderiza a malha na tela.
     * @param {WebGLUniformLocation} modelMatrixLocation - A localização do uniform 'u_modelMatrix' no shader atual.
     */
    draw(modelMatrixLocation) {
        // 1. Envia a matriz de transformação deste objeto específico para a GPU
        this.gl.uniformMatrix4fv(modelMatrixLocation, false, this.modelMatrix.elements);

        // 2. Ordena que o buffer envie o comando de desenho (drawElements)
        this.buffer.draw();
    }

    /**
     * Libera os recursos de GPU associados a esta malha quando o passeio terminar.
     */
    destroy() {
        if (this.buffer) {
            this.buffer.cleanUp();
        }
    }
}