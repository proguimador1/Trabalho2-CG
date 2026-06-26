# <h2 align='center'>Trabalho2-CG</h2>
# Mina Subterrânea do Minecraft — Passeio Virtual 3D

## Descrição
Este projeto é uma aplicação gráfica interativa desenvolvida em **WebGL2**, simulando um passeio virtual imersivo por uma mina abandonada baseada no jogo Minecraft. O usuário explora um ambiente tridimensional gerado via matriz lógica procedural contendo corredores estruturados com vigas de madeira, trilhos ferroviários no chão e veios de minério de diamante encrustados nas paredes de rocha escura. O motor gráfico foi construído totalmente do zero, implementando um pipeline analítico manual que engloba álgebra linear customizada, câmera em primeira pessoa (FPS), buffers de vértices intercalados de alta performance e um sistema de iluminação dinâmico baseado no modelo de reflexão de Phong (composto por múltiplas tochas estáticas e uma fonte de luz móvel mística orbitando a sala do Enderman).

---

## Recursos Principais e Estrutura do Motor

- **Motor Gráfico:** Abstração direta da API nativa do WebGL2, realizando o gerenciamento manual do ciclo de renderização e comunicação direta com a GPU via Shaders GLSL.
- **Álgebra Linear(`matrix.js` & `vector.js`):** Criação manual de classes para manipulação vetorial (`Vetor3`) e matricial (`Matriz4`) no formato *Column-Major*, responsável pelos cálculos geométricos de projeção, visualização e transformações espaciais sem o uso de dependências externas.
- **Sistema de Iluminação Híbrido (Modelo de Phong):**
    - *Luzes Estáticas (Tochas):* Array dinâmico de até 50 fontes pontuais cujas coordenadas são extraídas do mapa lógico e enviadas aos Shaders com atenuação física quadrática.
    - *Luz Móvel Roxa (Sala do Enderman):* Uma fonte de iluminação pontual purpurina que orbita de forma automatizada o centro da câmara final por meio de equações paramétricas circulares trigonométricas.
    - *Modelo de Phong Analítico:* Cálculo manual pixel a pixel das componentes ambiente, difusa e especular calculados no Fragment Shader para conferir brilho aos minérios e volumetria aos blocos.
- **Câmera FPS Avançada (`camera.js`):** Câmera em primeira pessoa com controle desacoplado de orientação usando ângulos de Euler (*Yaw* e *Pitch*) integrados à Pointer Lock API para rotação infinita pelo mouse e movimentação travada no plano de caminhada horizontal ($XZ$).
- **Pipeline de Buffers de Alta Performance (`buffer.js`):** Implementação manual de *Geometry Buffers* estruturando dados intercalados (Posição, Normais e Coordenadas UV) sob uma única convenção de *Stride* e *Offsets* em memória de vídeo (VRAM).

---

## Descrição Teórica e Arquitetura do Código

### 1. Biblioteca Matemática (`matrix.js` & `vector.js`)
Desenvolvida integralmente em JavaScript para suprir os cálculos geométricos necessários para a projeção e mapeamento espacial.
* `Matriz4.identity()`: Retorna uma matriz identidade de quarta ordem usada como base para reinicialização de estados de transformações.
* `Matriz4.multiply(matrixB)`: Executa a multiplicação matricial ($A \times B$) de forma linearizada respeitando a ordenação por colunas (*Column-Major*) nativa da GPU.
* `Matriz4.translation(x, y, z)`: Gera uma matriz de translação pura inserindo os deslocamentos nos elements de índice 12, 13 e 14. É a base da rasterização do mapa, posicionando cada cubo em suas coordenadas discretas dentro da mina.
* `Matriz4.perspective(fovRad, aspect, near, far)`: Constrói a matriz de projeção perspectiva calculando o fator de magnificação baseado no campo de visão desejado e na razão de aspecto do Canvas, gerando o efeito de encurtamento por profundidade onde elementos distantes parecem menores.
* `Matriz4.lookAt(eye, target, up)`: Equaciona o espaço da câmera. Calcula o vetor de direção invertido ($Z$), o vetor lateral direito ($X$ via produto vetorial `cross`) e o vetor vertical corrigido ($Y$). Consolida a translação inversa embutida usando o produto escalar (`dot`) de forma linear, permitindo transladar e rotacionar o mundo ao redor do observador.

### 2. Controle de Visualização (`camera.js`)
Gerencia as interações do usuário, transformando comandos de periféricos em transformações de matriz de visualização (`viewMatrix`).
* `_setupInput()`: Registra escutadores (`addEventListener`) de teclado para mapear o estado físico das teclas WASD e inicializa o Pointer Lock de modo a travar o cursor dentro do canvas para capturar deslocamentos contínuos do mouse (`movementX` e `movementY`).
* `updateCameraVectors()`: Converte os ângulos esféricos (*Yaw* e *Pitch*) acumulados pelo mouse em um vetor tridimensional cartesiano normalizado (`front`). Utiliza produtos vetoriais com a vertical global para deduzir o vetor lateral (`right`).
* `update(deltaTime)`: Calcula o deslocamento linear ponderado pela taxa de atualização de quadros (`deltaTime`). Isola o vetor de caminhada no plano horizontal (`walkFront`) zerando a componente vertical, garantindo que o usuário deslize de forma realista pelo chão da mina. Atualiza o alvo fixando o LookAt instantâneo.

### 3. Pipeline Gráfico e Buffers (`buffer.js` & `mesh.js`)
Gerenciam o ciclo de vida e a transferência de primitivas tridimensionais para a memória da GPU.
* `GeometryBuffer.init(interleavedData, indices)`: Instancia e vincula um *Vertex Array Object* (VAO), um *Vertex Buffer Object* (VBO) de tipo `ARRAY_BUFFER` e um *Element Buffer Object* (EBO) de tipo `ELEMENT_ARRAY_BUFFER`. Os dados são enviados sob a diretiva `gl.STATIC_DRAW`.
* Configuração de Atributos (`gl.vertexAttribPointer`): Define a estrutura do bloco de memória com um passo (*Stride*) estrito de 32 bytes (8 floats $\times$ 4 bytes), separando:
  - **Atributo 0 (Posição):** 3 floats, *offset* 0 bytes.
  - **Atributo 1 (Normais):** 3 floats, *offset* 12 bytes.
  - **Atributo 2 (Coordenadas UV):** 2 floats, *offset* 24 bytes.
* `GeometryBuffer.draw()`: Aplica o bind do VAO e dispara o desenho via `gl.drawElements` utilizando triângulos indexados. Avalia dinamicamente o volume de vértices para optar entre indexação por `gl.UNSIGNED_SHORT` ou `gl.UNSIGNED_INT`.
* `Mesh.draw(modelMatrixLocation)`: Modifica dinamicamente a propriedade da matriz de modelo de cada bloco no loop de varredura tridimensional da `main.js` enviando-a para a GPU via `gl.uniformMatrix4fv`.

### 4. Sistema de Iluminação e Materiais (`light.js` & `material.js`)
Implementa de forma computacional a simulação de luz pontual e propriedades ópticas da superfície.
* `LightManager.updateMovingLight(currentTime)`: Executa as equações paramétricas orbitais da luz mística do Enderman: $X = C_x + R \cdot \cos(t \cdot \omega)$ e $Z = C_z + R \cdot \sin(t \cdot \omega)$, atualizando a posição da luz de forma contínua a cada frame.
* `LightManager.sendToShader(shaderProgram)`: Serializa os dados e injeta os vetores de cor ambiente, quantidade de luzes e as propriedades estruturadas (structs) individuais de posição, cor e intensidade de cada tocha no shader.
* `Material.apply(textureUnit)`: Vincula as texturas carregadas em slots ativos (ex: `gl.TEXTURE0`) e preenche os uniforms de propriedades ópticas de Phong como a especularidade (`u_material.specularStrength`) e o polimento (`u_material.shininess`).

### 5. Sombreamento Analítico (`vertex.glsl` e `fragment.glsl`)
Programas escritos na linguagem GLSL que rodam diretamente no núcleo de processamento paralelo da placa de vídeo.
* **Vertex Shader:** Recebe a geometria local do cubo, aplica o produto cumulativo pela matriz de modelo, visualização e projeção para deduzir as coordenadas finais de tela (`gl_Position`). Multiplica a normal do vértice pela matriz de modelo convertida em `mat3` para extrair estritamente a orientação angular da normal no espaço do mundo, repassando-a de forma interpolada.
* **Fragment Shader:** Recebe as normais, posições espaciais e texturas interpoladas. Realiza os seguintes passos analíticos para cada pixel:
  1. *Fator Condicional:* Analisa se o bloco utiliza mapeamento de textura (`u_useTexture`) ou aplica cor sólida básica. Caso use textura, amostra a cor do mapa difuso e descarta fragmentos correspondentes ao fundo com o comando `discard` para aplicar recortes transparentes de forma limpa (como nos vãos do trilho).
  2. *Cálculo Difuso:* Determina a intensidade de Lambert pelo produto escalar entre a normal e o vetor de direção da luz: $\max(\mathbf{N} \cdot \mathbf{L}, 0.0)$.
  3. *Cálculo Especular:* Calcula o vetor de reflexão da luz sobre a superfície e projeta o produto escalar em relação ao vetor de visão do observador, aplicando o expoente de brilho: $\mathbf{u\_material.specularStrength} \cdot \max(\mathbf{V} \cdot \mathbf{R}, 0.0)^{\mathbf{shininess}}$.
  4. *Atenuação e Correção de Gama:* Aplica o decaimento quadrático de energia proporcional à distância e consolida o somatório de todas as tochas e luz móvel. Aplica a correção de gama via potência fracionária $\text{Cor}^{1.0 / 2.2}$ antes de escrever no registrador de saída (`fragColor`).

---

## Tutorial de Compilação e Execução

Por ser um projeto puramente desenvolvido em **WebGL2** voltado para a plataforma Web, os fontes não exigem um pipeline de compilação por compiladores nativos (como GCC ou C++). No entanto, devido à restrição de segurança de requisições de mesma origem (*CORS - Cross-Origin Resource Sharing*) imposta pelos navegadores modernos ao tentar carregar os shaders externos (`.glsl`) e imagens de textura (`.png`) via requisição assíncrona `fetch`, o projeto **não deve** ser aberto clicando duas vezes direto no arquivo `.html`. É obrigatório o uso de um servidor HTTP local.

### Pré-requisitos
Certifique-se de possuir um dos seguintes ambientes instalados na máquina:
* **Node.js** (A abordagem recomendada)
* Ou **Python** (3.x ou superior)
* Ou a extensão **Live Server** instalada no editor *Visual Studio Code*.

### Instruções Passo a Passo

#### Opção A: Utilizando Node.js (Servidor Estático Rápido)
1. Abra o terminal do seu sistema operacional na pasta raiz onde o arquivo `index.html` e a pasta `engine` estão localizados.
2. Instale globalmente ou execute um servidor HTTP leve de forma temporária digitando:
   ```bash
   npx http-server . -p 8080
   ```
3. Abra o seu navegador de preferência e acesse o endereço fornecido no terminal (geralmente http://localhost:8080). 
#### Opção B: Utilizando Python
1. Abra o terminal e navegue até a pasta raiz do projeto.
2. Dispare o módulo de servidor HTTP embutido do Python executando o comando correspondente à sua versão:
Python 3:

```bash
python -m http.server 8000
```

3. Abra o seu navegador e acesse o link: http://localhost:8000. 

#### Opção C: Utilizando Visual Studio Code (Interface Gráfica)
1. Abra a pasta raiz do projeto dentro do editor VS Code.
2. Caso possua a extensão Live Server instalada, clique com o botão direito sobre o arquivo index.html na árvore de arquivos lateral.
3. Selecione a opção "Open with Live Server". Um servidor local será instanciado automaticamente abrindo uma aba em seu navegador padrão.
---

### Links do Projeto

- **Apresentação de Slides do Projeto:** [Slides da apresentação](https://canva.link/n3ptxcu43it074y)
- **Vídeo de Demonstração da Execução:** [Vídeo da demonstração](https://www.youtube.com/watch?v=2GqB5qAYEsg&feature=youtu.be)