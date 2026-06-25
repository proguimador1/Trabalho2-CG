#version 300 es
precision highp float;

// Dados recebidos do Vertex Shader interpolados por fragmento
in vec3 v_worldPos;
in vec3 v_normal;
in vec2 v_texCoord;

// Propriedades do Material (Modelo de Phong)
struct Material {
    float shininess;
    float specularStrength;
};

// Estrutura das Fontes de Luz Pontuais
struct PointLight {
    vec3 position;
    vec3 color;
    float intensity;
};

// Uniforms Globais de Controlo
uniform vec3 u_viewPos; 
uniform vec3 u_ambientColor;
uniform sampler2D u_diffuseMap;
uniform Material u_material;

// Uniforms de Alternância de Estado e Cor
uniform vec4 u_color;        
uniform int u_useTexture;    

// NOVO UNIFORM: Controla a claridade/brilho da textura (Ex: 1.0 = normal, 2.0 = mais clara, 0.5 = mais escura)
uniform float u_textureBrightness; 

// Uniforms das Luzes do Cenário
#define MAX_STATIC_LIGHTS 50
uniform int u_numStaticLights;
uniform PointLight u_staticLights[MAX_STATIC_LIGHTS];
uniform PointLight u_movingLight;

out vec4 fragColor;

// Função auxiliar que calcula o modelo de iluminação de Phong para UMA fonte de luz pontual
vec3 calculatePointLight(PointLight light, vec3 normal, vec3 viewDir, vec3 texColor) {
    vec3 lightDir = normalize(light.position - v_worldPos);
    
    // Atenuação baseada na distância
    float distance = length(light.position - v_worldPos);
    float attenuation = 1.0 / (1.0 + 0.09 * distance + 0.032 * (distance * distance));
    
    // Componente Difusa
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * light.color * texColor * light.intensity;
    
    // Componente Especular
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_material.shininess);
    vec3 specular = u_material.specularStrength * spec * light.color * light.intensity;
    
    return (diffuse + specular) * attenuation;
}

void main() {
    vec3 norm = normalize(v_normal);
    vec3 viewDir = normalize(u_viewPos - v_worldPos);
    
    // Determinação dinâmica da cor base do pixel
    vec3 baseColor;
    if (u_useTexture == 1) {
        vec4 sampleColor = texture(u_diffuseMap, v_texCoord);
        
        // Descarte de pixels transparentes
        if (sampleColor.a < 0.1) {
            discard;
        }
        
        // MODIFICAÇÃO: Multiplica os canais RGB pelo u_textureBrightness para ajustar a claridade
        baseColor = sampleColor.rgb * u_color.rgb * u_textureBrightness;
    } else {
        baseColor = u_color.rgb;
    }
    
    // Iniciar o acumulador com o termo de iluminação ambiente fixo da mina
    vec3 totalLight = u_ambientColor * baseColor;
    
    // Acumular a influência de todas as N luzes estáticas
    int numLights = min(u_numStaticLights, MAX_STATIC_LIGHTS);
    for(int i = 0; i < numLights; i++) {
        totalLight += calculatePointLight(u_staticLights[i], norm, viewDir, baseColor);
    }
    
    // Acumular a influência da única luz móvel (lanterna)
    totalLight += calculatePointLight(u_movingLight, norm, viewDir, baseColor);
    
    // Saída final com correção de gama padrão (2.2)
    fragColor = vec4(pow(totalLight, vec3(1.0 / 2.2)), 1.0);
}