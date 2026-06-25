/**
 * Classe para processar ficheiros .obj e .mtl no passeio virtual cúbico.
 * Organiza e desintercala os dados geométricos no formato exato esperado pela classe Mesh.
 */
export class OBJParser {
    /**
     * @param {WebGL2RenderingContext} gl - Contexto WebGL2.
     * @param {TextureManager} textureLoader - O gestor de texturas do motor.
     */
    constructor(gl, textureLoader) {
        this.gl = gl;
        this.textureLoader = textureLoader;
    }

    /**
     * Carrega o modelo .obj e resolve o seu mapa de textura difusa associado através do .mtl.
     * @param {string} objUrl - Caminho do ficheiro .obj
     */
    async loadModel(objUrl) {
        const response = await fetch(objUrl);
        if (!response.ok) throw new Error(`Falha ao carregar o OBJ: ${objUrl}`);
        const objText = await response.text();

        const baseFolder = objUrl.substring(0, objUrl.lastIndexOf('/') + 1);
        let texture = null;

        // Procura se há um ficheiro .mtl associado para extrair o caminho da imagem
        const mtlLines = objText.split('\n').filter(line => line.trim().startsWith('mtllib'));
        if (mtlLines.length > 0) {
            const mtlFile = mtlLines[0].trim().split(/\s+/)[1];
            if (mtlFile) {
                texture = await this._loadMtlTexture(baseFolder + mtlFile, baseFolder);
            }
        }

        // Processa a geometria garantindo o alinhamento com a Mesh [X,Y,Z, NX,NY,NZ, U,V]
        const geometry = this._parseObj(objText);

        return {
            vertices: new Float32Array(geometry.interleavedVertices),
            indices: new Uint16Array(geometry.indices),
            texture: texture
        };
    }

    _parseObj(text) {
        const positions = [];
        const texCoords = [];
        const normals = [];
        const interleavedVertices = [];
        const indices = [];
        const vertexCache = new Map();
        let vertexCount = 0;

        const lines = text.split('\n');
        for (let line of lines) {
            line = line.trim();
            if (line.startsWith('#') || line === '') continue;

            const parts = line.split(/\s+/);
            const type = parts[0];

            if (type === 'v') {
                positions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
            } else if (type === 'vt') {
                texCoords.push([parseFloat(parts[1]), parseFloat(parts[2])]);
            } else if (type === 'vn') {
                normals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
            } else if (type === 'f') {
                const faceVertices = parts.slice(1).filter(p => p !== '');
                
                // Triangulação dinâmica para aceitar Triângulos (3) ou Quadrados (4) vindos do Blender
                const triangles = [];
                if (faceVertices.length === 3) {
                    triangles.push([faceVertices[0], faceVertices[1], faceVertices[2]]);
                } else if (faceVertices.length === 4) {
                    triangles.push([faceVertices[0], faceVertices[1], faceVertices[2]]);
                    triangles.push([faceVertices[0], faceVertices[2], faceVertices[3]]);
                }

                // Processa cada triângulo gerado
                for (const triangle of triangles) {
                    for (let vertexStr of triangle) {
                        if (vertexCache.has(vertexStr)) {
                            indices.push(vertexCache.get(vertexStr));
                        } else {
                            const lookup = vertexStr.split('/');
                            const pIdx = (parseInt(lookup[0]) - 1);
                            const tIdx = lookup[1] ? (parseInt(lookup[1]) - 1) : -1;
                            const nIdx = lookup[2] ? (parseInt(lookup[2]) - 1) : -1;

                            // 1. POSIÇÃO (X, Y, Z)
                            interleavedVertices.push(positions[pIdx][0], positions[pIdx][1], positions[pIdx][2]);
                            
                            // 2. NORMAIS (NX, NY, NZ) -> ALINHADO: Agora vem antes do UV para coincidir com a Mesh
                            if (nIdx >= 0) {
                                interleavedVertices.push(normals[nIdx][0], normals[nIdx][1], normals[nIdx][2]);
                            } else {
                                interleavedVertices.push(0.0, 1.0, 0.0);
                            }

                            // 3. COORDENADAS UV (U, V) -> ALINHADO: Invertendo o V para o padrão WebGL
                            if (tIdx >= 0) {
                                interleavedVertices.push(texCoords[tIdx][0], 1.0 - texCoords[tIdx][1]);
                            } else {
                                interleavedVertices.push(0.0, 0.0);
                            }

                            vertexCache.set(vertexStr, vertexCount);
                            indices.push(vertexCount);
                            vertexCount++;
                        }
                    }
                }
            }
        }
        return { interleavedVertices, indices };
    }

    async _loadMtlTexture(mtlUrl, baseFolder) {
        try {
            const response = await fetch(mtlUrl);
            if (!response.ok) return null;
            const text = await response.text();

            const lines = text.split('\n');
            for (let line of lines) {
                line = line.trim();
                if (line.startsWith('map_Kd')) {
                    const parts = line.split(/\s+/);
                    const imgFile = parts[parts.length - 1];
                    return await this.textureLoader.load(baseFolder + imgFile);
                }
            }
        } catch (e) {
            console.warn("Não foi possível processar o arquivo de textura .mtl:", e);
        }
        return null;
    }
}