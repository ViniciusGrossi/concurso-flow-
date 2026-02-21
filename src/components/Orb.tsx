'use client';
// Neon Orb — WebGL shader component (humanized & optimized)
import { Mesh, Program, Renderer, Triangle, Vec3 } from 'ogl';
import { useEffect, useRef } from 'react';

interface OrbProps {
  hue?: number;
  hoverIntensity?: number;
  rotateOnHover?: boolean;
  size?: number;
}

const vert = /* glsl */`
    precision highp float;
    attribute vec2 position;
    attribute vec2 uv;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 0.0, 1.0);
    }
`;

const frag = /* glsl */`
    precision highp float;
    uniform float iTime;
    uniform vec3 iResolution;
    uniform float hue;
    uniform float hover;
    uniform float rot;
    uniform float hoverIntensity;
    varying vec2 vUv;

    vec3 rgb2yiq(vec3 c) {
      return vec3(
        dot(c, vec3(0.299, 0.587, 0.114)),
        dot(c, vec3(0.596, -0.274, -0.322)),
        dot(c, vec3(0.211, -0.523, 0.312))
      );
    }
    vec3 yiq2rgb(vec3 c) {
      return vec3(
        c.x + 0.956*c.y + 0.621*c.z,
        c.x - 0.272*c.y - 0.647*c.z,
        c.x - 1.106*c.y + 1.703*c.z
      );
    }
    vec3 adjustHue(vec3 color, float hueDeg) {
      float hueRad = hueDeg * 3.14159265 / 180.0;
      vec3 yiq = rgb2yiq(color);
      float cosA = cos(hueRad); float sinA = sin(hueRad);
      yiq.y = yiq.y*cosA - yiq.z*sinA;
      yiq.z = yiq.y*sinA + yiq.z*cosA;
      return yiq2rgb(yiq);
    }
    vec3 hash33(vec3 p3) {
      p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
      p3 += dot(p3, p3.yxz + 19.19);
      return -1.0 + 2.0 * fract(vec3(p3.x+p3.y, p3.x+p3.z, p3.y+p3.z)*p3.zyx);
    }
    float snoise3(vec3 p) {
      const float K1 = 0.333333333; const float K2 = 0.166666667;
      vec3 i = floor(p + (p.x+p.y+p.z)*K1);
      vec3 d0 = p - (i - (i.x+i.y+i.z)*K2);
      vec3 e = step(vec3(0.0), d0 - d0.yzx);
      vec3 i1 = e*(1.0-e.zxy); vec3 i2 = 1.0-e.zxy*(1.0-e);
      vec4 h = max(0.6 - vec4(dot(d0,d0),dot(d0-i1+K2,d0-i1+K2),dot(d0-i2+K1,d0-i2+K1),dot(d0-0.5,d0-0.5)),0.0);
      return dot(vec4(31.316), h*h*h*h*vec4(dot(d0,hash33(i)),dot(d0-i1+K2,hash33(i+i1)),dot(d0-i2+K1,hash33(i+i2)),dot(d0-0.5,hash33(i+1.0))));
    }
    vec4 extractAlpha(vec3 colorIn) {
      float a = max(max(colorIn.r, colorIn.g), colorIn.b);
      return vec4(colorIn.rgb/(a+1e-5), a);
    }
    const vec3 baseColor1 = vec3(0.611765, 0.262745, 0.996078);
    const vec3 baseColor2 = vec3(0.298039, 0.760784, 0.913725);
    const vec3 baseColor3 = vec3(0.062745, 0.078431, 0.600000);
    const float innerRadius = 0.6;
    const float noiseScale = 0.65;
    float light1(float i, float a, float d) { return i/(1.0+d*a); }
    float light2(float i, float a, float d) { return i/(1.0+d*d*a); }
    vec4 draw(vec2 uv, float iTime, float hue, float hover, float hoverIntensity) {
      vec3 c1 = adjustHue(baseColor1, hue);
      vec3 c2 = adjustHue(baseColor2, hue);
      vec3 c3 = adjustHue(baseColor3, hue);
      float ang = atan(uv.y, uv.x);
      float len = length(uv);
      float invLen = len>0.0 ? 1.0/len : 0.0;
      float n0 = snoise3(vec3(uv*noiseScale, iTime*0.5))*0.5+0.5;
      float r0 = mix(mix(innerRadius,1.0,0.4), mix(innerRadius,1.0,0.6), n0);
      float d0 = distance(uv, (r0*invLen)*uv);
      float v0 = light1(1.0,10.0,d0);
      v0 *= smoothstep(r0*1.05, r0, len);
      v0 *= smoothstep(r0*0.8, r0*0.95, len);
      float cl = cos(ang + iTime*2.0)*0.5+0.5;
      float a = iTime*-1.0;
      vec2 pos = vec2(cos(a),sin(a))*r0;
      float d1 = distance(uv, pos);
      float v1 = light2(1.5,5.0,d1)*light1(1.0,50.0,d0);
      float v2 = smoothstep(1.0, mix(innerRadius,1.0,n0*0.5), len);
      float v3 = smoothstep(innerRadius, mix(innerRadius,1.0,0.5), len);
      uv.x += hover*hoverIntensity*0.1*sin(uv.y*10.0+iTime);
      uv.y += hover*hoverIntensity*0.1*sin(uv.x*10.0+iTime);
      vec3 col = (mix(c1,c2,cl)+v1)*v2*v3;
      col = mix(c3, col, v0);
      return extractAlpha(clamp(col, 0.0, 1.0));
    }
    void main() {
      vec2 center = iResolution.xy*0.5;
      float sz = min(iResolution.x, iResolution.y);
      vec2 uv = (vUv*iResolution.xy - center)/sz*2.0;
      float s=sin(rot); float c=cos(rot);
      uv = vec2(c*uv.x-s*uv.y, s*uv.x+c*uv.y);
      vec4 col = draw(uv, iTime, hue, hover, hoverIntensity);
      gl_FragColor = vec4(col.rgb*col.a, col.a);
    }
`;

export default function Orb({ hue = 220, hoverIntensity = 0.3, rotateOnHover = true, size = 400 }: OrbProps) {
  const ctnDom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ctnDom.current;
    if (!container) return;
    const renderer = new Renderer({ alpha: true, premultipliedAlpha: false });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vert,
      fragment: frag,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Vec3(gl.canvas.width, gl.canvas.height, 1) },
        hue: { value: hue },
        hover: { value: 0 },
        rot: { value: 0 },
        hoverIntensity: { value: hoverIntensity },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    function resize() {
      if (!container) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w * dpr, h * dpr);
      gl.canvas.style.width = w + 'px';
      gl.canvas.style.height = h + 'px';
      if (program.uniforms.iResolution.value instanceof Vec3) {
        program.uniforms.iResolution.value.set(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height);
      }
    }
    window.addEventListener('resize', resize);
    resize();

    let targetHover = 0;
    let lastTime = 0;
    let currentRot = 0;

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const cx = rect.width / 2; const cy = rect.height / 2;
      const sz = Math.min(rect.width, rect.height);
      const ux = ((e.clientX - rect.left - cx) / sz) * 2;
      const uy = ((e.clientY - rect.top - cy) / sz) * 2;
      targetHover = Math.sqrt(ux * ux + uy * uy) < 0.8 ? 1 : 0;
    };

    container.addEventListener('mousemove', onMove);
    container.addEventListener('mouseleave', () => { targetHover = 0; });

    let rafId: number;
    const update = (t: number) => {
      rafId = requestAnimationFrame(update);
      const dt = (t - lastTime) * 0.001;
      lastTime = t;
      program.uniforms.iTime.value = t * 0.001;
      program.uniforms.hover.value += (targetHover - program.uniforms.hover.value) * 0.1;
      if (rotateOnHover && targetHover > 0.5) currentRot += dt * 0.3;
      program.uniforms.rot.value = currentRot;
      renderer.render({ scene: mesh });
    };
    rafId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      container.removeEventListener('mousemove', onMove);
      if (container.contains(gl.canvas)) container.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [hue, hoverIntensity, rotateOnHover]);

  return (
    <div
      ref={ctnDom}
      style={{ width: size, height: size, maxWidth: '90vw', maxHeight: '90vw' }}
    />
  );
}
