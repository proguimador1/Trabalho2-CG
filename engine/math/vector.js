/**
 * Biblioteca customizada de Álgebra Linear - Vetores 3D
 * Focada nas operações essenciais para o Passeio Virtual.
 */
export class Vetor3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    // Retorna uma cópia do vetor
    clone() {
        return new Vetor3(this.x, this.y, this.z);
    }

    // Adição de vetores (ex: mover câmera somando vetor velocidade)
    add(v) {
        return new Vetor3(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    // Subtração de vetores (ex: vetor direção do ponto A ao ponto B)
    subtract(v) {
        return new Vetor3(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    // Multiplicação por escalar (ex: aplicar velocidade/tempo ao vetor direção)
    scale(s) {
        return new Vetor3(this.x * s, this.y * s, this.z * s);
    }

    // Comprimento/Magnitude do vetor
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    // Normaliza o vetor (transforma em vetor unitário com comprimento = 1)
    // Essencial para vetores de direção de câmera e cálculo de luz nos shaders
    normalize() {
        const len = this.length();
        if (len > 0) {
            return new Vetor3(this.x / len, this.y / len, this.z / len);
        }
        return new Vetor3();
    }

    // Produto Escalar (Dot Product): retorna um número.
    // Usado para calcular ângulos entre a luz e a normal da parede
    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    // Produto Vetorial (Cross Product): retorna um vetor perpendicular a ambos.
    // Crucial para descobrir o vetor "Direita" da câmera a partir do "Olhar" e do "Cima"
    cross(v) {
        return new Vetor3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    }
}