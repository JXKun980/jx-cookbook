<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { lang } from '$lib/stores';
  import { t } from '$lib/i18n';
  import type { Dish } from '$lib/types';
  import { browser } from '$app/environment';

  export let dish: Dish;
  export let showImage: boolean = true;

  const dispatch = createEventDispatcher();

  const FAVS_KEY = 'jx-cookbook-favourites';

  function getFavourites(): string[] {
    if (!browser) return [];
    try { return JSON.parse(localStorage.getItem(FAVS_KEY) || '[]'); } catch { return []; }
  }

  function saveFavourites(favs: string[]) {
    if (browser) localStorage.setItem(FAVS_KEY, JSON.stringify(favs));
  }

  let isFav = false;

  $: if (browser) {
    isFav = getFavourites().includes(dish.title_en);
  }

  $: title = $lang === 'zh' ? (dish.title_zh || dish.title_en) : dish.title_en;
  $: description = $lang === 'zh' ? (dish.description_zh || dish.description_en) : dish.description_en;
  $: steps = $lang === 'zh' ? (dish.steps_zh || dish.steps_en) : dish.steps_en;


  function toggleFav(e: Event) {
    e.stopPropagation();
    const favs = getFavourites();
    const idx = favs.indexOf(dish.title_en);
    if (idx >= 0) favs.splice(idx, 1);
    else favs.push(dish.title_en);
    saveFavourites(favs);
    isFav = favs.includes(dish.title_en);
    dispatch('favchange');
  }

  function openModal() {
    dispatch('openmodal', {
      id: dish.id,
      title,
      description,
      tags: dish.tags,
      ingredients: dish.ingredients,
      steps,
    });
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="dish-card group cursor-pointer" on:click={openModal}>
  {#if showImage}
  <div class="dish-card-image">
    {#if dish.hasImage}
      <img src="/api/image?id={dish.id}" alt={title} class="absolute inset-0 w-full h-full object-cover" />
    {:else}
      <svg class="placeholder-icon w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="0.8">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    {/if}
    <div class="absolute inset-0 bg-gradient-to-t from-surface-light via-transparent to-transparent"></div>
    <div class="absolute bottom-3 left-4 right-4">
      <h3 class="font-display text-lg font-medium text-text leading-tight">{title}</h3>
    </div>
    <button
      class="fav-btn absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-surface/50 backdrop-blur-sm border border-surface-lighter/30 transition-all duration-300 cursor-pointer"
      class:text-red-400={isFav}
      class:text-text-muted={!isFav}
      on:click={toggleFav}
      aria-label="Toggle favourite"
    >
      <svg class="w-4 h-4" fill={isFav ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    </button>
  </div>
  {:else}
  <div class="px-4 pt-4 flex items-center justify-between">
    <h3 class="font-display text-lg font-medium text-text leading-tight">{title}</h3>
    <button
      class="fav-btn w-8 h-8 flex items-center justify-center rounded-full bg-surface/50 border border-surface-lighter/30 transition-all duration-300 cursor-pointer shrink-0"
      class:text-red-400={isFav}
      class:text-text-muted={!isFav}
      on:click={toggleFav}
      aria-label="Toggle favourite"
    >
      <svg class="w-4 h-4" fill={isFav ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    </button>
  </div>
  {/if}

  <div class="p-4 space-y-3">
    <p class="text-text-muted text-sm leading-relaxed line-clamp-2">{description}</p>

    <div class="flex flex-wrap gap-1.5">
      {#each dish.tags as tag}
        <span class="tag-pill">{t(`tag.${tag}`, $lang)}</span>
      {/each}
    </div>


  </div>
</div>
