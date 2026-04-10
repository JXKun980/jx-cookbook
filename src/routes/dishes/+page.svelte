<script lang="ts">
  import { lang } from '$lib/stores';
  import { t } from '$lib/i18n';
  import DishCard from '$lib/components/DishCard.svelte';
  import FilterBar from '$lib/components/FilterBar.svelte';
  import { onMount, afterUpdate } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import type { PageData } from './$types';

  export let data: PageData;

  let filterState = { search: '', sort: 'name-asc', activeFilter: 'all', showFavsOnly: false };
  let favVersion = 0;

  $: allTags = [...new Set(data.allDishes.flatMap((d) => d.tags))].sort();

  function getFavourites(): string[] {
    if (!browser) return [];
    try { return JSON.parse(localStorage.getItem('jx-cookbook-favourites') || '[]'); } catch { return []; }
  }

  let filteredDishes: typeof data.allDishes = [];

  $: {
    const { search, sort, activeFilter, showFavsOnly } = filterState;
    void favVersion;
    const currentLang = $lang;
    const favs = getFavourites();
    const searchLower = search.toLowerCase().trim();

    const result = data.allDishes.filter(d => {
      const title = (currentLang === 'zh' ? (d.title_zh || d.title_en) : d.title_en).toLowerCase();
      const matchesSearch = !searchLower || title.includes(searchLower);
      const matchesFilter = activeFilter === 'all' || d.tags.includes(activeFilter);
      const matchesFavs = !showFavsOnly || favs.includes(d.title_en);
      return matchesSearch && matchesFilter && matchesFavs;
    });

    result.sort((a, b) => {
      const aTitle = currentLang === 'zh' ? (a.title_zh || a.title_en) : a.title_en;
      const bTitle = currentLang === 'zh' ? (b.title_zh || b.title_en) : b.title_en;
      if (sort === 'name-asc') return aTitle.localeCompare(bTitle);
      if (sort === 'name-desc') return bTitle.localeCompare(aTitle);
      return 0;
    });

    filteredDishes = result;
  }

  function onFilter(e: CustomEvent) {
    filterState = { ...e.detail };
  }

  function onFavChange() {
    favVersion++;
  }

  // Modal state
  let modalOpen = false;
  let modalData: any = null;
  let _backdropDown = false;

  function openModal(e: CustomEvent) {
    modalData = e.detail;
    modalOpen = true;
  }

  function closeModal() {
    modalOpen = false;
    modalData = null;
  }

  function formatStep(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-text font-medium">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/==(.+?)==/g, '<mark class="bg-primary/15 text-primary px-1 rounded">$1</mark>');
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && modalOpen) closeModal();
  }

  let initialLoad = true;
  let observer: IntersectionObserver;

  afterUpdate(() => {
    if (!observer) return;
    document.querySelectorAll('.fade-in:not(.visible)').forEach((el) => observer.observe(el));
  });

  onMount(async () => {
    observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el));
    setTimeout(() => { initialLoad = false; }, 1000);

    // Check for ?open= param to auto-open a dish modal
    const openId = $page.url.searchParams.get('open');
    if (openId) {
      const dish = data.allDishes.find(d => d.id === openId);
      if (dish) {
        const title = $lang === 'zh' ? (dish.title_zh || dish.title_en) : dish.title_en;
        const description = $lang === 'zh' ? (dish.description_zh || dish.description_en) : dish.description_en;
        const steps = $lang === 'zh' ? (dish.steps_zh || dish.steps_en) : dish.steps_en;
        modalData = {
          id: dish.id,
          title,
          description,
          tags: dish.tags,
          ingredients: dish.ingredients,
          steps,
        };
        modalOpen = true;
      }
    }

    return () => observer.disconnect();
  });
</script>

<svelte:head>
  <title>{t('dishes.title', $lang)} — JX Cookbook</title>
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<div class="mb-8 fade-in">
  <h1 class="section-title mb-2">{t('dishes.title', $lang)}</h1>
  <p class="text-text-muted text-sm">
    {t('dishes.browse', $lang)} <span class="text-primary">{data.allDishes.length}</span> {t('dishes.inCollection', $lang)}
  </p>
</div>

<div class="fade-in" style="transition-delay: 0.1s">
  <FilterBar {allTags} on:filter={onFilter} />
</div>

{#if filteredDishes.length === 0}
  <div class="text-center py-16">
    <p class="text-text-muted text-lg italic">{t('dishes.noResults', $lang)}</p>
  </div>
{:else}
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each filteredDishes as dish, i (dish.id)}
      <div class="fade-in" style={initialLoad ? `transition-delay: ${(i + 1) * 0.08}s` : ''}>
        <DishCard {dish} showImage={data.showDishImages} on:openmodal={openModal} on:favchange={onFavChange} />
      </div>
    {/each}
  </div>
{/if}

<!-- Dish Detail Modal -->
{#if modalOpen && modalData}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="fixed inset-x-0 bottom-0 z-[200]" style="top: 4rem;">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
    <div class="absolute inset-0 flex items-center justify-center p-4" on:mousedown|self={() => { _backdropDown = true }} on:mouseup|self={() => { if (_backdropDown) closeModal(); _backdropDown = false }} on:click|self|preventDefault={() => {}}>
      <div class="relative bg-surface-light border border-surface-lighter/40 rounded-xl max-w-2xl w-full shadow-2xl shadow-black/50 flex flex-col" style="max-height: calc(100vh - 4rem - 2rem);">
        <div class="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          {#if modalData.id}
            {@const dish = data.allDishes.find(d => d.id === modalData.id)}
            {#if dish?.hasImage}
              <div class="w-full aspect-[16/9] rounded-lg overflow-hidden bg-surface-lighter/20">
                <img src="/api/image?id={dish.id}" alt={modalData.title} class="w-full h-full object-cover" />
              </div>
            {/if}
          {/if}
          <div>
            <h2 class="font-display text-2xl font-medium text-text mb-2">{modalData.title}</h2>

            <p class="text-text-muted text-base leading-relaxed">{modalData.description}</p>
          </div>

          <div class="flex flex-wrap gap-1.5">
            {#each (modalData.tags || []) as tag}
              <span class="tag-pill">{t(`tag.${tag}`, $lang)}</span>
            {/each}
          </div>

          {#if Object.keys(modalData.ingredients).length > 0}
            <div class="pt-3 border-t border-surface-lighter/20">
              <h4 class="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">{t('recipe.ingredients', $lang)}</h4>
              {#each Object.entries(modalData.ingredients) as [group, items]}
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

          {#if modalData.steps}
            <div class="pt-3 border-t border-surface-lighter/20">
              <h4 class="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">{t('recipe.steps', $lang)}</h4>
              <div class="space-y-2">
                {#each modalData.steps.split('\n').filter(Boolean) as step}
                  {#if step.startsWith('# ')}
                    <h5 class="text-xs font-semibold text-primary/70 uppercase tracking-widest mt-4 mb-1">{step.slice(2)}</h5>
                  {:else}
                    <div class="flex gap-3">
                      <span class="text-primary/40 text-xs mt-0.5 shrink-0">•</span>
                      <p class="text-text-muted text-sm leading-relaxed">{@html formatStep(step)}</p>
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
