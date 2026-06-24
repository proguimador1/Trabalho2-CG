#version 300 es
precision highp float;

// Dados recebidos do Vertex Shader
in vec3 v_worldPos;
in vec3 v_normal;
in vec2 v_texCoord;

// Propriedades do Material
struct Material {
    float shininess;
    float specularStrength;
};

// Estrutura das Fontes de Luz
struct PointLight {
    vec3 position;
    vec3 color;
    float intensity;
};

// Uniforms Globais
uniform vec3 u_viewPos; // Posição atual da Câmera (essencial para o Especular)
uniform vec3 u_ambientColor;
uniform sampler2D u_diffuseMap;
uniform Material u_material;

// Uniforms das Luzes
#define MAX_STATIC_LIGHTS 10
uniform int u_numStaticLights;
uniform PointLight u_staticLights[MAX_STATIC_LIGHTS];
uniform PointLight u_movingLight;

out vec4 fragColor;

// Função auxiliar que calcula o modelo de Phong para UMA fonte de luz pontual
vec3 calculatePointLight(PointLight light, vec3 normal, vec3 viewDir, vec3 texColor) {
    // 1. Vetor direção da luz
    vec3 lightDir = normalize(light.position - v_worldPos);
    
    // Atenuação baseada na distância (essencial para ambientes fechados)
    float distance = length(light.position - v_worldPos);
    float attenuation = 1.0 / (1.0 + 0.09 * distance + 0.032 * (distance * distance));
    
    // 2. Componente Difusa (Lambert)
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * light.color * texColor * light.intensity;
    
    // 3. Componente Especular (Phong clássico)
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_material.shininess);
    vec3 specular = u_material.specularStrength * spec * light.color * light.intensity;
    
    // Retorna a iluminação combinada aplicada por esta luz com atenuação
    return (diffuse + specular) * attenuation;
}

void main() {
    // Normalizar a normal vinda do Vertex Shader interpolado
    vec3 norm = normalize(v_normal);
    // Vetor que aponta do pixel em direção à câmera do usuário
    vec3 viewDir = normalize(u_viewPos - v_worldPos);
    
    // Cor base do mapa de textura
    vec3 texColor = texture(u_diffuseMap, v_texCoord).rgb;
    
    // Iniciar o acumulador com a luz ambiente fixa do cenário
    vec3 totalLight = u_ambientColor * texColor;
    
    // Acumular a influência de todas as N luzes estáticas configuradas
    int numLights = min(u_numStaticLights, MAX_STATIC_LIGHTS);
    for(int i = 0; i < numLights; i++) {
        totalLight += calculatePointLight(u_staticLights[i], norm, viewDir, texColor);
    }
    
    // Acumular a influência da única luz móvel
    totalLight += calculatePointLight(u_movingLight, norm, viewDir, texColor);
    
    // Saída final com correção de gama simples para melhor contraste no browser
    fragColor = vec4(pow(totalLight, vec3(1.0 / 2.2)), 1.0);
}