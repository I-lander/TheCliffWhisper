const frag = `
precision mediump float;

uniform sampler2D uMainSampler;
varying vec2 outTexCoord;

uniform float dynamicOffsetX;
uniform vec2 resolution;

void main() {
	vec2 uv = outTexCoord;

	if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
		gl_FragColor = vec4(0.0);
		return;
	}

	vec4 baseColor = texture2D(uMainSampler, uv);
	vec3 finalColor;

	if (abs(dynamicOffsetX) > 0.01) {
		float offsetX = dynamicOffsetX / resolution.x;
		vec4 redGhost   = texture2D(uMainSampler, uv + vec2(-offsetX, 0.0));
		vec4 greenGhost = texture2D(uMainSampler, uv + vec2(offsetX, 0.0));
		finalColor = vec3(redGhost.r, baseColor.g, greenGhost.b);
	} else {
		finalColor = baseColor.rgb;
	}

	vec2 pos = uv * 2.0 - 1.0;
	float dist = length(pos);
	float vignette = 1.0 - smoothstep(1.0, 1.6, dist) * 0.3;

	float scanlineY = gl_FragCoord.y / resolution.y;
	float scanline = 0.99 + 0.05 * sin(scanlineY * 800.0);

	finalColor *= scanline;

	float vignetteAlpha = max(baseColor.a, 1.0 - vignette);
	finalColor *= vignette;

	gl_FragColor = vec4(finalColor, vignetteAlpha);
}

`;

export default class CrtShader extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  public dynamicOffsetX: number = 0;
  public screenWidth: number = 512;
  public screenHeight: number = 288;

  constructor(game: Phaser.Game) {
    super({
      game,
      renderTarget: true,
      fragShader: frag,
    });
  }

  onPreRender(): void {
    const width = this.screenWidth;
    const height = this.screenHeight;

    this.set1f('dynamicOffsetX', this.dynamicOffsetX);
    this.set2f('resolution', width, height);
  }
}
