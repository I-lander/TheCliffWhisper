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
const int MAX_WAVES = 40;

float getWaveY(float wi, float worldX) {
	float baseY = SPACING * (wi + 0.5);
	float phaseOffset = wi * 2.3;
	float frequencyA = 0.006 + mod(wi, 3.0) * 0.002;
	float frequencyB = 0.015 + mod(wi, 5.0) * 0.003;
	float amplitudeVariation = 0.7 + mod(wi, 4.0) * 0.2;
	float primary = sin(worldX * frequencyA + elapsedTime * SPEED + phaseOffset);
	float secondary = sin(worldX * frequencyB - elapsedTime * SPEED * 0.6 + phaseOffset * 0.7) * 0.4;
	return baseY + (primary + secondary) * BASE_AMPLITUDE * amplitudeVariation;
}

vec3 bandColor(int band) {
	float b = float(band);
	float a = 0.20 + 0.10 * sin(b * 0.9 + 0.5);
	return vec3(a);
}

void main() {
	float canvasX = outTexCoord.x * canvasSizeX;
	float canvasY = floor((1.0 - outTexCoord.y) * canvasSizeY);
	float worldX = canvasX * pixelToWorld;

	int centerWave = int(canvasY / SPACING);
	int totalWaves = int(canvasSizeY / SPACING);

	// Check if pixel is on a wave line
	bool hit = false;
	for (int offset = -1; offset <= 1; offset++) {
		int waveIndex = centerWave + offset;
		if (waveIndex >= 1 && waveIndex < totalWaves) {
			float snappedY = floor(getWaveY(float(waveIndex), worldX) + 0.5);
			if (abs(canvasY - snappedY) < 0.5) {
				hit = true;
			}
		}
	}

	// Find which band this pixel belongs to
	int band = 0;
	for (int i = 0; i < MAX_WAVES; i++) {
		if (i >= totalWaves) break;
		float wy = getWaveY(float(i), worldX);
		if (canvasY > wy) {
			band = i + 1;
		}
	}

	if (!hit && band <= 1) {
		gl_FragColor = vec4(0.0);
	} else {
		float maxBands = canvasSizeY / SPACING;
		float progress = float(band) / maxBands;
		float alpha = 0.05 + progress * 0.25;
		if (hit) alpha += 0.2;
		gl_FragColor = vec4(alpha, alpha, alpha, alpha);
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
