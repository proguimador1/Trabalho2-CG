export const BLOCKS = {
    AIR: 0,
    STONE: 1,
    SOLID_COLOR_CUBE: 7
};

export class MineMap {
    constructor() {
        // Dimensões baseadas nos requisitos:
        // Comprimento total do corredor principal (Z) = 75
        // Largura necessária para acomodar as ramificações de 30 unidades para a esquerda/direita (X) = ~75
        // Altura (Y) = 4
        this.width = 75;  // Eixo X (Esquerda / Direita)
        this.height = 4;  // Eixo Y (Chão ao Teto)
        this.depth = 75;  // Eixo Z (Profundidade do corredor principal)

        // Inicializa o mundo inteiramente preenchido com blocos de Pedra
        this.data = Array(this.height).fill(null).map(() => 
            Array(this.width).fill(null).map(() => 
                Array(this.depth).fill(BLOCKS.STONE)
            )
        );

        this.generateMapFromBlueprint();
    }

    /**
     * Escava os corredores e salas trocando STONE por AIR nas camadas centrais (Y=1 e Y=2)
     * Mantém Y=0 (Chão) e Y=3 (Teto) totalmente fechados com PEDRA.
     */
    generateMapFromBlueprint() {
        const corredorX = Math.floor(this.width / 2); // Linha central do corredor principal (X = 37)

        // 1. ESCALONAR O CORREDOR PRINCIPAL (Vertical na Imagem)
        // Comprimento: 75 unidades (Z de 0 a 74), Largura: 5 unidades
        this.excavateTunnel(corredorX - 2, corredorX + 2, 0, 74);

        // 2. RAMIFICAÇÃO ESQUERDA INFERIOR
        // Ramificação de 30 unidades de comprimento para a esquerda. Termina em uma sala quadrada de 12x12.
        const zRamifBaixa = 25;
        // Escava o túnel da esquerda parando um pouco antes (X = 5)
        this.excavateTunnel(5, corredorX - 3, zRamifBaixa - 2, zRamifBaixa + 2); 
        // Escava a sala de 12 unidades adjacente (X de 5 a 17) para não estourar a borda 0
        this.excavateRoom(5, 17, zRamifBaixa - 5, zRamifBaixa + 6);

        // 3. RAMIFICAÇÃO ESQUERDA SUPERIOR (Curva diagonal que vira uma sala redonda/quadrada)
        // Aproximação matemática da curva da planta da imagem:
        const zRamifAltaEsq = 50;
        // Segmento horizontal saindo do corredor principal
        this.excavateTunnel(corredorX - 15, corredorX - 3, zRamifAltaEsq - 2, zRamifAltaEsq + 2);
        // Segmento inclinado/curvo simulado por escavação adjacente
        this.excavateTunnel(corredorX - 25, corredorX - 14, zRamifAltaEsq + 5, zRamifAltaEsq + 15);
        // Grande Sala Circular/Quadrada de Diâmetro ~12 no topo esquerdo
        this.excavateRoom(corredorX - 32, corredorX - 20, zRamifAltaEsq + 12, zRamifAltaEsq + 24);

        // 4. RAMIFICAÇÃO DIREITA SUPERIOR (Sobe em diagonal e termina em uma sala retangular)
        const zRamifAltaDir = 50;
        // Escavação em escada/diagonal simulando a subida para a direita na planta
        for (let i = 0; i < 20; i++) {
            let offsetX = corredorX + i;
            let offsetZ = zRamifAltaDir + Math.floor(i * 0.7);
            this.excavateTunnel(offsetX, offsetX + 4, offsetZ - 2, offsetZ + 2);
        }
        // Sala Final da ramificação direita de 12 unidades de largura
        this.excavateRoom(corredorX + 20, corredorX + 32, zRamifAltaDir + 10, zRamifAltaDir + 22);
    }

    excavateTunnel(startX, endX, startZ, endZ) {
    // Escava a altura interna (Y=1 e Y=2)
    for (let y = 1; y <= 2; y++) {
        for (let x = startX; x <= endX; x++) {
            for (let z = startZ; z <= endZ; z++) {
                
                // Se a coordenada for a borda extrema do mapa, NÃO escava
                if (x === 0 || x === this.width - 1 || z === 0 || z === this.depth - 1) {
                    continue; 
                }

                if (this.isValid(x, y, z)) {
                    this.data[y][x][z] = BLOCKS.AIR;
                }
            }
        }
    }
}

    excavateRoom(startX, endX, startZ, endZ) {
        this.excavateTunnel(startX, endX, startZ, endZ);
    }

    isValid(x, y, z) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height && z >= 0 && z < this.depth;
    }

    getBlock(x, y, z) {
        if (this.isValid(x, y, z)) {
            return this.data[y][x][z];
        }
        return BLOCKS.STONE; // Tudo fora dos limites é rocha sólida
    }
}