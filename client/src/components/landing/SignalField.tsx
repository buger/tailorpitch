import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Decorative only: the complete workflow is semantic HTML above this layer.
// No library, textures or render loop outside the visible hero.
export function SignalField({ paused }: { paused: boolean }) {
  const field = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [wires, setWires] = useState<number[][]>([]);
  useLayoutEffect(() => {
    const node = field.current;
    const scene = node?.parentElement;
    if (!node || !scene) return;
    const measure = () => {
      const bounds = node.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const rect = (selector: string) =>
        scene.querySelector(selector)?.getBoundingClientRect();
      const candidates = rect(".signal-candidate-list");
      const qualification = rect(".signal-qualification-card");
      const page = rect(".signal-output-card");
      const draft = rect(".signal-draft-card");
      if (!qualification || !page || !draft) return;
      const lines: number[][] = [];
      const add = (x: number, y: number, endX: number, endY: number) =>
        lines.push([
          (x - bounds.left) / bounds.width,
          (y - bounds.top) / bounds.height,
          (endX - bounds.left) / bounds.width,
          (endY - bounds.top) / bounds.height,
        ]);
      if (candidates?.width) {
        scene.querySelectorAll(".signal-source-tile").forEach(tile => {
          const r = tile.getBoundingClientRect();
          add(
            r.right,
            r.top + r.height / 2,
            candidates.left,
            candidates.top + candidates.height / 2
          );
        });
        for (let i = 0; i < 4; i++)
          add(
            candidates.right,
            candidates.top + candidates.height * (0.3 + i * 0.14),
            qualification.left,
            qualification.top + qualification.height * 0.48 + i * 3
          );
      } else {
        const sources = rect(".signal-source-stack");
        if (sources)
          for (let i = 0; i < 7; i++)
            add(
              sources.right,
              sources.top + sources.height * (0.2 + i * 0.1),
              qualification.left,
              qualification.top + qualification.height * 0.48 + i * 2
            );
      }
      for (let i = 0; i < 4; i++) {
        add(
          qualification.right,
          qualification.top + qualification.height * (0.25 + i * 0.16),
          page.left,
          page.top + page.height * 0.46 + i * 4
        );
        add(
          page.right,
          page.top + page.height * 0.47 + i * 4,
          draft.left,
          draft.top + draft.height * (0.2 + i * 0.2)
        );
      }
      setWires(previous =>
        JSON.stringify(previous) === JSON.stringify(lines) ? previous : lines
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(scene);
    scene
      .querySelectorAll(".signal-card, .signal-source-tile")
      .forEach(node => observer.observe(node));
    measure();
    return () => observer.disconnect();
  }, []);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const node = canvas.current;
    if (!node || paused || wires.length !== 15) {
      setReady(false);
      return;
    }
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let gl: WebGLRenderingContext | null = null;
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let vertex: WebGLShader | null = null;
    let fragment: WebGLShader | null = null;
    let clock: WebGLUniformLocation | null = null;
    let ratio: WebGLUniformLocation | null = null;
    let frame = 0,
      last = 0,
      visible = false,
      failed = false;
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const permitted = () =>
      visible &&
      !document.hidden &&
      !motion.matches &&
      !failed &&
      node.clientWidth > 0;
    function resize() {
      if (!gl || !program) return;
      const scale = Math.min(window.devicePixelRatio || 1, 1.5);
      node!.width = Math.max(1, Math.round(node!.clientWidth * scale));
      node!.height = Math.max(1, Math.round(node!.clientHeight * scale));
      gl.viewport(0, 0, node!.width, node!.height);
      gl.uniform2f(ratio, node!.width, node!.height);
    }
    function init() {
      if (gl || failed) return Boolean(program);
      gl = node!.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        powerPreference: "low-power",
      });
      if (!gl) {
        failed = true;
        return false;
      }
      const shader = (type: number, source: string) => {
        const s = gl!.createShader(type);
        if (!s) return null;
        gl!.shaderSource(s, source);
        gl!.compileShader(s);
        if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
          gl!.deleteShader(s);
          return null;
        }
        return s;
      };
      vertex = shader(
        gl.VERTEX_SHADER,
        "attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}"
      );
      fragment = shader(
        gl.FRAGMENT_SHADER,
        `precision highp float;
        varying vec2 uv; uniform float time; uniform vec2 resolution;
        uniform vec4 wires[15];
        void main(){
          vec2 point=vec2(uv.x,1.-uv.y);
          float light=0.;
          for(int i=0;i<15;i++){
            vec4 wire=wires[i];
            float t=clamp((point.x-wire.x)/max(.001,wire.z-wire.x),0.,1.);
            float y=mix(wire.y,wire.w,t*t*(3.-2.*t));
            float distance=abs(point.y-y)*resolution.y;
            float mask=step(wire.x,point.x)*step(point.x,wire.z);
            float pulse=pow(max(0.,cos(t*4.-time*1.1+float(i)*.4)),16.);
            float line=1.-smoothstep(.25,1.2,distance);
            float glow=exp(-distance*.24)*.18;
            light+=mask*(line*(.40+.60*pulse)+glow*(.25+pulse));
          }
          float alpha=min(light,.9);
          gl_FragColor=vec4(vec3(.88,.93,1.)*alpha,alpha);
        }`
      );
      if (!vertex || !fragment) {
        failed = true;
        return false;
      }
      program = gl.createProgram();
      if (!program) {
        failed = true;
        return false;
      }
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        failed = true;
        return false;
      }
      gl.useProgram(program);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );
      const position = gl.getAttribLocation(program, "position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      clock = gl.getUniformLocation(program, "time");
      ratio = gl.getUniformLocation(program, "resolution");
      gl.uniform4fv(
        gl.getUniformLocation(program, "wires[0]"),
        new Float32Array(wires.flat())
      );
      resize();
      return true;
    }
    function draw(now: number) {
      frame = 0;
      if (!permitted() || !gl) return;
      if (now - last >= 1000 / 30) {
        gl.uniform1f(clock, now / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        last = now;
        setReady(true);
      }
      frame = requestAnimationFrame(draw);
    }
    function sync() {
      stop();
      if (permitted() && init()) frame = requestAnimationFrame(draw);
      else setReady(false);
    }
    const intersection = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    });
    const sizing = new ResizeObserver(() => {
      resize();
      sync();
    });
    const lost = (event: Event) => {
      event.preventDefault();
      failed = true;
      stop();
      setReady(false);
    };
    intersection.observe(node);
    sizing.observe(node);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    node.addEventListener("webglcontextlost", lost);
    return () => {
      stop();
      intersection.disconnect();
      sizing.disconnect();
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
      node.removeEventListener("webglcontextlost", lost);
      if (gl) {
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        gl.deleteShader(vertex);
        gl.deleteShader(fragment);
      }
    };
  }, [paused, wires]);
  return (
    <div ref={field} className="signal-field" aria-hidden="true">
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        className={ready ? "is-dim" : ""}
      >
        {wires.map(([x, y, endX, endY], index) => (
          <path
            key={index}
            vectorEffect="non-scaling-stroke"
            d={Array.from({ length: 33 }, (_, i) => {
              const t = i / 32;
              return `${i ? "L" : "M"}${(x + (endX - x) * t) * 1000} ${(y + (endY - y) * t * t * (3 - 2 * t)) * 1000}`;
            }).join(" ")}
          />
        ))}
      </svg>
      <canvas ref={canvas} className={ready ? "is-ready" : ""} />
    </div>
  );
}
