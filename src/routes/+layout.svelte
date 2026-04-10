<script lang="ts">
  import '../styles/global.css';
  import ParticlesBg from '$lib/components/ParticlesBg.svelte';
  import { lang, auth } from '$lib/stores';
  import { t } from '$lib/i18n';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  let authed = false;

  $: currentPath = $page.url.pathname;
  $: activePage = currentPath === '/' ? 'menu' : currentPath === '/dishes' ? 'dishes' : currentPath === '/admin' ? 'admin' : '';

  onMount(() => {
    if (browser) {
      const stored = localStorage.getItem('jx-cookbook-auth');
      if (stored) {
        auth.set(stored);
        authed = true;
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  });

  auth.subscribe(val => {
    authed = !!val;
  });

  function toggleLang() {
    lang.toggle();
  }
</script>

<ParticlesBg />

<nav class="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-lg border-b border-surface-lighter/20">
  <div class="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
    <a href="/" class="text-primary text-3xl leading-none" style="font-family: 'Great Vibes', cursive;">
      Junxian
    </a>
    <div class="flex items-center gap-1">
      <a href="/" class="nav-link" class:active={activePage === 'menu'}>{t('nav.menu', $lang)}</a>
      <a href="/dishes" class="nav-link" class:active={activePage === 'dishes'}>{t('nav.dishes', $lang)}</a>
      {#if authed || activePage === 'admin'}
        <a href="/admin" class="nav-link" class:active={activePage === 'admin'}>{t('nav.admin', $lang)}</a>
      {/if}
    </div>
    <div class="flex items-center gap-2 ml-4">
      <button
        on:click={toggleLang}
        class="text-[10px] px-2 py-1 rounded border border-surface-lighter/30 text-text-muted hover:text-primary hover:border-primary/20 transition-all duration-300 cursor-pointer"
      >
        {$lang === 'zh' ? 'EN' : '中'}
      </button>
    </div>
  </div>
</nav>

<main class="pt-24 pb-16 px-6 relative">
  <div class="max-w-6xl mx-auto">
    <slot />
  </div>
</main>

<footer class="border-t border-surface-lighter/15 py-8 px-6">
  <div class="max-w-6xl mx-auto flex items-center justify-center gap-3">
    <span class="text-text-muted/50 text-xs tracking-wider uppercase">
      &copy; {new Date().getFullYear()} {t('footer.copyright', $lang)}
    </span>
    {#if !authed && activePage !== 'admin'}
      <a href="/admin" class="text-surface-lighter/30 hover:text-primary/40 transition-colors duration-500" title="Admin access">
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
        </svg>
      </a>
    {/if}
  </div>
</footer>
