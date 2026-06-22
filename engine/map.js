/**
 * Definição dos IDs de blocos disponíveis na mina (Estilo Minecraft)
 */
export const BLOCKS = {
    AIR: 0,
    STONE: 1,
    EARTH: 2,
    IRON: 3,
    GOLD: 4,
    DIAMOND: 5,
    WOOD: 6,
    SOLID_COLOR_CUBE: 7 // Bloco para cumprir o requisito de cor sólida
};

/**
 * Gerenciador de Dados do Cenário da Mina Abandonada.
 * Construído manualmente via código conforme os requisitos do passeio.
 */
export class MineMap {
    constructor() {
        // Matriz 3D: [Camada Y][Linha X][Coluna Z]
        // Criando uma seção de túnel quadrangular onde o espectador caminha pelo "Ar" (0)
        this.data = [
            // Camada 0: O Chão (Y = 0) - Uma plataforma sólida de pedra e terra
            [
                [1, 1, 1, 1, 1, 1, 1],
                [1, 2, 2, 2, 2, 2, 1],
                [1, 2, 2, 2, 2, 2, 1],
                [1, 2, 2, 2, 2, 2, 1],
                [1, 1, 1, 1, 1, 1, 1]
            ],

            // Camada 1: Altura dos Olhos (Y = 1) - Onde a câmera se move.
            // As paredes contêm os minérios e suportes de madeira estruturais.
            [
                [1, 3, 1, 4, 1, 3, 1], // Parede Esquerda com Ferro (3) e Ouro (4)
                [1, 0, 0, 0, 0, 0, 1], // Corredor livre para o passeio virtual
                [6, 0, 0, 0, 0, 0, 6], // Vigas de suporte de Madeira (6) nas laterais
                [1, 0, 0, 0, 0, 0, 1], // Corredor livre para o passeio virtual
                [1, 1, 7, 1, 5, 1, 1]  // Parede Direita com bloco de Cor Sólida (7) e Diamante (5)
            ],

            // Camada 2: O Teto (Y = 2) - Fecha a caverna quadrangular simulando o ambiente fechado
            [
                [1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1]
            ]
        ];

        // Dimensões calculadas dinamicamente com base na matriz acima
        this.height = this.data.length;
        this.width = this.data[0].length;
        this.depth = this.data[0][0].length;
    }

    /**
     * Retorna o tipo de bloco em uma coordenada específica da mina.
     */
    getBlock(x, y, z) {
        if (y >= 0 && y < this.height &&
            x >= 0 && x < this.width &&
            z >= 0 && z < this.depth) {
            return this.data[y][x][z];
        }
        return BLOCKS.AIR; // Retorna ar se estiver fora dos limites da matriz
    }
}