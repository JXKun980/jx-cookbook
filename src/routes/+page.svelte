<script lang="ts">
  import { lang } from '$lib/stores';
  import { t } from '$lib/i18n';
  import { onMount } from 'svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  const courseOrder = ['appetizer', 'main', 'side', 'dessert'] as const;

  $: menuTitle = $lang === 'zh' ? (data.menu.title_zh || data.menu.title_en) : data.menu.title_en;

  function getDishesForCourse(course: string) {
    const ids = (data.menu.courses as Record<string, string[]>)[course] || [];
    return data.allDishes.filter((d) => ids.includes(d.id));
  }

  $: hasDishes = courseOrder.some((c) => getDishesForCourse(c).length > 0);

  function dishTitle(dish: typeof data.allDishes[0]) {
    return $lang === 'zh' ? (dish.title_zh || dish.title_en) : dish.title_en;
  }

  function dishDesc(dish: typeof data.allDishes[0]) {
    return $lang === 'zh' ? (dish.description_zh || dish.description_en) : dish.description_en;
  }

  let modalOpen = false;
  let modalDish: typeof data.allDishes[0] | null = null;
  let _backdropDown = false;

  function openDishModal(dish: typeof data.allDishes[0]) {
    modalDish = dish;
    modalOpen = true;
  }

  function closeModal() {
    modalOpen = false;
    modalDish = null;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && modalOpen) closeModal();
  }

  let showToast = false;

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    showToast = true;
    setTimeout(() => { showToast = false; }, 2000);
  }

  function shareImage() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const w = 800, h = 1100;
    canvas.width = w;
    canvas.height = h;

    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#c5a55a20';
    ctx.lineWidth = 1;
    ctx.strokeRect(50, 50, w - 100, h - 100);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ede6d6';
    ctx.font = '600 40px Georgia, serif';
    ctx.fillText(menuTitle, w / 2, 140);

    ctx.fillStyle = '#8a744060';
    ctx.font = '12px system-ui, sans-serif';
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillText(dateStr, w / 2, 170);

    ctx.strokeStyle = '#c5a55a20';
    ctx.beginPath();
    ctx.moveTo(250, 200);
    ctx.lineTo(550, 200);
    ctx.stroke();

    let y = 250;
    for (const course of courseOrder) {
      const courseDishes = getDishesForCourse(course);
      if (courseDishes.length === 0) continue;

      ctx.fillStyle = '#c5a55a';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(t(`course.${course}`, $lang).toUpperCase(), w / 2, y);
      y += 40;

      for (const dish of courseDishes) {
        ctx.fillStyle = '#ede6d6';
        ctx.font = '22px Georgia, serif';
        ctx.fillText(dishTitle(dish), w / 2, y);
        y += 28;

        ctx.fillStyle = '#6b6459';
        ctx.font = 'italic 13px Georgia, serif';
        const desc = dishDesc(dish);
        const shortDesc = desc.length > 70 ? desc.slice(0, 70) + '…' : desc;
        ctx.fillText(shortDesc, w / 2, y);
        y += 40;
      }
      y += 20;
    }

    ctx.strokeStyle = '#c5a55a15';
    ctx.beginPath();
    ctx.moveTo(300, h - 110);
    ctx.lineTo(500, h - 110);
    ctx.stroke();

    ctx.fillStyle = '#6b6459';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('JX COOKBOOK', w / 2, h - 80);

    const link = document.createElement('a');
    link.download = 'todays-menu.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  });
</script>

<svelte:head>
  <title>{menuTitle} — JX Cookbook</title>
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<div class="max-w-3xl mx-auto">
  <!-- Header -->
  <div class="text-center mb-20 fade-in">
    <p class="text-primary-dim text-xs uppercase tracking-[0.5em] mb-6">{data.menu.date}</p>
    <div class="flex items-center justify-center gap-8 mb-5">
      <div class="h-px w-20 bg-gradient-to-r from-transparent to-primary/20"></div>
      <svg class="w-4 h-4 text-primary/30" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z"/>
      </svg>
      <div class="h-px w-20 bg-gradient-to-l from-transparent to-primary/20"></div>
    </div>
    <h1 class="font-display text-4xl md:text-5xl font-medium text-text tracking-wide">{menuTitle}</h1>
  </div>

  {#if !hasDishes}
    <div class="text-center py-20 fade-in">
      <p class="text-text-muted italic">{t('menu.empty', $lang)}</p>
    </div>
  {:else}
    <div class="space-y-16">
      {#each courseOrder as course, courseIdx}
        {@const courseDishes = getDishesForCourse(course)}
        {#if courseDishes.length > 0}
          <div class="fade-in" style="transition-delay: {(courseIdx + 1) * 0.15}s">
            <div class="text-center mb-10">
              <p class="font-display text-base text-primary tracking-[0.3em] uppercase">{t(`course.${course}`, $lang)}</p>
            </div>

            <div class="space-y-10">
              {#each courseDishes as dish, dishIdx}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div class="group flex flex-col md:flex-row items-center gap-6 md:gap-8 cursor-pointer" on:click={() => openDishModal(dish)}>
                  {#if data.menu.showImages !== false}
                  <div class="shrink-0 {dishIdx % 2 === 1 ? 'md:order-2' : ''}">
                    <div class="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border border-primary/15 bg-surface-light flex items-center justify-center transition-all duration-500 group-hover:border-primary/30 group-hover:shadow-lg group-hover:shadow-primary/5">
                      {#if dish.hasImage}
                        <img src="/api/image?id={dish.id}" alt={dishTitle(dish)} class="w-full h-full object-cover" />
                      {:else}
                        <svg class="w-10 h-10 text-surface-lighter transition-colors duration-500 group-hover:text-primary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="0.8">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      {/if}
                    </div>
                  </div>
                  {/if}

                  <div class="flex-1 {data.menu.showImages !== false ? `text-center md:text-left ${dishIdx % 2 === 1 ? 'md:text-right' : ''}` : 'text-center'}">
                    <h3 class="font-display text-xl md:text-2xl text-text font-medium tracking-wide mb-2">{dishTitle(dish)}</h3>
                    <p class="text-text-muted text-base leading-relaxed max-w-sm mx-auto {data.menu.showImages !== false ? 'md:mx-0' : ''} mb-3 italic">
                      {dishDesc(dish)}
                    </p>
                    <div class="flex flex-wrap gap-2 justify-center {data.menu.showImages !== false && dishIdx % 2 === 1 ? 'md:justify-end' : data.menu.showImages !== false ? 'md:justify-start' : ''}">
                      {#each dish.tags as tag}
                        <span class="text-xs text-primary-dim uppercase tracking-[0.2em]">{t(`tag.${tag}`, $lang)}</span>
                      {/each}
                    </div>
                  </div>
                </div>
              {/each}
            </div>

            {#if courseIdx < courseOrder.length - 1}
              <div class="flex items-center justify-center mt-16">
                <div class="h-px w-6 bg-primary/15"></div>
                <svg class="mx-4 w-3 h-3 text-primary/20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z"/></svg>
                <div class="h-px w-6 bg-primary/15"></div>
              </div>
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  {/if}

  <!-- Share Section -->
  <div class="mt-24 pt-12 border-t border-surface-lighter/15 text-center fade-in" style="transition-delay: 0.8s">
    <div class="flex justify-center gap-4">
      <button
        on:click={copyLink}
        class="px-5 py-2 text-xs uppercase tracking-[0.2em] text-primary/60 border border-primary/15 rounded-sm hover:border-primary/30 hover:text-primary transition-all duration-300 cursor-pointer"
      >
        {t('menu.copyLink', $lang)}
      </button>
      <button
        on:click={shareImage}
        class="px-5 py-2 text-xs uppercase tracking-[0.2em] text-text-muted border border-surface-lighter/40 rounded-sm hover:border-text-muted/30 hover:text-text transition-all duration-300 cursor-pointer"
      >
        {t('menu.shareImage', $lang)}
      </button>
    </div>
    <div
      class="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-primary text-surface text-sm font-medium rounded-sm shadow-lg transition-opacity duration-300 pointer-events-none z-50"
      class:opacity-0={!showToast}
      class:opacity-100={showToast}
    >
      {t('menu.copied', $lang)}
    </div>
  </div>

  <!-- CTA -->
  <div class="mt-12 text-center fade-in" style="transition-delay: 0.9s">
    <div class="inline-flex items-center gap-4 text-text-muted text-xs tracking-[0.2em] uppercase">
      <div class="h-px w-8 bg-surface-lighter"></div>
      <span>{t('menu.explore', $lang)}</span>
      <div class="h-px w-8 bg-surface-lighter"></div>
    </div>
    <div class="mt-4 flex justify-center">
      <a href="/dishes" class="px-5 py-2 text-xs uppercase tracking-[0.2em] text-primary border border-primary/20 rounded-sm hover:bg-primary/5 transition-all duration-300">
        {t('menu.allDishes', $lang)}
      </a>
    </div>
  </div>
</div>

<!-- Dish Detail Modal -->
{#if modalOpen && modalDish}
  {@const title = dishTitle(modalDish)}
  {@const description = dishDesc(modalDish)}
  {@const steps = $lang === 'zh' ? (modalDish.steps_zh || modalDish.steps_en) : modalDish.steps_en}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="fixed inset-x-0 bottom-0 z-[200]" style="top: 4rem;">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
    <div class="absolute inset-0 flex items-center justify-center p-4" on:mousedown|self={() => { _backdropDown = true }} on:mouseup|self={() => { if (_backdropDown) closeModal(); _backdropDown = false }} on:click|self|preventDefault={() => {}}>
      <div class="relative bg-surface-light border border-surface-lighter/40 rounded-xl max-w-2xl w-full shadow-2xl shadow-black/50 flex flex-col" style="max-height: calc(100vh - 4rem - 2rem);">
       <div class="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          {#if modalDish.hasImage}
            <div class="w-full aspect-[16/9] rounded-lg overflow-hidden bg-surface-lighter/20">
              <img src="/api/image?id={modalDish.id}" alt={title} class="w-full h-full object-cover" />
            </div>
          {/if}
          <div>
            <h2 class="font-display text-2xl font-medium text-text mb-2">{title}</h2>

            <p class="text-text-muted text-base leading-relaxed">{description}</p>
          </div>

          <div class="flex flex-wrap gap-1.5">
            {#each modalDish.tags as tag}
              <span class="tag-pill">{t(`tag.${tag}`, $lang)}</span>
            {/each}
          </div>

          {#if Object.keys(modalDish.ingredients).length > 0}
            <div class="pt-3 border-t border-surface-lighter/20">
              <h4 class="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">{t('recipe.ingredients', $lang)}</h4>
              {#each Object.entries(modalDish.ingredients) as [group, items]}
                {#if group !== '_default'}
                  <h5 class="text-xs font-semibold text-primary/70 uppercase tracking-widest mb-1 mt-3">{group}</h5>
                {/if}
                <div class="flex flex-wrap gap-x-4 gap-y-1">
                  {#each items as item}
                    <span class="text-text text-sm">{$lang === 'zh' ? (item.name_zh || item.name_en) : item.name_en} <span class="text-text-muted/50">·</span> <span class="text-text-muted text-xs">{item.qty}</span></span>
                  {/each}
                </div>
              {/each}
            </div>
          {/if}

          {#if steps}
            <div class="pt-3 border-t border-surface-lighter/20">
              <h4 class="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">{t('recipe.steps', $lang)}</h4>
              <div class="space-y-2">
                {#each steps.split('\n').filter(Boolean) as step}
                  {#if step.startsWith('# ')}
                    <h5 class="text-xs font-semibold text-primary/70 uppercase tracking-widest mt-4 mb-1">{step.slice(2)}</h5>
                  {:else}
                    <div class="flex gap-3">
                      <span class="text-primary/40 text-xs mt-0.5 shrink-0">•</span>
                      <p class="text-text-muted text-sm leading-relaxed">{step}</p>
                    </div>
                  {/if}
                {/each}
              </div>
            </div>
          {/if}

        </div>
        <div class="flex items-center justify-between px-6 py-4 border-t border-surface-lighter/20 shrink-0">
          <button
            on:click={() => window.print()}
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider rounded-md bg-surface-lighter/20 text-text-muted hover:text-text hover:bg-surface-lighter/30 transition-all cursor-pointer"
          >
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {t('recipe.print', $lang)}
          </button>
          <button
            on:click={closeModal}
            class="px-5 py-2 text-xs uppercase tracking-wider text-text-muted border border-surface-lighter/40 rounded-lg hover:text-text hover:border-primary/30 transition-all cursor-pointer"
          >{t('modal.close', $lang)}</button>
        </div>
      </div>
    </div>
  </div>
{/if}
