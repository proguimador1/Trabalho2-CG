/**
 * Gerenciador de Texturas WebGL2.
 * Responsável pelo carregamento assíncrono de imagens e configuração de parâmetros de amostragem.
 */
export class TextureManager {
    /**
     * @param {WebGL2RenderingContext} gl - O contexto WebGL2.
     */
    constructor(gl) {
        this.gl = gl;
    }

    /**
     * Carrega uma imagem a partir de uma URL e cria uma textura WebGL2 pronta para uso.
     * @param {string} url - Caminho do arquivo de imagem (ex: 'assets/textures/wall.jpg')
     * @returns {Promise<WebGLTexture>} Uma promessa que resolve com a textura criada.
     */
    load(url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.src = url;

            // Tratamento assíncrono: espera a imagem ser baixada pelo navegador
            image.onload = () => {
                const texture = this._createWebGLTexture(image);
                resolve(texture);
            };

            image.onerror = (err) => {
                console.error(`Erro ao carregar a textura: ${url}`, err);
                reject(err);
            };
        });
    }

    /**
     * Método interno para enviar os pixels da imagem carregada para a VRAM da GPU.
     */
    _createWebGLTexture(image) {
        const gl = this.gl;
        const texture = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, texture);

        // 1. Enviar os pixels da imagem para o WebGL
        // Configura o formato interno para RGBA (padrão web comum)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        // 2. Configurar o comportamento de repetição (S e T são equivalentes a X e Y na textura)
        // gl.REPEAT permite que texturas de tijolo ou piso se repitam infinitamente pelas paredes
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

        // 3. Configurar a filtragem de minificação e magnificação
        // Usamos LINEAR_MIPMAP_LINEAR para ativar a transição suave de Mipmaps (Trilinear filtering)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // 4. Gerar Mipmaps automaticamente para evitar serrilhados à distância
        gl.generateMipmap(gl.TEXTURE_2D);

        // 5. Ativar Filtro Anisotrópico (Otimização visual crucial para corredores de passeios virtuais)
        const ext = gl.getExtension('EXT_texture_filter_anisotropic');
        if (ext) {
            // Descobre o nível máximo de anisotropia suportado pela GPU do usuário (ex: 4x, 8x, 16x)
            const maxAnisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            // Aplica o valor máximo para garantir paredes de corredores perfeitamente nítidas
            gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, maxAnisotropy);
        }

        // Limpar o bind
        gl.bindTexture(gl.TEXTURE_2D, null);

        return texture;
    }
}