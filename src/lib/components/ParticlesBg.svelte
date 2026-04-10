<script lang="ts">
  import { onMount } from 'svelte';

  let canvas: HTMLCanvasElement;

  onMount(() => {
    const ctx = canvas.getContext('2d')!;

    let w = 0, h = 0;
    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    interface Particle { x: number; y: number; r: number; vx: number; vy: number; o: number; phase: number }

    const isMobile = window.innerWidth < 768;
    const bokehCount = Math.max(3, Math.min(10, Math.floor(window.innerWidth / 150)));
    const bokehs: Particle[] = Array.from({ length: bokehCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: isMobile ? Math.random() * 120 + 80 : Math.random() * 100 + 50,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.06,
      o: isMobile ? Math.random() * 0.08 + 0.08 : Math.random() * 0.06 + 0.04,
      phase: Math.random() * Math.PI * 2,
    }));

    const count = Math.max(20, Math.min(70, Math.floor(window.innerWidth / 18)));
    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.8 + 0.5,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -(Math.random() * 0.2 + 0.05),
      o: Math.random() * 0.35 + 0.15,
      phase: Math.random() * Math.PI * 2,
    }));

    let time = 0;
    let animId: number;

    function draw() {
      ctx.clearRect(0, 0, w, h);
      time += 0.005;

      bokehs.forEach(b => {
        b.x += b.vx + Math.sin(time * 0.7 + b.phase) * 0.15;
        b.y += b.vy + Math.cos(time * 0.5 + b.phase) * 0.1;
        if (b.x < -b.r) b.x = w + b.r;
        if (b.x > w + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = h + b.r;
        if (b.y > h + b.r) b.y = -b.r;

        const pulse = 0.8 + 0.2 * Math.sin(time * 1.5 + b.phase);
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grad.addColorStop(0, `rgba(197, 165, 90, ${b.o * pulse})`);
        grad.addColorStop(0.5, `rgba(197, 165, 90, ${b.o * pulse * 0.3})`);
        grad.addColorStop(1, 'rgba(197, 165, 90, 0)');
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      particles.forEach(p => {
        p.x += p.vx + Math.sin(time + p.phase) * 0.1;
        p.y += p.vy;
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        const flicker = 0.85 + 0.15 * Math.sin(time * 3 + p.phase);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(197, 165, 90, ${p.o * flicker})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  });
</script>

<canvas bind:this={canvas} class="fixed inset-0 pointer-events-none z-0"></canvas>
