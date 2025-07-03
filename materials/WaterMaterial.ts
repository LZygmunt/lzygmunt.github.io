import * as THREE from "three";

import shaderChangeBeginNormalVertex from "~/assets/shaders/shaderChangeBeginnormalVertex.glsl";
import shaderChangeBeginVertex from "~/assets/shaders/shaderChangeBeginVertex.glsl";
import shaderChangeCommon from "~/assets/shaders/shaderChangeCommon.glsl";

export class WaterMaterial extends THREE.MeshStandardMaterial {
  extra: Record<string, THREE.IUniform | null>;
  constructor(parameters: THREE.MeshStandardMaterialParameters, WIDTH = 128, BOUNDS = 6) {
    super();

    this.defines = {
      STANDARD: "",
      USE_UV: "",
      WIDTH: WIDTH.toFixed(1),
      BOUNDS: BOUNDS.toFixed(1),
    };

    this.extra = {};

    this.addParameter("heightmap", null);

    this.setValues(parameters);
  }

  addParameter(name: string, value: THREE.IUniform | null) {
    this.extra[name] = value;
    Object.defineProperty(this, name, {
      get: () => this.extra[name],
      set: (v) => {
        this.extra[name] = v;
        if (this.userData.shader) this.userData.shader.uniforms[name].value = this.extra[name];
      },
    });
  }

  override onBeforeCompile(
    shader: THREE.WebGLProgramParametersWithUniforms,
    renderer: THREE.WebGLRenderer,
  ) {
    for (const name in this.extra) {
      shader.uniforms[name] = { value: this.extra[name] };
    }

    shader.vertexShader = shader.vertexShader.replace("#include <common>", shaderChangeCommon);
    //shader.vertexShader = 'uniform sampler2D heightmap;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <beginnormal_vertex>",
      shaderChangeBeginNormalVertex,
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      shaderChangeBeginVertex,
    );

    this.userData.shader = shader;
  }
}
