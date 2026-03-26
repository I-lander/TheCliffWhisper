const fragShader = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 outTexCoord;

uniform float elapsedTime;
uniform float pixelToWorld;
uniform float canvasSizeX;
uniform float canvasSizeY;

const float SPACING = 16.0;
const float BASE_AMPLITUDE = 2.4;
const float SPEED = 0.001;

void main() {
	float canvasX = outTexCoord.x * canvasSizeX;
	float canvasY = floor(outTexCoord.y * canvasSizeY);
	float worldX = canvasX * pixelToWorld;

	int centerWave = int(canvasY / SPACING);

	bool hit = false;

	for (int offset = -1; offset <= 1; offset++) {
		int waveIndex = centerWave + offset;
		if (waveIndex >= 0 && waveIndex < int(canvasSizeY / SPACING)) {
			float wi = float(waveIndex);
			float baseY = SPACING * (wi + 0.5);
			float phaseOffset = wi * 2.3;

			float frequencyA = 0.006 + mod(wi, 3.0) * 0.002;
			float frequencyB = 0.015 + mod(wi, 5.0) * 0.003;
			float amplitudeVariation = 0.7 + mod(wi, 4.0) * 0.2;

			float primary = sin(worldX * frequencyA + elapsedTime * SPEED + phaseOffset);
			float secondary = sin(worldX * frequencyB - elapsedTime * SPEED * 0.6 + phaseOffset * 0.7) * 0.4;
			float waveY = baseY + (primary + secondary) * BASE_AMPLITUDE * amplitudeVariation;
			float snappedY = floor(waveY + 0.5);

			if (abs(canvasY - snappedY) < 0.5) {
				hit = true;
			}
		}
	}

	if (hit) {
		gl_FragColor = vec4(34.0 / 255.0, 34.0 / 255.0, 34.0 / 255.0, 1.0);
	} else {
		gl_FragColor = vec4(0.0);
	}
}
`;

export function createWaveShader(): Phaser.Display.BaseShader {
  return new Phaser.Display.BaseShader('WaveShader', fragShader, undefined, {
    elapsedTime: { type: '1f', value: 0 },
    pixelToWorld: { type: '1f', value: 1.0 },
    canvasSizeX: { type: '1f', value: 1024.0 },
    canvasSizeY: { type: '1f', value: 512.0 },
  });
}
