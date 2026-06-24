#version 300 es

// Atributos de entrada dos vértices (definidos no layout do seu buffer.js)
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_texCoord;

// Matrizes de Transformação enviadas pela CPU
uniform mat4 u_modelMatrix;      // Transforma o objeto local para o mundo 3D
uniform mat4 u_viewMatrix;       // Transforma o mundo para o ponto de vista da câmera
uniform mat4 u_projectionMatrix; // Aplica a perspectiva (efeito 3D de profundidade)

// Dados de saída que serão interpolados e enviados para o Fragment Shader
out vec3 v_worldPos;
out vec3 v_normal;
out vec2 v_texCoord;

void main() {
    // 1. Calcular a posição do vértice no espaço do mundo
    // Multiplicamos a posição local pela Matriz de Modelo (convertendo vec3 para vec4 com w=1.0)
    vec4 worldPos = u_modelMatrix * vec4(a_position, 1.0);
    v_worldPos = worldPos.xyz;

    // 2. Transformar a normal para o espaço do mundo
    // Para ambientes puramente estáticos e sem escalas não-uniformes, multiplicar direto funciona bem.
    // Usamos mat3(u_modelMatrix) para extrair apenas a rotação e ignorar a translação da matriz.
    v_normal = normalize(mat3(u_modelMatrix) * a_normal);

    // 3. Repassar as coordenadas de textura diretamente
    v_texCoord = a_texCoord;

    // 4. Posição final obrigatória exigida pelo WebGL para renderização (Clip Space)
    // A ordem de multiplicação de matrizes da direita para a esquerda é fundamental!
    gl_Position = u_projectionMatrix * u_viewMatrix * worldPos;
}