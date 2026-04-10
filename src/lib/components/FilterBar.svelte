<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { lang } from '$lib/stores';
  import { t } from '$lib/i18n';

  export let allTags: string[] = [];

  const dispatch = createEventDispatcher();

  const popularTags = ['savory', 'sweet', 'spicy', 'umami', 'crispy', 'comfort', 'light', 'rich'];
  const categories: { key: string; tags: string[] }[] = [
    { key: 'taste', tags: ['savory', 'sweet', 'salty', 'sour', 'bitter', 'umami', 'tangy', 'tart', 'mild', 'briny', 'malty', 'caramelized', 'fermented', 'pickled', 'zesty', 'vinegary'] },
    { key: 'heat', tags: ['mild-spice', 'spicy', 'fiery', 'numbing', 'peppery', 'hot', 'smoky-spice', 'wasabi', 'chili-oil', 'mala'] },
    { key: 'texture', tags: ['crispy', 'crunchy', 'creamy', 'silky', 'chewy', 'tender', 'flaky', 'fluffy', 'velvety', 'crumbly', 'juicy', 'gelatinous', 'al-dente', 'crisp', 'melt-in-mouth', 'sticky', 'dense', 'airy'] },
    { key: 'richness', tags: ['rich', 'buttery', 'light', 'clean', 'hearty', 'decadent', 'delicate', 'luscious', 'velvety-rich', 'robust', 'subtle', 'bold', 'balanced'] },
    { key: 'aroma', tags: ['smoky', 'aromatic', 'herby', 'garlicky', 'citrusy', 'earthy', 'nutty', 'floral', 'fragrant', 'charred', 'woody', 'truffle', 'sesame', 'musky', 'grassy', 'toasty', 'caramel', 'vanilla', 'minty', 'gingery'] },
    { key: 'mood', tags: ['comfort', 'refreshing', 'warming', 'cooling', 'homestyle', 'indulgent', 'celebratory', 'rustic', 'elegant', 'nostalgic', 'street-food', 'fine-dining'] },
    { key: 'cuisine', tags: ['asian', 'chinese', 'japanese', 'korean', 'thai', 'southeast-asian', 'indian', 'western', 'french', 'italian', 'mediterranean', 'mexican', 'latin', 'middle-eastern', 'fusion'] },
  ];

  let search = '';
  let sort = 'name-asc';
  let activeFilter = 'all';
  let showFavsOnly = false;
  let expanded = false;

  $: popularAvailable = popularTags.filter(tag => allTags.includes(tag));
  $: categoriesAvailable = categories.map(cat => ({
    ...cat,
    available: cat.tags.filter(tag => allTags.includes(tag)),
  })).filter(cat => cat.available.length > 0);

  function emitFilter() {
    dispatch('filter', { search, sort, activeFilter, showFavsOnly });
  }

  function setFilter(tag: string) {
    if (tag === 'favs') {
      showFavsOnly = !showFavsOnly;
    } else {
      activeFilter = tag;
      showFavsOnly = false;
    }
    emitFilter();
  }

  function onSearch() {
    emitFilter();
  }

  function onSort() {
    emitFilter();
  }
</script>

<div class="space-y-4 mb-8">
  <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
    <div class="relative flex-1 max-w-md">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        bind:value={search}
        on:input={onSearch}
        placeholder={t('dishes.search', $lang)}
        class="w-full pl-10 pr-4 py-2 bg-surface-light border border-surface-lighter/40 rounded-lg text-text text-sm placeholder:text-text-muted/40 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/10 transition-all duration-300"
      />
    </div>

    <div class="flex items-center gap-2">
      <label class="text-text-muted text-xs uppercase tracking-wider">{t('dishes.sort', $lang)}</label>
      <select
        bind:value={sort}
        on:change={onSort}
        class="bg-surface-light border border-surface-lighter/40 rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-primary/30 transition-all duration-300"
      >
        <option value="name-asc">{t('dishes.sortAZ', $lang)}</option>
        <option value="name-desc">{t('dishes.sortZA', $lang)}</option>
      </select>
    </div>
  </div>

  <!-- Popular tags -->
  <div class="flex flex-wrap gap-2 items-center">
    <button
      class="filter-btn"
      class:active={!showFavsOnly && activeFilter === 'all'}
      on:click={() => setFilter('all')}
    >{t('dishes.all', $lang)}</button>
    <button
      class="filter-btn inline-flex items-center gap-1"
      class:active={showFavsOnly}
      on:click={() => setFilter('favs')}
    ><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg> {t('dishes.favourites', $lang)}</button>
    {#each popularAvailable as tag}
      <button
        class="filter-btn"
        class:active={activeFilter === tag && !showFavsOnly}
        on:click={() => setFilter(tag)}
      >{t(`tag.${tag}`, $lang)}</button>
    {/each}
    <button
      class="filter-btn text-primary/70 border-primary/20 hover:border-primary/40 hover:text-primary flex items-center gap-1"
      on:click={() => { expanded = !expanded }}
    >
      {expanded ? t('filter.showLess', $lang) : t('filter.showMore', $lang)}
      <svg class="w-3 h-3 transition-transform duration-200" class:rotate-180={expanded} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  </div>

  <!-- Expanded categories -->
  {#if expanded}
    <div class="space-y-3 pt-2 border-t border-surface-lighter/15">
      {#each categoriesAvailable as cat}
        <div>
          <p class="text-text-muted text-[10px] uppercase tracking-widest mb-1.5">{t(`filter.${cat.key}`, $lang)}</p>
          <div class="flex flex-wrap gap-1.5">
            {#each cat.available as tag}
              <button
                class="filter-btn"
                class:active={activeFilter === tag}
                on:click={() => setFilter(tag)}
              >{t(`tag.${tag}`, $lang)}</button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
