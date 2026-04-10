<script lang="ts">
  import { lang } from '$lib/stores';
  import { t } from '$lib/i18n';
  import DishCard from '$lib/components/DishCard.svelte';
  import FilterBar from '$lib/components/FilterBar.svelte';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import type { PageData } from './$types';

  export let data: PageData;

  let search = '';
  let sort = 'name-asc';
  let activeFilter = 'all';
  let showFavsOnly = false;
  let favVersion = 0;

  $: allTags = [...new Set(data.allDishes.flatMap((d) => d.flavour_profile))].sort();

  function getFavourites(): string[] {
    if (!browser) return [];
    try { return JSON.parse(localStorage.getItem('jx-cookbook-favourites') || '[]'); } catch { return []; }
  }

  $: filteredDishes = (() => {
    // Reference favVersion to trigger reactivity
    void favVersion;
    const favs = getFavourites();
    const searchLower = search.toLowerCase().trim();

    let result = data.allDishes.filter(d => {
      const title = ($lang === 'zh' ? (d.title_zh || d.title_en) : d.title_en).toLowerCase();
      const matchesSearch = !searchLower || title.includes(searchLower);
      const matchesFilter = activeFilter === 'all' || d.flavour_profile.includes(activeFilter);
      const matchesFavs = !showFavsOnly || favs.includes(d.title_en);
      return matchesSearch && matchesFilter && matchesFavs;
    });

    result.sort((a, b) => {
      const aTitle = $lang === 'zh' ? (a.title_zh || a.title_en) : a.title_en;
      const bTitle = $lang === 'zh' ? (b.title_zh || b.title_en) : b.title_en;
      if (sort === 'name-asc') return aTitle.localeCompare(bTitle);
      if (sort === 'name-desc') return bTitle.localeCompare(aTitle);
      return 0;
    });

    return result;
  })();

  function onFilter(e: CustomEvent) {
    search = e.detail.search;
    sort = e.detail.sort;
    activeFilter = e.detail.activeFilter;
    showFavsOnly = e.detail.showFavsOnly;
  }

  function onFavChange() {
    favVersion++;
  }

  // Modal state
  let modalOpen = false;
  let modalData: any = null;

  function openModal(e: CustomEvent) {
    modalData = e.detail;
    modalOpen = true;
  }

  function closeModal() {
    modalOpen = false;
    modalData = null;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && modalOpen) closeModal();
  }

  onMount(async () => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el));

    // Check for ?open= param to auto-open a dish modal
    const openId = $page.url.searchParams.get('open');
    if (openId) {
      const dish = data.allDishes.find(d => d.id === openId);
      if (dish) {
        const title = $lang === 'zh' ? (dish.title_zh || dish.title_en) : dish.title_en;
        const description = $lang === 'zh' ? (dish.description_zh || dish.description_en) : dish.description_en;
        const steps = $lang === 'zh' ? (dish.steps_zh || dish.steps_en) : dish.steps_en;
        const { getDietaryIcons } = await import('$lib/dietary');
        const dietary = getDietaryIcons(dish.ingredients, dish.flavour_profile, $lang);
        modalData = {
          id: dish.id,
          title,
          description,
          flavours: dish.flavour_profile,
          ingredients: dish.ingredients,
          steps,
          dietary,
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
      <div class="fade-in" style="transition-delay: {(i + 1) * 0.08}s">
        <DishCard {dish} on:openmodal={openModal} on:favchange={onFavChange} />
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
    <div class="absolute inset-0 flex items-center justify-center p-4" on:click|self={closeModal}>
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
            {#if modalData.dietary?.length > 0}
              <div class="flex flex-wrap gap-1.5 mb-3">
                {#each modalData.dietary as icon}
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-surface-lighter/30 text-text-muted">{icon.emoji} {icon.label}</span>
                {/each}
              </div>
            {/if}
            <p class="text-text-muted text-base leading-relaxed">{modalData.description}</p>
          </div>

          <div class="flex flex-wrap gap-1.5">
            {#each modalData.flavours as tag}
              <span class="flavour-tag">{t(`flavour.${tag}`, $lang)}</span>
            {/each}
          </div>

          {#if Object.keys(modalData.ingredients).length > 0}
            <div class="pt-3 border-t border-surface-lighter/20">
              <h4 class="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">{t('recipe.ingredients', $lang)}</h4>
              {#each Object.entries(modalData.ingredients) as [group, items]}
                {#if group !== '_default'}
                  <h5 class="text-xs font-semibold text-primary/70 uppercase tracking-widest mb-1 mt-3">{group}</h5>
                {/if}
                {#each items as item}
                  <div class="flex items-center justify-between py-1 border-b border-surface-lighter/10">
                    <span class="text-text text-sm">{$lang === 'zh' ? (item.name_zh || item.name_en) : item.name_en}</span>
                    <span class="text-text-muted text-xs ml-3 whitespace-nowrap">{item.qty}</span>
                  </div>
                {/each}
              {/each}
            </div>
          {/if}

          {#if modalData.steps}
            <div class="pt-3 border-t border-surface-lighter/20">
              <h4 class="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">{t('recipe.steps', $lang)}</h4>
              <div class="space-y-2">
                {#each modalData.steps.split('\n').filter(Boolean) as step, i}
                  <div class="flex gap-3">
                    <span class="text-primary/40 text-xs font-mono mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <p class="text-text-muted text-sm leading-relaxed">{step}</p>
                  </div>
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
