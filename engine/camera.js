import { Vetor3 } from './math/vector.js';
import { Matriz4 } from './math/matrix.js';

/**
 * Câmera em Primeira Pessoa (FPS) para o Passeio Virtual.
 * Gerencia a posição, orientação, projeção e inputs do usuário.
 */
export class Camera {
    /**
     * @param {HTMLCanvasElement} canvas - O canvas para registrar os eventos de mouse.
     */
    constructor(canvas) {
        this.canvas = canvas;

        // Estado Espacial (Posição e Vetores de Orientação)
        this.position = new Vetor3(0, 1.8, 5); // Altura de 1.8m simulando a visão humana
        this.front = new Vetor3(0, 0, -1);     // Olhando para frente (Z negativo)
        this.up = new Vetor3(0, 1, 0);         // Direção "para cima" global
        this.right = new Vetor3(1, 0, 0);      // Direção lateral

        // Ângulos de Rotação (em graus)
        this.yaw = -90.0;  // Rotação horizontal (olhar para os lados)
        this.pitch = 0.0;   // Rotação vertical (olhar para cima/baixo)

        // Configurações de Movimento
        this.moveSpeed = 4.0;       // Metros por segundo
        this.mouseSensitivity = 0.15; // Velocidade do olhar

        // Estado das Teclas Pressionadas
        this.keys = {
            KeyW: false, KeyS: false, KeyA: false, KeyD: false
        };

        // Matrizes
        this.viewMatrix = Matriz4.identity();
        this.projectionMatrix = Matriz4.identity();

        // Inicializar os sistemas
        this._setupInput();
        this.updateCameraVectors();
    }

    /**
     * Define a matriz de projeção perspectiva baseada no tamanho do canvas.
     */
    updateProjection(fovDegrees = 60, near = 0.1, far = 100.0) {
        const fovRad = (fovDegrees * Math.PI) / 180;
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.projectionMatrix = Matriz4.perspective(fovRad, aspect, near, far);
    }

    /**
     * Registra os listeners de teclado e mouse (Pointer Lock API).
     */
    _setupInput() {
        // Capturar Teclado
        window.addEventListener('keydown', (e) => {
            if (e.code in this.keys) this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            if (e.code in this.keys) this.keys[e.code] = false;
        });

        // Pointer Lock para esconder o mouse e permitir rotação infinita
        this.canvas.addEventListener('click', () => {
            this.canvas.requestPointerLock();
        });

        // Capturar Movimento do Mouse
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.canvas) {
                this.yaw += e.movementX * this.mouseSensitivity;
                this.pitch -= e.movementY * this.mouseSensitivity; // Invertido para o mouse subir e a visão subir

                // Limitar o olhar vertical para evitar que a câmera "dê uma cambalhota"
                if (this.pitch > 89.0) this.pitch = 89.0;
                if (this.pitch < -89.0) this.pitch = -89.0;

                this.updateCameraVectors();
            }
        });
    }

    /**
     * Recalcula os vetores de direção (Front, Right) baseados nos ângulos Yaw e Pitch.
     */
    updateCameraVectors() {
        const yawRad = (this.yaw * Math.PI) / 180;
        const pitchRad = (this.pitch * Math.PI) / 180;

        // Trigonometria tridimensional para converter ângulos esféricos em um vetor 3D de direção
        const direction = new Vetor3();
        direction.x = Math.cos(yawRad) * Math.cos(pitchRad);
        direction.y = Math.sin(pitchRad);
        direction.z = Math.sin(yawRad) * Math.cos(pitchRad);
        
        this.front = direction.normalize();

        // Recalcular os eixos Direita e Cima locais da câmera
        this.right = this.front.cross(this.up).normalize();
    }

    /**
     * Processa a movimentação física baseada no Delta Time do frame.
     * Deve ser chamada a cada frame no loop principal do main.js.
     * @param {number} deltaTime - Tempo decorrido desde o último frame (em segundos).
     */
    update(deltaTime) {
        const velocity = this.moveSpeed * deltaTime;

        // Movimento estilo FPS: caminhar no plano horizontal (X, Z) ignorando o eixo Y do olhar
        const walkFront = new Vetor3(this.front.x, 0, this.front.z).normalize();

        if (this.keys.KeyW) this.position = this.position.add(walkFront.scale(velocity));
        if (this.keys.KeyS) this.position = this.position.subtract(walkFront.scale(velocity));
        if (this.keys.KeyA) this.position = this.position.subtract(this.right.scale(velocity));
        if (this.keys.KeyD) this.position = this.position.add(this.right.scale(velocity));

        // Como o ambiente é fechado, você poderia adicionar limites de colisão simples (bounding box) aqui.

        // Atualizar a View Matrix final
        const target = this.position.add(this.front);
        this.viewMatrix = Matriz4.lookAt(this.position, target, this.up);
    }
}