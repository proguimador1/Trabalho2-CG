/**
 * Biblioteca customizada de Álgebra Linear - Matrizes 4x4 (Column-Major)
 * Focada em projeção perspectiva, câmera LookAt e transformações espaciais.
 */
export class Matriz4 {
    constructor() {
        // Inicializa como uma matriz identidade por padrão
        this.elements = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    /**
     * Cria uma matriz identidade pura
     */
    static identity() {
        return new Matriz4();
    }

    /**
     * Multiplicação de duas matrizes 4x4 (A * B)
     */
    multiply(matrixB) {
        const A = this.elements;
        const B = matrixB.elements;
        const out = new Matriz4();
        const C = out.elements;

        for (let i = 0; i < 4; i++) {
            const ai0 = A[i], ai1 = A[i + 4], ai2 = A[i + 8], ai3 = A[i + 12];
            C[i]      = ai0 * B[0]  + ai1 * B[1]  + ai2 * B[2]  + ai3 * B[3];
            C[i + 4]  = ai0 * B[4]  + ai1 * B[5]  + ai2 * B[6]  + ai3 * B[7];
            C[i + 8]  = ai0 * B[8]  + ai1 * B[9]  + ai2 * B[10] + ai3 * B[11];
            C[i + 12] = ai0 * B[12] + ai1 * B[13] + ai2 * B[14] + ai3 * B[15];
        }
        return out;
    }

    /**
     * Matriz de Translação
     * Usada para posicionar a luz móvel ou objetos estáticos no cenário
     */
    static translation(x, y, z) {
        const mat = new Matriz4();
        mat.elements[12] = x;
        mat.elements[13] = y;
        mat.elements[14] = z;
        return mat;
    }

    /**
     * Matriz de Escala
     */
    static scale(sx, sy, sz) {
        const mat = new Matriz4();
        mat.elements[0] = sx;  
        mat.elements[5] = sy;  
        mat.elements[10] = sz; 
        mat.elements[15] = 1.0;
        return mat;
    }

    /**
     * Matriz de Rotação no eixo Y (comum para girar a câmera para os lados)
     */
    static rotationY(rad) {
        const mat = new Matriz4();
        const c = Math.cos(rad);
        const s = Math.sin(rad);

        mat.elements[0] = c;
        mat.elements[2] = -s;
        mat.elements[8] = s;
        mat.elements[10] = c;
        return mat;
    }

    /**
     * Matriz de Rotação no eixo X (comum para olhar para cima e para baixo)
     */
    static rotationX(rad) {
        const mat = new Matriz4();
        const c = Math.cos(rad);
        const s = Math.sin(rad);

        mat.elements[5] = c;
        mat.elements[6] = s;
        mat.elements[9] = -s;
        mat.elements[10] = c;
        return mat;
    }

    /**
     * Matriz de Projeção Perspectiva
     * Cria a ilusão de profundidade tridimensional no canvas 2D.
     */
    static perspective(fovRad, aspect, near, far) {
        const mat = new Matriz4();
        const f = 1.0 / Math.tan(fovRad / 2);
        const rangeInv = 1.0 / (near - far);

        mat.elements[0] = f / aspect;
        mat.elements[5] = f;
        mat.elements[10] = (near + far) * rangeInv;
        mat.elements[11] = -1;
        mat.elements[14] = (2 * near * far) * rangeInv;
        mat.elements[15] = 0; // Remove o comportamento ortográfico w=1
        return mat;
    }

    /**
     * Matriz LookAt (View Matrix)
     * Transforma o mundo a partir da posição da câmera, ponto alvo e vetor "para cima".
     * Essencial para o cálculo de movimentação do observador no passeio virtual.
     */
    static lookAt(eye, target, up) {
        // Calcula o vetor Z da câmera (Frente invertido no WebGL)
        const zAxis = eye.subtract(target).normalize();
        // Calcula o vetor X da câmera (Direita)
        const xAxis = up.cross(zAxis).normalize();
        // Recalcula o vetor Y da câmera (Cima real)
        const yAxis = zAxis.cross(xAxis).normalize();

        const mat = new Matriz4();
        const m = mat.elements;

        // Orientação (Matriz de Rotação Inversa)
        m[0] = xAxis.x;  m[4] = xAxis.y;  m[8] = xAxis.z;
        m[1] = yAxis.x;  m[5] = yAxis.y;  m[9] = yAxis.z;
        m[2] = zAxis.x;  m[6] = zAxis.y;  m[10] = zAxis.z;

        // Posição (Translação Inversa embutida via produto escalar)
        m[12] = -xAxis.dot(eye);
        m[13] = -yAxis.dot(eye);
        m[14] = -zAxis.dot(eye);

        return mat;
    }
}