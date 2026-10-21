/**
 * Minimal WebGL2 helper: one program drawn as a full-screen triangle (no buffers, positions come
 * from gl_VertexID), with uniform locations cached by name.
 */

const VERTEX = `#version 300 es
void main() {
  // One oversized triangle covers the viewport: (-1,-1) (3,-1) (-1,3).
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Could not create shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Shader compile failed: ${log}`)
  }
  return shader
}

export class ShaderProgram {
  private readonly program: WebGLProgram
  private readonly locations = new Map<string, WebGLUniformLocation | null>()

  constructor(private readonly gl: WebGL2RenderingContext, fragment: string) {
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX)
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragment)
    const program = gl.createProgram()
    if (!program) throw new Error('Could not create program')
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program)
      gl.deleteProgram(program)
      throw new Error(`Program link failed: ${log}`)
    }
    this.program = program
  }

  use() {
    this.gl.useProgram(this.program)
  }

  private loc(name: string) {
    if (!this.locations.has(name)) this.locations.set(name, this.gl.getUniformLocation(this.program, name))
    return this.locations.get(name) ?? null
  }

  f1(name: string, v: number) { this.gl.uniform1f(this.loc(name), v) }
  i1(name: string, v: number) { this.gl.uniform1i(this.loc(name), v) }
  f2(name: string, x: number, y: number) { this.gl.uniform2f(this.loc(name), x, y) }
  f3(name: string, x: number, y: number, z: number) { this.gl.uniform3f(this.loc(name), x, y, z) }
  /** Flat array of vec3 (length 3n). */
  v3(name: string, data: Float32Array) { this.gl.uniform3fv(this.loc(name), data) }
  /** Flat array of vec4 (length 4n). */
  v4(name: string, data: Float32Array) { this.gl.uniform4fv(this.loc(name), data) }

  draw() {
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3)
  }

  dispose() {
    this.gl.deleteProgram(this.program)
  }
}
