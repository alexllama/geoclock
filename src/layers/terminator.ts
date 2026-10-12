import * as maplibregl from 'maplibre-gl';

const VERT = `#version 300 es
in vec2 a_pos;
uniform mat4 u_matrix;
out vec2 v_lnglat;
const float PI = 3.141592653589793;
void main() {
  gl_Position = u_matrix * vec4(a_pos, 0.0, 1.0);
  float lng = a_pos.x * 360.0 - 180.0;
  float lat = degrees(2.0 * atan(exp((0.5 - a_pos.y) * 2.0 * PI)) - PI * 0.5);
  v_lnglat = vec2(lng, lat);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 v_lnglat;
uniform float u_sunLng;
uniform float u_sunLat;
out vec4 fragColor;
const float PI = 3.141592653589793;
void main() {
  float latR = radians(v_lnglat.y);
  float lngR = radians(v_lnglat.x);
  float sunLatR = radians(u_sunLat);
  float sunLngR = radians(u_sunLng);
  float cosZ = sin(latR) * sin(sunLatR) + cos(latR) * cos(sunLatR) * cos(lngR - sunLngR);
  float elev = degrees(asin(clamp(cosZ, -1.0, 1.0)));

  // 0 in full daylight, 1 in deep night (past astronomical twilight).
  float night = smoothstep(0.0, 18.0, -elev);
  // Warm glow centred on ~6 degrees below the horizon (civil twilight).
  float twilight = clamp(1.0 - abs(-elev - 6.0) / 6.0, 0.0, 1.0);

  vec3 nightCol = vec3(0.006, 0.014, 0.042);
  vec3 twilightCol = vec3(0.22, 0.10, 0.26);
  vec3 col = mix(nightCol, twilightCol, twilight * 0.55);

  float alpha = night * 0.9;
  fragColor = vec4(col * alpha, alpha);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('could not create shader');
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error('shader compile error: ' + log);
  }
  return shader;
}

/**
 * Full-screen overlay that shades the night side of the Earth directly from
 * the Sun's position. Each fragment is inverse-projected to lat/lng, its solar
 * elevation computed, and a blue night tint blended in. Because the map is
 * always recentred on the sub-solar meridian, the shading stays visually fixed
 * while the map scrolls beneath it — the Geochron's stationary light mask.
 */
export class TerminatorLayer implements maplibregl.CustomLayerInterface {
  readonly id = 'geoclock-terminator';
  readonly type = 'custom' as const;
  readonly renderingMode = '2d' as const;

  private map!: maplibregl.Map;
  private gl!: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private aPos = -1;
  private uMatrix: WebGLUniformLocation | null = null;
  private uSunLng: WebGLUniformLocation | null = null;
  private uSunLat: WebGLUniformLocation | null = null;
  private sunLng = 0;
  private sunLat = 0;

  setSun(lng: number, lat: number): void {
    this.sunLng = lng;
    this.sunLat = lat;
  }

  onAdd(map: maplibregl.Map, gl: WebGL2RenderingContext): void {
    this.map = map;
    this.gl = gl;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const program = gl.createProgram();
    if (!program) throw new Error('could not create program');
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('program link error: ' + gl.getProgramInfoLog(program));
    }
    this.program = program;
    this.aPos = gl.getAttribLocation(program, 'a_pos');
    this.uMatrix = gl.getUniformLocation(program, 'u_matrix');
    this.uSunLng = gl.getUniformLocation(program, 'u_sunLng');
    this.uSunLat = gl.getUniformLocation(program, 'u_sunLat');
    this.buffer = gl.createBuffer();
  }

  onRemove(): void {
    if (this.program) this.gl.deleteProgram(this.program);
    if (this.buffer) this.gl.deleteBuffer(this.buffer);
    this.program = null;
    this.buffer = null;
  }

  render(_gl: WebGL2RenderingContext, options: maplibregl.CustomRenderMethodInput): void {
    const gl = this.gl;
    if (!this.program || !this.buffer) return;

    const canvas = this.map.getCanvas();
    const w = canvas.clientWidth || canvas.width;
    const h = canvas.clientHeight || canvas.height;

    const centerMc = maplibregl.MercatorCoordinate.fromLngLat(this.map.getCenter());
    // The map is scaled so the full 360-degree world is exactly `w` pixels wide,
    // i.e. one Mercator unit spans `w` px. So the viewport is a Mercator-space
    // rectangle: half-width 0.5, half-height h/(2w). Building it directly avoids
    // the world-copy wrap that can collapse the quad at the +/-180 edge.
    const halfX = 0.5;
    const halfY = h / (2 * w);
    const cx = centerMc.x;
    const cy = centerMc.y;
    const data = new Float32Array([
      cx - halfX, cy - halfY,
      cx + halfX, cy - halfY,
      cx - halfX, cy + halfY,
      cx + halfX, cy + halfY
    ]);

    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(
      this.uMatrix,
      false,
      options.defaultProjectionData.mainMatrix as unknown as Float32Array
    );
    gl.uniform1f(this.uSunLng, this.sunLng);
    gl.uniform1f(this.uSunLat, this.sunLat);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disableVertexAttribArray(this.aPos);
    gl.disable(gl.BLEND);
  }
}
