/**
 * Gerenciador do Loop de Renderização e Simulação Técnica.
 * Controla o tempo e garante atualizações fluidas independentes da taxa de atualização do monitor.
 */
export class GameLoop {
    constructor() {
        this.isActive = false;
        this.lastTime = 0;
        this.accumulatedTime = 0; // Controla o tempo total do passeio de 2 minutos

        // Callbacks que serão injetados pelo main.js
        this.onUpdate = null;
        this.onRender = null;
    }

    /**
     * Inicia o loop principal.
     * @param {function} updateCallback - Função executada para atualizar físicas/inputs (passa deltaTime).
     * @param {function} renderCallback - Função executada para desenhar a cena na tela (passa tempo acumulado).
     */
    start(updateCallback, renderCallback) {
        this.onUpdate = updateCallback;
        this.onRender = renderCallback;
        this.isActive = true;
        this.lastTime = performance.now();
        this.accumulatedTime = 0;

        // Dispara o primeiro frame do navegador
        requestAnimationFrame((timestamp) => this._loop(timestamp));
    }

    /**
     * Interrompe o loop de renderização (útil para finalizar o passeio após os 2 minutos).
     */
    stop() {
        this.isActive = false;
    }

    /**
     * O loop interno executado a cada atualização nativa do monitor do usuário.
     */
    _loop(currentTime) {
        if (!this.isActive) return;

        // 1. Calcular a variação de tempo (Delta Time) convertendo milissegundos para segundos
        let deltaTime = (currentTime - this.lastTime) * 0.001;
        this.lastTime = currentTime;

        // Evita saltos gigantescos de física se o usuário trocar de aba no navegador (trava de segurança)
        if (deltaTime > 0.1) deltaTime = 0.1;

        // Acumula o tempo decorrido do passeio virtual
        this.accumulatedTime += deltaTime;

        // 2. Chamar a atualização lógica (câmera, movimentação da luz móvel)
        if (this.onUpdate) {
            this.onUpdate(deltaTime);
        }

        // 3. Chamar a rotina de desenho na tela
        if (this.onRender) {
            this.onRender(this.accumulatedTime);
        }

        // Solicita o próximo quadro de animação ao navegador
        requestAnimationFrame((timestamp) => this._loop(timestamp));
    }
}