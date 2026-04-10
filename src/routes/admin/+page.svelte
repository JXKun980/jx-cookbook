<script lang="ts">
  import { auth } from '$lib/stores';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import type { Dish, MenuConfig, Ingredient } from '$lib/types';

  const FLAVOUR_CATEGORIES = [
    { label: 'Taste', tags: ['savory','sweet','salty','sour','bitter','umami','tangy','tart','mild','briny','malty','caramelized','fermented','pickled','zesty','vinegary'] },
    { label: 'Heat', tags: ['mild-spice','spicy','fiery','numbing','peppery','hot','smoky-spice','wasabi','chili-oil','mala'] },
    { label: 'Texture', tags: ['crispy','crunchy','creamy','silky','chewy','tender','flaky','fluffy','velvety','crumbly','juicy','gelatinous','al-dente','crisp','melt-in-mouth','sticky','dense','airy'] },
    { label: 'Richness', tags: ['rich','buttery','light','clean','hearty','decadent','delicate','luscious','velvety-rich','robust','subtle','bold','balanced'] },
    { label: 'Aroma', tags: ['smoky','aromatic','herby','garlicky','citrusy','earthy','nutty','floral','fragrant','charred','woody','truffle','sesame','musky','grassy','toasty','caramel','vanilla','minty','gingery'] },
    { label: 'Mood', tags: ['comfort','refreshing','warming','cooling','homestyle','indulgent','celebratory','rustic','elegant','nostalgic','street-food','fine-dining'] },
    { label: 'Cuisine', tags: ['asian','chinese','japanese','korean','thai','southeast-asian','indian','western','french','italian','mediterranean','mexican','latin','middle-eastern','fusion'] },
  ];

  const COURSES = [
    { key: 'appetizer', label: 'Appetizer' },
    { key: 'main', label: 'Main Course' },
    { key: 'side', label: 'Side' },
    { key: 'dessert', label: 'Dessert' },
  ];

  let password = '';
  let passwordInput = '';
  let authed = false;
  let authError = false;
  let dishes: Dish[] = [];
  let menu: MenuConfig = { date: '', title_en: "Today's Menu", title_zh: '今日菜单', courses: { appetizer: [], main: [], side: [], dessert: [] } };

  let activeTab: 'dishes' | 'menu' = 'dishes';
  let dishSearch = '';
  let dishSort = 'name-asc';

  // Editor state
  let editorOpen = false;
  let editingId: string | null = null;
  let titleEn = '';
  let titleZh = '';
  let descEn = '';
  let descZh = '';
  let stepsEn = '';
  let stepsZh = '';
  let selectedFlavours: string[] = [];
  let flavoursExpanded = false;
  let ingredientGroups: { name: string; items: { name_en: string; name_zh: string; qty: string }[] }[] = [{ name: '_default', items: [{ name_en: '', name_zh: '', qty: '' }] }];
  let imageDataUrl: string | null = null;
  let imagePreviewSrc: string | null = null;
  let selectedCourses: string[] = [];
  let initialFormState = '';
  let saving = false;

  // Menu state
  let courseSearches: Record<string, string> = { appetizer: '', main: '', side: '', dessert: '' };
  let courseDropdownOpen: Record<string, boolean> = { appetizer: false, main: false, side: false, dessert: false };
  let menuSaving = false;
  let menuSaveLabel = 'Save Menu';

  function getFormState(): string {
    return JSON.stringify({ titleEn, titleZh, descEn, descZh, stepsEn, stepsZh, selectedFlavours, ingredientGroups, imageDataUrl, selectedCourses });
  }

  function isDirty(): boolean {
    return getFormState() !== initialFormState;
  }

  $: sortedDishes = (() => {
    let result = [...dishes];
    const q = dishSearch.toLowerCase().trim();
    if (q) result = result.filter(d => d.title_en.toLowerCase().includes(q) || (d.title_zh || '').toLowerCase().includes(q));
    result.sort((a, b) => {
      if (dishSort === 'name-asc') return a.title_en.localeCompare(b.title_en);
      if (dishSort === 'name-desc') return b.title_en.localeCompare(a.title_en);
      return 0;
    });
    return result;
  })();

  async function tryAuth() {
    try {
      const res = await fetch('/api/dishes', { headers: { Authorization: password } });
      if (res.ok) {
        if (browser) localStorage.setItem('jx-cookbook-auth', password);
        auth.set(password);
        authed = true;
        dishes = await res.json();
        await loadMenu();
        observeFadeIns();
      } else {
        authError = true;
        setTimeout(() => { authError = false; }, 2000);
      }
    } catch {
      if (browser) {
        authed = true;
        dishes = [];
      }
    }
  }

  async function loadMenu() {
    const res = await fetch('/api/menu', { headers: { Authorization: password } });
    if (res.ok) menu = await res.json();
    if (!menu.date) menu.date = new Date().toISOString().split('T')[0];
  }

  function openEditor(dish?: Dish) {
    if (dish) {
      editingId = dish.id;
      titleEn = dish.title_en;
      titleZh = dish.title_zh || '';
      descEn = dish.description_en;
      descZh = dish.description_zh || '';
      stepsEn = dish.steps_en;
      stepsZh = dish.steps_zh || '';
      selectedFlavours = [...(dish.flavour_profile || [])];
      ingredientGroups = Object.entries(dish.ingredients || {}).map(([name, items]) => ({
        name, items: (items as Ingredient[]).map(i => ({ ...i }))
      }));
      if (ingredientGroups.length === 0) ingredientGroups = [{ name: '_default', items: [{ name_en: '', name_zh: '', qty: '' }] }];
      selectedCourses = COURSES.map(c => c.key).filter(k => ((menu.courses as any)?.[k] || []).includes(dish.id));
      imageDataUrl = null;
      imagePreviewSrc = dish.hasImage ? `/api/image?id=${dish.id}` : null;
    } else {
      editingId = null;
      titleEn = ''; titleZh = ''; descEn = ''; descZh = ''; stepsEn = ''; stepsZh = '';
      selectedFlavours = [];
      ingredientGroups = [{ name: '_default', items: [{ name_en: '', name_zh: '', qty: '' }] }];
      selectedCourses = [];
      imageDataUrl = null;
      imagePreviewSrc = null;
    }
    editorOpen = true;
    initialFormState = getFormState();
  }

  function tryCloseEditor() {
    if (isDirty()) {
      if (!confirm('You have unsaved changes. Discard them?')) return;
    }
    editorOpen = false;
  }

  function toggleFlavour(f: string) {
    if (selectedFlavours.includes(f)) selectedFlavours = selectedFlavours.filter(x => x !== f);
    else selectedFlavours = [...selectedFlavours, f];
  }

  function toggleCourse(k: string) {
    if (selectedCourses.includes(k)) selectedCourses = selectedCourses.filter(x => x !== k);
    else selectedCourses = [...selectedCourses, k];
  }

  function addIngredient(gi: number) {
    ingredientGroups[gi].items = [...ingredientGroups[gi].items, { name_en: '', name_zh: '', qty: '' }];
    ingredientGroups = ingredientGroups;
  }

  function removeIngredient(gi: number, ii: number) {
    ingredientGroups[gi].items.splice(ii, 1);
    ingredientGroups = [...ingredientGroups];
  }

  function addGroup() {
    ingredientGroups = [...ingredientGroups, { name: 'New Group', items: [{ name_en: '', name_zh: '', qty: '' }] }];
  }

  function removeGroup(gi: number) {
    ingredientGroups.splice(gi, 1);
    ingredientGroups = [...ingredientGroups];
  }

  function onImageChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      imageDataUrl = reader.result as string;
      imagePreviewSrc = imageDataUrl;
    };
    reader.readAsDataURL(file);
  }

  async function saveDish() {
    if (!titleEn.trim()) { alert('Title (EN) is required'); return; }
    saving = true;

    const id = editingId || titleEn.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const ingredients: Record<string, Ingredient[]> = {};
    ingredientGroups.forEach(g => {
      const filtered = g.items.filter(i => i.name_en.trim());
      if (filtered.length > 0) ingredients[g.name] = filtered;
    });

    const dish: Dish = {
      id,
      title_en: titleEn.trim(),
      title_zh: titleZh.trim(),
      description_en: descEn.trim(),
      description_zh: descZh.trim(),
      flavour_profile: selectedFlavours,
      ingredients,
      steps_en: stepsEn.trim(),
      steps_zh: stepsZh.trim(),
      hasImage: imageDataUrl !== null || dishes.find(d => d.id === id)?.hasImage || false,
    };

    try {
      const dishPromise = fetch('/api/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: password },
        body: JSON.stringify(dish)
      });

      const imagePromise = imageDataUrl ? fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: password },
        body: JSON.stringify({ id: dish.id, image: imageDataUrl })
      }) : Promise.resolve(null);

      const [res, imgRes] = await Promise.all([dishPromise, imagePromise]);

      if (res.ok) {
        if (imgRes) dish.hasImage = true;
        const idx = dishes.findIndex(d => d.id === id);
        if (idx >= 0) dishes[idx] = dish;
        else dishes.push(dish);
        dishes = [...dishes];

        COURSES.forEach(c => {
          if (!menu.courses[c.key]) menu.courses[c.key] = [];
          const arr = menu.courses[c.key] as string[];
          const inCourse = arr.includes(id);
          const shouldBe = selectedCourses.includes(c.key);
          if (shouldBe && !inCourse) arr.push(id);
          else if (!shouldBe && inCourse) menu.courses[c.key] = arr.filter((x: string) => x !== id);
        });
        await fetch('/api/menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: password },
          body: JSON.stringify(menu)
        });
        menu = { ...menu };
        editorOpen = false;
      }
    } finally {
      saving = false;
    }
  }

  async function deleteDish(id: string) {
    if (!confirm('Delete this dish?')) return;
    await fetch('/api/dishes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: password },
      body: JSON.stringify({ id })
    });
    dishes = dishes.filter(d => d.id !== id);
    COURSES.forEach(c => {
      if (menu.courses[c.key]) {
        menu.courses[c.key] = (menu.courses[c.key] as string[]).filter(x => x !== id);
      }
    });
    menu = { ...menu };
  }

  function getMenuCourseDishes(courseKey: string): Dish[] {
    const ids: string[] = (menu.courses as any)?.[courseKey] || [];
    return dishes.filter(d => ids.includes(d.id));
  }

  function getMenuDropdownDishes(courseKey: string): Dish[] {
    const query = (courseSearches[courseKey] || '').toLowerCase().trim();
    if (!query) return [];
    const ids: string[] = (menu.courses as any)?.[courseKey] || [];
    return dishes.filter(d => !ids.includes(d.id) && (d.title_en.toLowerCase().includes(query) || (d.title_zh || '').toLowerCase().includes(query)));
  }

  function addDishToCourse(courseKey: string, dishId: string) {
    if (!menu.courses[courseKey]) menu.courses[courseKey] = [];
    (menu.courses[courseKey] as string[]).push(dishId);
    menu = { ...menu };
    courseSearches[courseKey] = '';
    courseDropdownOpen[courseKey] = false;
  }

  function removeDishFromCourse(courseKey: string, dishId: string) {
    if (menu.courses[courseKey]) {
      menu.courses[courseKey] = (menu.courses[courseKey] as string[]).filter(x => x !== dishId);
      menu = { ...menu };
    }
  }

  async function saveMenuFn() {
    menuSaving = true;
    menuSaveLabel = 'Saving...';
    const res = await fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: password },
      body: JSON.stringify(menu)
    });
    menuSaving = false;
    if (res.ok) {
      menuSaveLabel = 'Saved!';
      setTimeout(() => { menuSaveLabel = 'Save Menu'; }, 1500);
    } else {
      menuSaveLabel = 'Save Menu';
    }
  }

  function handleEditorKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && editorOpen) tryCloseEditor();
  }

  function observeFadeIns() {
    setTimeout(() => {
      const observer = new IntersectionObserver(
        (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }),
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
      );
      document.querySelectorAll('.fade-in:not(.visible)').forEach((el) => observer.observe(el));
    }, 50);
  }

  onMount(() => {
    if (browser) {
      const stored = localStorage.getItem('jx-cookbook-auth');
      if (stored) {
        password = stored;
        tryAuth();
      }
    }
  });
</script>

<svelte:head>
  <title>Admin — JX Cookbook</title>
</svelte:head>

<svelte:window on:keydown={handleEditorKeydown} />

{#if !authed}
  <div class="fixed inset-0 z-[100] bg-surface flex items-center justify-center px-6">
    <div class="text-center max-w-xs w-full">
      <p class="text-text-muted text-xs uppercase tracking-[0.3em] mb-6">Admin Access</p>
      <input
        type="password"
        bind:value={passwordInput}
        on:keydown={(e) => { if (e.key === 'Enter') { password = passwordInput; tryAuth(); } }}
        placeholder="Enter password"
        class="w-full px-4 py-3 bg-surface-light border border-surface-lighter/40 rounded-lg text-text text-sm text-center placeholder:text-text-muted/40 focus:outline-none focus:border-primary/30"
      />
      <button
        on:click={() => { password = passwordInput; tryAuth(); }}
        class="mt-4 w-full px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-primary border border-primary/20 rounded-lg hover:bg-primary/5 cursor-pointer"
      >Enter</button>
      {#if authError}
        <p class="mt-3 text-red-400/70 text-xs">Incorrect password</p>
      {/if}
    </div>
  </div>
{:else}
  <div class="flex gap-4 mb-8 border-b border-surface-lighter/20 pb-4 fade-in">
    <button class="text-xs uppercase tracking-wider cursor-pointer" class:text-primary={activeTab === 'dishes'} class:text-text-muted={activeTab !== 'dishes'} on:click={() => { activeTab = 'dishes'; observeFadeIns(); }}>Dishes</button>
    <button class="text-xs uppercase tracking-wider cursor-pointer" class:text-primary={activeTab === 'menu'} class:text-text-muted={activeTab !== 'menu'} on:click={() => { activeTab = 'menu'; observeFadeIns(); }}>Menu</button>
  </div>

  {#if activeTab === 'dishes'}
    <div class="flex items-center justify-between mb-6 fade-in" style="transition-delay: 0.1s">
      <h1 class="section-title text-2xl">Manage Dishes</h1>
      <button on:click={() => openEditor()} class="px-4 py-2 text-xs uppercase tracking-wider text-primary border border-primary/20 rounded-lg hover:bg-primary/5 cursor-pointer">+ New Dish</button>
    </div>

    <div class="flex gap-3 mb-4 fade-in" style="transition-delay: 0.2s">
      <div class="relative flex-1">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" bind:value={dishSearch} placeholder="Search dishes..." class="w-full pl-10 pr-4 py-2 bg-surface-light border border-surface-lighter/40 rounded-lg text-text text-sm placeholder:text-text-muted/40 focus:outline-none focus:border-primary/30" />
      </div>
      <select bind:value={dishSort} class="bg-surface-light border border-surface-lighter/40 rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-primary/30">
        <option value="name-asc">Name A-Z</option>
        <option value="name-desc">Name Z-A</option>
        <option value="newest">Newest</option>
      </select>
    </div>

    <div class="space-y-2 mb-8 fade-in" style="transition-delay: 0.3s">
      {#if sortedDishes.length === 0}
        <p class="text-text-muted text-sm italic">No dishes yet. Add your first one!</p>
      {:else}
        {#each sortedDishes as dish (dish.id)}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="flex items-center justify-between px-4 py-3 bg-surface border border-surface-lighter/30 rounded-lg hover:border-primary/30 transition-colors cursor-pointer" on:click={() => openEditor(dish)}>
            <div>
              <span class="text-text text-sm">{dish.title_en}</span>
              <span class="text-text-muted text-xs ml-2">{dish.title_zh || ''}</span>
            </div>
            <button on:click|stopPropagation={() => deleteDish(dish.id)} class="text-[10px] text-red-400 uppercase tracking-wider cursor-pointer hover:text-red-300">Delete</button>
          </div>
        {/each}
      {/if}
    </div>
  {/if}

  {#if activeTab === 'menu'}
    <h1 class="section-title text-2xl mb-6 fade-in">Edit Menu</h1>
    <div class="bg-surface-light border border-surface-lighter/40 rounded-xl p-6 space-y-6 fade-in" style="transition-delay: 0.1s">
      <div>
        <label class="block text-text-muted text-[10px] uppercase tracking-wider mb-1">Date</label>
        <input type="date" bind:value={menu.date} class="px-3 py-2 bg-surface border border-surface-lighter/40 rounded-lg text-text text-sm focus:outline-none focus:border-primary/30" />
      </div>

      <div class="space-y-4">
        {#each COURSES as course}
          {@const selected = getMenuCourseDishes(course.key)}
          {@const dropdown = getMenuDropdownDishes(course.key)}
          <div class="bg-surface rounded-lg p-3 border border-surface-lighter/20">
            <label class="block text-text-muted text-[10px] uppercase tracking-wider mb-2">{course.label}</label>
            {#if selected.length > 0}
              <div class="flex flex-wrap gap-1.5 mb-2">
                {#each selected as d}
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-full border bg-primary/20 border-primary/40 text-primary">
                    {d.title_en}
                    <button on:click={() => removeDishFromCourse(course.key, d.id)} class="ml-0.5 hover:text-red-400 cursor-pointer">✕</button>
                  </span>
                {/each}
              </div>
            {/if}
            <div class="relative">
              <input type="text" bind:value={courseSearches[course.key]} on:input={() => { courseDropdownOpen[course.key] = true }} on:focus={() => { courseDropdownOpen[course.key] = true }} placeholder="Search to add..." class="w-full px-3 py-1.5 bg-surface-light border border-surface-lighter/40 rounded text-text text-xs placeholder:text-text-muted/40 focus:outline-none focus:border-primary/30" />
              {#if courseDropdownOpen[course.key] && courseSearches[course.key]?.trim()}
                <div class="absolute left-0 right-0 top-full mt-1 z-10 bg-surface-light border border-surface-lighter/40 rounded-lg shadow-lg shadow-black/40 max-h-[180px] overflow-y-auto">
                  {#if dropdown.length === 0}
                    <div class="px-3 py-2 text-text-muted/40 text-xs italic">No matches</div>
                  {:else}
                    {#each dropdown as d}
                      <button on:click={() => addDishToCourse(course.key, d.id)} class="w-full text-left px-3 py-2 text-xs text-text-muted hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer">
                        {d.title_en} <span class="text-text-muted/40">{d.title_zh || ''}</span>
                      </button>
                    {/each}
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <button on:click={saveMenuFn} disabled={menuSaving} class="px-5 py-2 text-xs uppercase tracking-wider text-surface bg-primary rounded-lg hover:bg-primary-light cursor-pointer font-medium" class:opacity-60={menuSaving} class:pointer-events-none={menuSaving}>{menuSaveLabel}</button>
    </div>
  {/if}
{/if}

{#if editorOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="fixed inset-x-0 bottom-0 z-[200]" style="top: 4rem;">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
    <div class="absolute inset-0 flex items-center justify-center p-4" on:click|self={tryCloseEditor}>
      <div class="relative bg-surface-light border border-surface-lighter/40 rounded-xl max-w-3xl w-full shadow-2xl shadow-black/50 flex flex-col" style="max-height: calc(100vh - 4rem - 2rem);">
        <div class="flex items-center justify-between px-6 pt-5 pb-3 border-b border-surface-lighter/20 shrink-0">
          <h2 class="font-display text-lg text-text">{editingId ? 'Edit Dish' : 'New Dish'}</h2>
          <button on:click={tryCloseEditor} class="w-8 h-8 flex items-center justify-center rounded-full bg-surface/50 border border-surface-lighter/30 text-text-muted hover:text-text hover:border-primary/30 transition-all cursor-pointer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6 space-y-5 overflow-y-auto overflow-x-hidden flex-1 min-h-0">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-text-muted text-[10px] uppercase tracking-wider mb-1">Title (EN)</label>
              <input bind:value={titleEn} class="w-full px-3 py-2 bg-surface border border-surface-lighter/40 rounded-lg text-text text-sm focus:outline-none focus:border-primary/30" />
            </div>
            <div>
              <label class="block text-text-muted text-[10px] uppercase tracking-wider mb-1">Title (中文)</label>
              <input bind:value={titleZh} class="w-full px-3 py-2 bg-surface border border-surface-lighter/40 rounded-lg text-text text-sm focus:outline-none focus:border-primary/30" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-text-muted text-[10px] uppercase tracking-wider mb-1">Description (EN)</label>
              <textarea bind:value={descEn} rows="3" class="w-full px-3 py-2 bg-surface border border-surface-lighter/40 rounded-lg text-text text-sm focus:outline-none focus:border-primary/30 resize-none"></textarea>
            </div>
            <div>
              <label class="block text-text-muted text-[10px] uppercase tracking-wider mb-1">Description (中文)</label>
              <textarea bind:value={descZh} rows="3" class="w-full px-3 py-2 bg-surface border border-surface-lighter/40 rounded-lg text-text text-sm focus:outline-none focus:border-primary/30 resize-none"></textarea>
            </div>
          </div>

          <div>
            <button type="button" on:click={() => { flavoursExpanded = !flavoursExpanded }} class="flex items-center gap-2 cursor-pointer group">
              <span class="text-text-muted text-[10px] uppercase tracking-wider group-hover:text-text">Flavour Profile</span>
              {#if selectedFlavours.length > 0}
                <span class="text-[10px] text-primary/60">({selectedFlavours.length})</span>
              {/if}
              <svg class="w-3 h-3 text-text-muted transition-transform duration-200" class:rotate-180={flavoursExpanded} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div class="flex flex-wrap gap-1.5 mt-2">
              {#if selectedFlavours.length > 0}
                {#each selectedFlavours as f}
                  <button type="button" on:click={() => toggleFlavour(f)} class="px-2.5 py-0.5 text-[10px] uppercase tracking-wider rounded-full border cursor-pointer transition-all duration-200 bg-primary/20 border-primary/40 text-primary">{f}</button>
                {/each}
              {:else}
                <span class="text-text-muted/40 text-xs italic">None selected</span>
              {/if}
            </div>
            {#if flavoursExpanded}
              <div class="mt-3 space-y-3">
                {#each FLAVOUR_CATEGORIES as cat}
                  <div>
                    <p class="text-text-muted text-[10px] uppercase tracking-widest mb-1.5">{cat.label}</p>
                    <div class="flex flex-wrap gap-1.5">
                      {#each cat.tags as f}
                        <button type="button" on:click={() => toggleFlavour(f)} class="px-2.5 py-0.5 text-[10px] uppercase tracking-wider rounded-full border cursor-pointer transition-all duration-200 {selectedFlavours.includes(f) ? 'bg-primary/20 border-primary/40 text-primary' : 'border-surface-lighter/40 text-text-muted'}">{f}</button>
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <div>
            <label class="block text-text-muted text-[10px] uppercase tracking-wider mb-2">Ingredients</label>
            <div class="space-y-4">
              {#each ingredientGroups as group, gi}
                <div class="bg-surface rounded-lg p-3 border border-surface-lighter/20 overflow-hidden">
                  <div class="flex items-center justify-between mb-2">
                    <input value={group.name === '_default' ? '' : group.name} on:change={(e) => { ingredientGroups[gi].name = e.currentTarget.value || '_default'; ingredientGroups = ingredientGroups; }} class="px-2 py-1 bg-surface-light border border-surface-lighter/40 rounded text-text text-xs focus:outline-none focus:border-primary/30 flex-1 min-w-0 max-w-[200px]" placeholder="Group name (optional)" />
                    <button on:click={() => removeGroup(gi)} class="text-[10px] text-red-400 cursor-pointer ml-2 shrink-0">Remove</button>
                  </div>
                  {#each group.items as item, ii}
                    <div class="flex flex-wrap gap-1.5 mb-1.5">
                      <input bind:value={ingredientGroups[gi].items[ii].name_en} placeholder="Ingredient (EN)" class="flex-1 min-w-0 px-2 py-1.5 bg-surface-light border border-surface-lighter/40 rounded text-text text-xs focus:outline-none focus:border-primary/30" />
                      <input bind:value={ingredientGroups[gi].items[ii].name_zh} placeholder="食材 (中文)" class="flex-1 min-w-0 px-2 py-1.5 bg-surface-light border border-surface-lighter/40 rounded text-text text-xs focus:outline-none focus:border-primary/30" />
                      <input bind:value={ingredientGroups[gi].items[ii].qty} placeholder="Qty" class="w-16 shrink-0 px-2 py-1.5 bg-surface-light border border-surface-lighter/40 rounded text-text text-xs focus:outline-none focus:border-primary/30" />
                      <button on:click={() => removeIngredient(gi, ii)} class="text-red-400/50 hover:text-red-400 text-xs cursor-pointer shrink-0">✕</button>
                    </div>
                  {/each}
                  <button on:click={() => addIngredient(gi)} class="w-full text-[10px] text-primary cursor-pointer mt-2 py-1.5 border border-dashed border-primary/20 rounded hover:bg-primary/5 transition-colors">+ Item</button>
                </div>
              {/each}
            </div>
            <button on:click={addGroup} class="w-full mt-3 text-[10px] text-primary uppercase tracking-wider cursor-pointer py-2 border border-dashed border-primary/20 rounded-lg hover:bg-primary/5 transition-colors">+ Add Group</button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-text-muted text-[10px] uppercase tracking-wider mb-1">Steps (EN)</label>
              <textarea bind:value={stepsEn} rows={flavoursExpanded ? 8 : 12} class="w-full px-3 py-2 bg-surface border border-surface-lighter/40 rounded-lg text-text text-sm focus:outline-none focus:border-primary/30 resize-vertical" placeholder="One step per line"></textarea>
            </div>
            <div>
              <label class="block text-text-muted text-[10px] uppercase tracking-wider mb-1">Steps (中文)</label>
              <textarea bind:value={stepsZh} rows={flavoursExpanded ? 8 : 12} class="w-full px-3 py-2 bg-surface border border-surface-lighter/40 rounded-lg text-text text-sm focus:outline-none focus:border-primary/30 resize-vertical" placeholder="每行一个步骤"></textarea>
            </div>
          </div>

          <div>
            <label class="block text-text-muted text-[10px] uppercase tracking-wider mb-2">Image</label>
            <div class="flex items-center gap-4">
              <input type="file" accept="image/*" on:change={onImageChange} class="text-text-muted text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-surface-lighter/40 file:bg-surface file:text-text-muted file:text-xs file:cursor-pointer" />
              {#if imagePreviewSrc}
                <img src={imagePreviewSrc} alt="Preview" class="w-20 h-20 rounded-lg object-cover border border-surface-lighter/40" />
              {/if}
            </div>
          </div>

          <div>
            <label class="block text-text-muted text-[10px] uppercase tracking-wider mb-2">Courses</label>
            <div class="flex flex-wrap gap-1.5">
              {#each COURSES as c}
                <button type="button" on:click={() => toggleCourse(c.key)} class="px-3 py-1.5 text-[10px] uppercase tracking-wider rounded-full border cursor-pointer transition-all duration-200 {selectedCourses.includes(c.key) ? 'bg-primary/20 border-primary/40 text-primary' : 'border-surface-lighter/40 text-text-muted'}">{c.label}</button>
              {/each}
            </div>
          </div>
        </div>

        <div class="flex gap-3 px-6 py-4 border-t border-surface-lighter/20 shrink-0">
          <button on:click={saveDish} disabled={saving} class="px-5 py-2 text-xs uppercase tracking-wider text-surface bg-primary rounded-lg hover:bg-primary-light cursor-pointer font-medium" class:opacity-60={saving} class:pointer-events-none={saving}>{saving ? 'Saving...' : 'Save'}</button>
          <button on:click={tryCloseEditor} class="px-5 py-2 text-xs uppercase tracking-wider text-text-muted border border-surface-lighter/40 rounded-lg hover:text-text cursor-pointer">Cancel</button>
        </div>
      </div>
    </div>
  </div>
{/if}
