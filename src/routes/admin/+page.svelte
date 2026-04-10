<script lang="ts">
  import { auth, lang } from '$lib/stores';
  import { t } from '$lib/i18n';
  import { onMount, tick } from 'svelte';
  import { browser } from '$app/environment';
  import type { Dish, MenuConfig, Ingredient } from '$lib/types';

  const TAG_CATEGORIES = [
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

  let activeTab: 'dishes' | 'menu' | 'tags' = 'dishes';
  let dishSearch = '';
  let dishSort = 'name-asc';

  // Editor state
  let editorOpen = false;
  let editingId: string | null = null;
  let titleEn = '';
  let titleZh = '';
  let descEn = '';
  let descZh = '';
  let steps = '';
  let selectedTags: string[] = [];
  let tagsExpanded = false;
  let ingredientGroups: { name: string; items: { name: string; qty: string }[] }[] = [{ name: '_default', items: [{ name: '', qty: '' }] }];
  let imageDataUrl: string | null = null;
  let imagePreviewSrc: string | null = null;
  let selectedCourses: string[] = [];
  let initialFormState = '';
  let saving = false;
  let _editorBackdropDown = false;

  // Custom tag creation
  interface CustomTagData {
    categories: { key: string; en: string; zh: string }[];
    tags: Record<string, { en: string; zh: string; category: string }>;
  }
  let customData: CustomTagData = { categories: [], tags: {} };
  let showNewTagForm = false;
  let newTagEn = '';
  let newTagZh = '';
  let newTagCategory = '';
  let newCategoryEn = '';
  let newCategoryZh = '';

  $: allCategories = [
    ...TAG_CATEGORIES.map(c => ({ key: c.label.toLowerCase(), label: $lang === 'zh' ? t(`filter.${c.label.toLowerCase()}`, $lang) : c.label })),
    ...customData.categories.map(c => ({ key: c.key, label: $lang === 'zh' ? c.zh : c.en })),
  ];

  async function loadCustomTags() {
    try {
      const res = await fetch('/api/tags', { headers: { Authorization: password } });
      if (res.ok) {
        const data = await res.json();
        if (data && data.categories) {
          customData = data;
        } else if (data && typeof data === 'object') {
          customData = { categories: [], tags: {} };
          for (const [key, val] of Object.entries(data)) {
            customData.tags[key] = { ...(val as any), category: 'custom' };
          }
          if (Object.keys(customData.tags).length > 0) {
            customData.categories = [{ key: 'custom', en: 'Custom', zh: '自定义' }];
          }
        }
      }
    } catch { /* ignore */ }
  }

  async function saveCustomData() {
    await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: password },
      body: JSON.stringify(customData)
    });
  }

  async function addNewTag() {
    if (!newTagEn.trim() || !newTagZh.trim()) return;
    let catKey = newTagCategory;

    if (catKey === '__new__') {
      if (!newCategoryEn.trim() || !newCategoryZh.trim()) return;
      catKey = newCategoryEn.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (!catKey) return;
      if (!customData.categories.find(c => c.key === catKey)) {
        customData.categories = [...customData.categories, { key: catKey, en: newCategoryEn.trim(), zh: newCategoryZh.trim() }];
      }
    }

    if (!catKey) return;

    const key = newTagEn.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!key) return;
    customData.tags[key] = { en: newTagEn.trim(), zh: newTagZh.trim(), category: catKey };
    customData = { ...customData };
    selectedTags = [...selectedTags, key];
    await saveCustomData();
    newTagEn = '';
    newTagZh = '';
    newTagCategory = '';
    newCategoryEn = '';
    newCategoryZh = '';
    showNewTagForm = false;
  }

  function getTagLabel(key: string): string {
    if (customData.tags[key]) return $lang === 'zh' ? customData.tags[key].zh : customData.tags[key].en;
    return t(`tag.${key}`, $lang);
  }

  function getCustomTagsByCategory(catKey: string): string[] {
    return Object.entries(customData.tags).filter(([, v]) => v.category === catKey).map(([k]) => k);
  }

  async function removeTagFromAllDishes(tagKey: string) {
    let changed = false;
    dishes.forEach(d => {
      if (d.tags?.includes(tagKey)) {
        d.tags = d.tags.filter(t => t !== tagKey);
        changed = true;
      }
    });
    if (changed) {
      dishes = [...dishes];
      await fetch('/api/dishes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: password },
        body: JSON.stringify(dishes)
      });
    }
  }

  async function deleteCustomTag(key: string) {
    if (!confirm(t('admin.deleteTagConfirm', $lang))) return;
    delete customData.tags[key];
    customData = { ...customData };
    await saveCustomData();
    await removeTagFromAllDishes(key);
  }

  async function deleteCustomCategory(catKey: string) {
    if (!confirm(t('admin.deleteCategoryConfirm', $lang))) return;
    const tagsToRemove = Object.entries(customData.tags).filter(([, v]) => v.category === catKey).map(([k]) => k);
    customData.categories = customData.categories.filter(c => c.key !== catKey);
    for (const key of tagsToRemove) {
      delete customData.tags[key];
    }
    customData = { ...customData };
    await saveCustomData();
    for (const key of tagsToRemove) {
      await removeTagFromAllDishes(key);
    }
  }

  // Tag editor state
  interface EditableCategory { label_en: string; label_zh: string; tags: { en: string; zh: string }[] }
  let editableCategories: EditableCategory[] = [];
  let tagEditorSaving = false;
  let tagEditorSaveState: 'idle' | 'saving' | 'saved' = 'idle';

  function initTagEditor() {
    editableCategories = TAG_CATEGORIES.map(cat => ({
      label_en: cat.label,
      label_zh: t(`filter.${cat.label.toLowerCase()}`, 'zh'),
      tags: cat.tags.map(tag => ({
        en: t(`tag.${tag}`, 'en'),
        zh: t(`tag.${tag}`, 'zh'),
      }))
    }));
    // Merge custom categories
    for (const cat of customData.categories) {
      const catTags = getCustomTagsByCategory(cat.key);
      editableCategories.push({
        label_en: cat.en,
        label_zh: cat.zh,
        tags: catTags.map(k => ({ en: customData.tags[k].en, zh: customData.tags[k].zh }))
      });
    }
  }

  function addEditorTag(ci: number) {
    editableCategories[ci].tags = [...editableCategories[ci].tags, { en: '', zh: '' }];
    editableCategories = editableCategories;
  }

  function removeEditorTag(ci: number, ti: number) {
    editableCategories[ci].tags.splice(ti, 1);
    editableCategories = [...editableCategories];
  }

  function addEditorCategory() {
    editableCategories = [...editableCategories, { label_en: '', label_zh: '', tags: [{ en: '', zh: '' }] }];
  }

  function removeEditorCategory(ci: number) {
    if (!confirm(t('admin.deleteCategoryConfirm', $lang))) return;
    editableCategories.splice(ci, 1);
    editableCategories = [...editableCategories];
  }

  async function saveTagEditor() {
    tagEditorSaving = true;
    tagEditorSaveState = 'saving';
    // Build customData from editableCategories
    const newCustomData: CustomTagData = { categories: [], tags: {} };
    for (const cat of editableCategories) {
      if (!cat.label_en.trim()) continue;
      const catKey = cat.label_en.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      newCustomData.categories.push({ key: catKey, en: cat.label_en.trim(), zh: cat.label_zh.trim() });
      for (const tag of cat.tags) {
        if (!tag.en.trim()) continue;
        const tagKey = tag.en.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        newCustomData.tags[tagKey] = { en: tag.en.trim(), zh: tag.zh.trim(), category: catKey };
      }
    }
    customData = newCustomData;
    await saveCustomData();
    tagEditorSaving = false;
    tagEditorSaveState = 'saved';
    setTimeout(() => { tagEditorSaveState = 'idle'; }, 1500);
  }

  // Menu state
  let menuSearchInputs: Record<string, string> = { appetizer: '', main: '', side: '', dessert: '' };
  let menuDropdownVis: Record<string, boolean> = { appetizer: false, main: false, side: false, dessert: false };
  let menuSaving = false;
  let menuSaveState: 'idle' | 'saving' | 'saved' = 'idle';

  function getFormState(): string {
    return JSON.stringify({ titleEn, titleZh, descEn, descZh, steps, selectedTags, ingredientGroups, imageDataUrl, selectedCourses });
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
        await loadCustomTags();
        initTagEditor();
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
      steps = dish.steps_zh || dish.steps_en || '';
      selectedTags = [...(dish.tags || [])];
      ingredientGroups = Object.entries(dish.ingredients || {}).map(([name, items]) => ({
        name, items: (items as Ingredient[]).map(i => ({ name: i.name_zh || i.name_en, qty: i.qty }))
      }));
      if (ingredientGroups.length === 0) ingredientGroups = [{ name: '_default', items: [{ name: '', qty: '' }] }];
      selectedCourses = COURSES.map(c => c.key).filter(k => ((menu.courses as any)?.[k] || []).includes(dish.id));
      imageDataUrl = null;
      imagePreviewSrc = dish.hasImage ? `/api/image?id=${dish.id}` : null;
    } else {
      editingId = null;
      titleEn = ''; titleZh = ''; descEn = ''; descZh = ''; steps = '';
      selectedTags = [];
      ingredientGroups = [{ name: '_default', items: [{ name: '', qty: '' }] }];
      selectedCourses = [];
      imageDataUrl = null;
      imagePreviewSrc = null;
    }
    showNewTagForm = false;
    editorOpen = true;
    initialFormState = getFormState();
  }

  function tryCloseEditor() {
    if (isDirty()) {
      if (!confirm(t('admin.unsavedChanges', $lang))) return;
    }
    editorOpen = false;
  }

  function toggleTag(f: string) {
    if (selectedTags.includes(f)) selectedTags = selectedTags.filter(x => x !== f);
    else selectedTags = [...selectedTags, f];
  }

  function toggleCourse(k: string) {
    if (selectedCourses.includes(k)) selectedCourses = selectedCourses.filter(x => x !== k);
    else selectedCourses = [...selectedCourses, k];
  }

  function addIngredient(gi: number) {
    ingredientGroups[gi].items = [...ingredientGroups[gi].items, { name: '', qty: '' }];
    ingredientGroups = ingredientGroups;
  }

  function removeIngredient(gi: number, ii: number) {
    ingredientGroups[gi].items.splice(ii, 1);
    ingredientGroups = [...ingredientGroups];
  }

  function addGroup() {
    ingredientGroups = [...ingredientGroups, { name: '', items: [{ name: '', qty: '' }] }];
  }

  function removeGroup(gi: number) {
    ingredientGroups.splice(gi, 1);
    ingredientGroups = [...ingredientGroups];
  }

  // Drag and drop for ingredients
  let dragGi = -1;
  let dragIi = -1;

  function onDragStart(gi: number, ii: number) {
    dragGi = gi;
    dragIi = ii;
  }

  function onDragOver(e: DragEvent, gi: number, ii: number) {
    e.preventDefault();
    if (dragGi === gi && dragIi !== ii) {
      const items = ingredientGroups[gi].items;
      const dragged = items.splice(dragIi, 1)[0];
      items.splice(ii, 0, dragged);
      dragIi = ii;
      ingredientGroups = [...ingredientGroups];
    }
  }

  function onDragEnd() {
    dragGi = -1;
    dragIi = -1;
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
    if (!titleEn.trim()) { alert(t('admin.titleRequired', $lang)); return; }
    saving = true;

    const id = editingId || titleEn.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const ingredients: Record<string, Ingredient[]> = {};
    const hasNamedGroups = ingredientGroups.some(g => g.name.trim() && g.name.trim() !== '_default');
    const unnamedItems: Ingredient[] = [];
    ingredientGroups.forEach(g => {
      const filtered = g.items.filter(i => i.name.trim());
      if (filtered.length === 0) return;
      const mapped = filtered.map(i => ({ name_en: i.name, name_zh: i.name, qty: i.qty }));
      if (g.name.trim() && g.name.trim() !== '_default') {
        ingredients[g.name.trim()] = mapped;
      } else {
        unnamedItems.push(...mapped);
      }
    });
    if (unnamedItems.length > 0) {
      if (hasNamedGroups) {
        ingredients['Other'] = unnamedItems;
      } else {
        ingredients['_default'] = unnamedItems;
      }
    }

    const dish: any = {
      id,
      title_en: titleEn.trim(),
      title_zh: titleZh.trim(),
      description_en: descEn.trim(),
      description_zh: descZh.trim(),
      tags: selectedTags,
      ingredients,
      steps_en: steps.trim(),
      steps_zh: steps.trim(),
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
    if (!confirm(t('admin.deleteDish', $lang))) return;
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
    const query = (menuSearchInputs[courseKey] || '').toLowerCase().trim();
    if (!query) return [];
    const ids: string[] = (menu.courses as any)?.[courseKey] || [];
    return dishes.filter(d => !ids.includes(d.id) && (d.title_en.toLowerCase().includes(query) || (d.title_zh || '').toLowerCase().includes(query)));
  }

  function addDishToCourse(courseKey: string, dishId: string) {
    if (!menu.courses[courseKey]) menu.courses[courseKey] = [];
    (menu.courses[courseKey] as string[]).push(dishId);
    menu = { ...menu };
    menuSearchInputs[courseKey] = '';
    menuSearchInputs = { ...menuSearchInputs };
    menuDropdownVis[courseKey] = false;
    menuDropdownVis = { ...menuDropdownVis };
  }

  function removeDishFromCourse(courseKey: string, dishId: string) {
    if (menu.courses[courseKey]) {
      menu.courses[courseKey] = (menu.courses[courseKey] as string[]).filter(x => x !== dishId);
      menu = { ...menu };
    }
  }

  async function saveMenuFn() {
    menuSaving = true;
    menuSaveState = 'saving';
    const res = await fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: password },
      body: JSON.stringify(menu)
    });
    menuSaving = false;
    if (res.ok) {
      menuSaveState = 'saved';
      setTimeout(() => { menuSaveState = 'idle'; }, 1500);
    } else {
      menuSaveState = 'idle';
    }
  }

  function handleEditorKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && editorOpen) tryCloseEditor();
  }

  async function observeFadeIns() {
    await tick();
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    document.querySelectorAll('.fade-in:not(.visible)').forEach((el) => observer.observe(el));
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
      <p class="text-text-muted text-xs uppercase tracking-[0.3em] mb-6">{t('admin.access', $lang)}</p>
      <input
        type="password"
        bind:value={passwordInput}
        on:keydown={(e) => { if (e.key === 'Enter') { password = passwordInput; tryAuth(); } }}
        placeholder={t('admin.enterPassword', $lang)}
        class="w-full px-4 py-3 bg-surface-light border border-surface-lighter/40 rounded-lg text-text text-sm text-center placeholder:text-text-muted/40 focus:outline-none focus:border-primary/30"
      />
      <button
        on:click={() => { password = passwordInput; tryAuth(); }}
        class="mt-4 w-full px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-primary border border-primary/20 rounded-lg hover:bg-primary/5 cursor-pointer"
      >{t('admin.enter', $lang)}</button>
      {#if authError}
        <p class="mt-3 text-red-400/70 text-xs">{t('admin.incorrect', $lang)}</p>
      {/if}
    </div>
  </div>
{:else}
  <div class="flex gap-4 mb-8 border-b border-surface-lighter/20 pb-4 fade-in">
    <button class="text-xs uppercase tracking-wider cursor-pointer" class:text-primary={activeTab === 'dishes'} class:text-text-muted={activeTab !== 'dishes'} on:click={() => { activeTab = 'dishes'; observeFadeIns(); }}>{t('admin.dishes', $lang)}</button>
    <button class="text-xs uppercase tracking-wider cursor-pointer" class:text-primary={activeTab === 'menu'} class:text-text-muted={activeTab !== 'menu'} on:click={() => { activeTab = 'menu'; observeFadeIns(); }}>{t('admin.menu', $lang)}</button>
    <button class="text-xs uppercase tracking-wider cursor-pointer" class:text-primary={activeTab === 'tags'} class:text-text-muted={activeTab !== 'tags'} on:click={() => { activeTab = 'tags'; initTagEditor(); observeFadeIns(); }}>{t('admin.tags', $lang)}</button>
  </div>

  {#if activeTab === 'dishes'}
    <div class="flex items-center justify-between mb-6 fade-in" style="transition-delay: 0.1s">
      <h1 class="section-title text-2xl">{t('admin.manageDishes', $lang)}</h1>
      <button on:click={() => openEditor()} class="px-4 py-2 text-xs uppercase tracking-wider text-primary border border-primary/20 rounded-lg hover:bg-primary/5 cursor-pointer">{t('admin.newDish', $lang)}</button>
    </div>

    <div class="flex gap-3 mb-4 fade-in" style="transition-delay: 0.2s">
      <div class="relative flex-1">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" bind:value={dishSearch} placeholder={t('admin.searchDishes', $lang)} class="w-full pl-10 pr-4 py-2 bg-surface-light border border-surface-lighter/40 rounded-lg text-text text-sm placeholder:text-text-muted/40 focus:outline-none focus:border-primary/30" />
      </div>
      <select bind:value={dishSort} class="bg-surface-light border border-surface-lighter/40 rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-primary/30">
        <option value="name-asc">{t('admin.nameAZ', $lang)}</option>
        <option value="name-desc">{t('admin.nameZA', $lang)}</option>
        <option value="newest">{t('admin.newest', $lang)}</option>
      </select>
    </div>

    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="flex items-center gap-3 mb-4 fade-in" style="transition-delay: 0.25s" on:click={() => { menu.showDishImages = !(menu.showDishImages !== false); menu = menu; fetch('/api/menu', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: password }, body: JSON.stringify(menu) }); }}>
      <div class="relative w-10 h-[22px] rounded-full transition-colors duration-300 cursor-pointer {menu.showDishImages !== false ? 'bg-primary' : 'bg-surface-lighter/50'}">
        <div class="absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 {menu.showDishImages !== false ? 'translate-x-[22px]' : 'translate-x-[3px]'}"></div>
      </div>
      <span class="text-text-muted text-xs cursor-pointer">{t('admin.showDishImages', $lang)}</span>
    </div>

    <div class="space-y-2 mb-8 fade-in" style="transition-delay: 0.3s">
      {#if sortedDishes.length === 0}
        <p class="text-text-muted text-sm italic">{t('admin.noDishes', $lang)}</p>
      {:else}
        {#each sortedDishes as dish (dish.id)}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="flex items-center justify-between px-4 py-3 bg-surface border border-surface-lighter/30 rounded-lg hover:border-primary/30 transition-colors cursor-pointer" on:click={() => openEditor(dish)}>
            <div>
              <span class="text-text text-sm">{$lang === 'zh' ? (dish.title_zh || dish.title_en) : dish.title_en}</span>
              <span class="text-text-muted text-xs ml-2">{$lang === 'zh' ? dish.title_en : (dish.title_zh || '')}</span>
            </div>
            <button on:click|stopPropagation={() => deleteDish(dish.id)} class="text-[10px] text-red-400 uppercase tracking-wider cursor-pointer hover:text-red-300">{t('admin.delete', $lang)}</button>
          </div>
        {/each}
      {/if}
    </div>
  {/if}

  {#if activeTab === 'menu'}
    <h1 class="section-title text-2xl mb-6 fade-in">{t('admin.editMenu', $lang)}</h1>
    <div class="bg-surface-light border border-surface-lighter/40 rounded-xl p-6 space-y-6 fade-in" style="transition-delay: 0.1s">
      <div>
        <label class="block text-text-muted text-[10px] uppercase tracking-wider mb-1">{t('admin.date', $lang)}</label>
        <input type="date" bind:value={menu.date} class="px-3 py-2 bg-surface border border-surface-lighter/40 rounded-lg text-text text-sm focus:outline-none focus:border-primary/30" />
      </div>

      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="flex items-center gap-3 cursor-pointer" on:click={() => { menu.showImages = !menu.showImages; menu = menu; }}>
        <div class="relative w-10 h-[22px] rounded-full transition-colors duration-300 {menu.showImages ? 'bg-primary' : 'bg-surface-lighter/50'}">
          <div class="absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 {menu.showImages ? 'translate-x-[22px]' : 'translate-x-[3px]'}"></div>
        </div>
        <span class="text-text-muted text-xs">{t('admin.showImages', $lang)}</span>
      </div>

      <div class="space-y-4">
        {#key menu}
        {#each COURSES as course}
          <div class="bg-surface rounded-lg p-3 border border-surface-lighter/20">
            <label class="block text-text-muted text-[10px] uppercase tracking-wider mb-2">{course.label}</label>
            {#if getMenuCourseDishes(course.key).length > 0}
              <div class="flex flex-wrap gap-1.5 mb-2">
                {#each getMenuCourseDishes(course.key) as d}
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-full border bg-primary/20 border-primary/40 text-primary">
                    {d.title_en}
                    <button on:click={() => removeDishFromCourse(course.key, d.id)} class="ml-0.5 hover:text-red-400 cursor-pointer"><svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
                  </span>
                {/each}
              </div>
            {/if}
            <div class="relative">
              <input type="text" bind:value={menuSearchInputs[course.key]} on:input={() => { menuDropdownVis[course.key] = true; menuDropdownVis = menuDropdownVis; }} on:focus={() => { menuDropdownVis[course.key] = true; menuDropdownVis = menuDropdownVis; }} placeholder={t('admin.searchToAdd', $lang)} class="w-full px-3 py-1.5 bg-surface-light border border-surface-lighter/40 rounded text-text text-xs placeholder:text-text-muted/40 focus:outline-none focus:border-primary/30" />
              {#if menuDropdownVis[course.key] && menuSearchInputs[course.key]?.trim()}
                {@const dropdownResults = getMenuDropdownDishes(course.key)}
                <div class="absolute left-0 right-0 top-full mt-1 z-10 bg-surface-light border border-surface-lighter/40 rounded-lg shadow-lg shadow-black/40 max-h-[180px] overflow-y-auto">
                  {#if dropdownResults.length === 0}
                    <div class="px-3 py-2 text-text-muted/40 text-xs italic">{t('admin.noMatches', $lang)}</div>
                  {:else}
                    {#each dropdownResults as d}
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
        {/key}
      </div>

      <button on:click={saveMenuFn} disabled={menuSaving} class="px-5 py-2 text-xs uppercase tracking-wider text-surface bg-primary rounded-lg hover:bg-primary-light cursor-pointer font-medium" class:opacity-60={menuSaving} class:pointer-events-none={menuSaving}>{t(menuSaveState === 'saving' ? 'admin.saving' : menuSaveState === 'saved' ? 'admin.saved' : 'admin.saveMenu', $lang)}</button>
    </div>
  {/if}

  {#if activeTab === 'tags'}
    <h1 class="section-title text-2xl mb-6">{t('admin.manageTags', $lang)}</h1>
    <div class="space-y-4">
      {#each editableCategories as cat, ci}
        <div class="bg-surface-light border border-surface-lighter/40 rounded-xl p-3 sm:p-4 space-y-3 overflow-hidden">
          <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input bind:value={editableCategories[ci].label_en} placeholder={$lang === 'zh' ? '分类（英文）' : 'Category (EN)'} class="flex-1 min-w-0 px-3 py-2 bg-surface border border-surface-lighter/40 rounded-lg text-text text-sm font-medium focus:outline-none focus:border-primary/30" />
            <input bind:value={editableCategories[ci].label_zh} placeholder={$lang === 'zh' ? '分类（中文）' : 'Category (中文)'} class="flex-1 min-w-0 px-3 py-2 bg-surface border border-surface-lighter/40 rounded-lg text-text text-sm focus:outline-none focus:border-primary/30" />
            <button on:click={() => removeEditorCategory(ci)} class="text-[10px] text-red-400 uppercase tracking-wider cursor-pointer shrink-0 hover:text-red-300 hover:bg-red-400/10 self-end sm:self-center px-3 py-2 rounded-lg border border-red-400/20 bg-red-400/5 transition-all">{t('admin.remove', $lang)}</button>
          </div>
          <div class="space-y-1.5">
            <div class="grid grid-cols-[1fr_1fr_20px] gap-1.5 px-1">
              <span class="text-text-muted/40 text-[9px] uppercase tracking-wider">{$lang === 'zh' ? '英文' : 'English'}</span>
              <span class="text-text-muted/40 text-[9px] uppercase tracking-wider">{$lang === 'zh' ? '中文' : '中文'}</span>
              <span></span>
            </div>
            {#each cat.tags as tag, ti}
              <div class="grid grid-cols-[1fr_1fr_20px] gap-1.5">
                <input bind:value={editableCategories[ci].tags[ti].en} placeholder="English" class="min-w-0 px-2 py-1.5 bg-surface border border-surface-lighter/40 rounded text-text text-xs focus:outline-none focus:border-primary/30" />
                <input bind:value={editableCategories[ci].tags[ti].zh} placeholder="中文" class="min-w-0 px-2 py-1.5 bg-surface border border-surface-lighter/40 rounded text-text text-xs focus:outline-none focus:border-primary/30" />
                <button on:click={() => removeEditorTag(ci, ti)} class="text-red-400/50 hover:text-red-400 text-xs cursor-pointer flex items-center justify-center"><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
              </div>
            {/each}
          </div>
          <button on:click={() => addEditorTag(ci)} class="w-full text-[10px] text-primary cursor-pointer py-1.5 border border-dashed border-primary/20 rounded hover:bg-primary/5 transition-colors">{t('admin.addNewTag', $lang)}</button>
        </div>
      {/each}
      <button on:click={addEditorCategory} class="w-full text-[10px] text-primary uppercase tracking-wider cursor-pointer py-2 border border-dashed border-primary/20 rounded-lg hover:bg-primary/5 transition-colors">{$lang === 'zh' ? '+ 添加分类' : '+ Add Category'}</button>
      <button on:click={saveTagEditor} disabled={tagEditorSaving} class="px-5 py-2 text-xs uppercase tracking-wider text-surface bg-primary rounded-lg hover:bg-primary-light cursor-pointer font-medium" class:opacity-60={tagEditorSaving} class:pointer-events-none={tagEditorSaving}>{t(tagEditorSaveState === 'saving' ? 'admin.saving' : tagEditorSaveState === 'saved' ? 'admin.saved' : 'admin.save', $lang)}</button>
    </div>
  {/if}
{/if}

{#if editorOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="fixed inset-x-0 bottom-0 z-[200]" style="top: 4rem;">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
    <div class="absolute inset-0 flex items-center justify-center p-4" on:mousedown|self={() => { _editorBackdropDown = true }} on:mouseup|self={() => { if (_editorBackdropDown) tryCloseEditor(); _editorBackdropDown = false }} on:click|self|preventDefault={() => {}}>
      <div class="relative bg-surface-light border border-surface-lighter/40 rounded-xl max-w-3xl w-full shadow-2xl shadow-black/50 flex flex-col" style="max-height: calc(100vh - 4rem - 2rem);">
        <div class="flex items-center justify-between px-6 pt-5 pb-3 border-b border-surface-lighter/20 shrink-0">
          <h2 class="font-display text-lg text-text">{editingId ? t('admin.editDish', $lang) : t('admin.newDishTitle', $lang)}</h2>
          <button on:click={tryCloseEditor} class="w-8 h-8 flex items-center justify-center rounded-full bg-surface/50 border border-surface-lighter/30 text-text-muted hover:text-text hover:border-primary/30 transition-all cursor-pointer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6 space-y-5 overflow-y-auto overflow-x-hidden flex-1 min-h-0">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-text-muted text-[10px] uppercase tracking-wider mb-1">{t('admin.titleEn', $lang)}</label>
              <input bind:value={titleEn} class="w-full px-3 py-2 bg-surface border border-surface-lighter/40 rounded-lg text-text text-sm focus:outline-none focus:border-primary/30" />
            </div>
            <div>
              <label class="block text-text-muted text-[10px] uppercase tracking-wider mb-1">{t('admin.titleZh', $lang)}</label>
              <input bind:value={titleZh} class="w-full px-3 py-2 bg-surface border border-surface-lighter/40 rounded-lg text-text text-sm focus:outline-none focus:border-primary/30" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-text-muted text-[10px] uppercase tracking-wider mb-1">{t('admin.descEn', $lang)}</label>
              <textarea bind:value={descEn} rows="3" class="w-full px-3 py-2 bg-surface border border-surface-lighter/40 rounded-lg text-text text-sm focus:outline-none focus:border-primary/30 resize-none"></textarea>
            </div>
            <div>
              <label class="block text-text-muted text-[10px] uppercase tracking-wider mb-1">{t('admin.descZh', $lang)}</label>
              <textarea bind:value={descZh} rows="3" class="w-full px-3 py-2 bg-surface border border-surface-lighter/40 rounded-lg text-text text-sm focus:outline-none focus:border-primary/30 resize-none"></textarea>
            </div>
          </div>

          <div>
            <button type="button" on:click={() => { tagsExpanded = !tagsExpanded }} class="flex items-center gap-2 cursor-pointer group">
              <span class="text-text-muted text-[10px] uppercase tracking-wider group-hover:text-text">{t('admin.tags', $lang)}</span>
              {#if selectedTags.length > 0}
                <span class="text-[10px] text-primary/60">({selectedTags.length})</span>
              {/if}
              <svg class="w-3 h-3 text-text-muted transition-transform duration-200" class:rotate-180={tagsExpanded} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div class="flex flex-wrap gap-1.5 mt-2">
              {#if selectedTags.length > 0}
                {#if tagsExpanded}
                  <p class="text-text-muted text-[10px] uppercase tracking-widest mb-0.5 w-full">{$lang === 'zh' ? '已选标签' : 'Selected'}</p>
                {/if}
                {#each selectedTags as f}
                  <button type="button" on:click={() => toggleTag(f)} class="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] uppercase tracking-wider rounded-full border cursor-pointer transition-all duration-200 bg-primary/20 border-primary/40 text-primary hover:bg-red-400/10 hover:border-red-400/30 hover:text-red-400">
                    {getTagLabel(f)}
                    <svg class="w-2.5 h-2.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                {/each}
              {:else}
                <span class="text-text-muted/40 text-xs italic">{t('admin.noneSelected', $lang)}</span>
              {/if}
            </div>
            {#if tagsExpanded}
              <div class="mt-3 space-y-3">
                {#each TAG_CATEGORIES as cat}
                  <div>
                    <p class="text-text-muted text-[10px] uppercase tracking-widest mb-1.5">{cat.label}</p>
                    <div class="flex flex-wrap gap-1.5">
                      {#each cat.tags as f}
                        <button type="button" on:click={() => toggleTag(f)} class="px-2.5 py-0.5 text-[10px] uppercase tracking-wider rounded-full border cursor-pointer transition-all duration-200 {selectedTags.includes(f) ? 'bg-primary/20 border-primary/40 text-primary' : 'border-surface-lighter/40 text-text-muted'}">{getTagLabel(f)}</button>
                      {/each}
                    </div>
                  </div>
                {/each}
                {#each customData.categories as cat}
                  {@const catTags = getCustomTagsByCategory(cat.key)}
                  {#if catTags.length > 0}
                    <div>
                      <p class="text-text-muted text-[10px] uppercase tracking-widest mb-1.5">{$lang === 'zh' ? cat.zh : cat.en}</p>
                      <div class="flex flex-wrap gap-1.5">
                        {#each catTags as f}
                          <button type="button" on:click={() => toggleTag(f)} class="px-2.5 py-0.5 text-[10px] uppercase tracking-wider rounded-full border cursor-pointer transition-all duration-200 {selectedTags.includes(f) ? 'bg-primary/20 border-primary/40 text-primary' : 'border-surface-lighter/40 text-text-muted'}">{getTagLabel(f)}</button>
                        {/each}
                      </div>
                    </div>
                  {/if}
                {/each}
                {#if showNewTagForm}
                  <div class="bg-surface rounded-lg p-3 border border-surface-lighter/20 space-y-2">
                    <div class="flex flex-wrap gap-2">
                      <input bind:value={newTagEn} placeholder={t('admin.tagNameEn', $lang)} class="flex-1 min-w-0 px-2 py-1.5 bg-surface-light border border-surface-lighter/40 rounded text-text text-xs focus:outline-none focus:border-primary/30" />
                      <input bind:value={newTagZh} placeholder={t('admin.tagNameZh', $lang)} class="flex-1 min-w-0 px-2 py-1.5 bg-surface-light border border-surface-lighter/40 rounded text-text text-xs focus:outline-none focus:border-primary/30" />
                    </div>
                    <select bind:value={newTagCategory} class="w-full px-2 py-1.5 bg-surface-light border border-surface-lighter/40 rounded text-text text-xs focus:outline-none focus:border-primary/30">
                      <option value="" disabled>{$lang === 'zh' ? '选择分类...' : 'Select category...'}</option>
                      {#each allCategories as cat}
                        <option value={cat.key}>{cat.label}</option>
                      {/each}
                      <option value="__new__">{$lang === 'zh' ? '+ 新分类' : '+ New category'}</option>
                    </select>
                    {#if newTagCategory === '__new__'}
                      <div class="flex flex-wrap gap-2">
                        <input bind:value={newCategoryEn} placeholder={$lang === 'zh' ? '分类名称（英文）' : 'Category name (EN)'} class="flex-1 min-w-0 px-2 py-1.5 bg-surface-light border border-surface-lighter/40 rounded text-text text-xs focus:outline-none focus:border-primary/30" />
                        <input bind:value={newCategoryZh} placeholder={$lang === 'zh' ? '分类名称（中文）' : 'Category name (中文)'} class="flex-1 min-w-0 px-2 py-1.5 bg-surface-light border border-surface-lighter/40 rounded text-text text-xs focus:outline-none focus:border-primary/30" />
                      </div>
                    {/if}
                    <div class="flex gap-2">
                      <button on:click={addNewTag} class="px-3 py-1.5 text-[10px] uppercase tracking-wider text-primary border border-primary/20 rounded hover:bg-primary/5 cursor-pointer">{t('admin.addTagBtn', $lang)}</button>
                      <button on:click={() => { showNewTagForm = false }} class="px-2 py-1.5 text-[10px] text-text-muted cursor-pointer">{t('admin.cancel', $lang)}</button>
                    </div>
                  </div>
                {:else}
                  <button on:click={() => { showNewTagForm = true }} class="text-[10px] text-primary cursor-pointer hover:text-primary-light">{t('admin.addNewTag', $lang)}</button>
                {/if}
              </div>
            {/if}
          </div>

          <div>
            <label class="block text-text-muted text-[10px] uppercase tracking-wider mb-2">{t('admin.ingredients', $lang)}</label>
            <div class="space-y-4">
              {#each ingredientGroups as group, gi}
                <div class="bg-surface rounded-lg p-3 border border-surface-lighter/20 overflow-hidden">
                  <div class="flex items-center justify-between mb-2">
                    <input value={group.name === '_default' ? '' : group.name} on:change={(e) => { ingredientGroups[gi].name = e.currentTarget.value || '_default'; ingredientGroups = ingredientGroups; }} class="px-2 py-1 bg-surface-light border border-surface-lighter/40 rounded text-text text-xs focus:outline-none focus:border-primary/30 flex-1 min-w-0 max-w-[200px]" placeholder={t('admin.groupName', $lang)} />
                    <button on:click={() => removeGroup(gi)} class="text-[10px] text-red-400 uppercase tracking-wider cursor-pointer ml-2 shrink-0 px-2.5 py-1 rounded border border-red-400/20 bg-red-400/5 hover:bg-red-400/10 hover:text-red-300 transition-all">{t('admin.remove', $lang)}</button>
                  </div>
                  {#each group.items as item, ii}
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div class="flex flex-wrap gap-1.5 mb-1.5 {dragGi === gi && dragIi === ii ? 'opacity-50' : ''}" draggable="true" on:dragstart={() => onDragStart(gi, ii)} on:dragover={(e) => onDragOver(e, gi, ii)} on:dragend={onDragEnd}>
                      <span class="flex items-center cursor-grab text-text-muted/30 hover:text-text-muted/60 shrink-0 select-none" title="Drag to reorder">
                        <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><circle cx="5" cy="3" r="1.5"/><circle cx="11" cy="3" r="1.5"/><circle cx="5" cy="8" r="1.5"/><circle cx="11" cy="8" r="1.5"/><circle cx="5" cy="13" r="1.5"/><circle cx="11" cy="13" r="1.5"/></svg>
                      </span>
                      <input bind:value={ingredientGroups[gi].items[ii].name} placeholder={t('admin.ingredient', $lang)} class="flex-1 min-w-0 px-2 py-1.5 bg-surface-light border border-surface-lighter/40 rounded text-text text-xs focus:outline-none focus:border-primary/30" />
                      <input bind:value={ingredientGroups[gi].items[ii].qty} placeholder="Qty" class="w-20 shrink-0 px-2 py-1.5 bg-surface-light border border-surface-lighter/40 rounded text-text text-xs focus:outline-none focus:border-primary/30" />
                      <button on:click={() => removeIngredient(gi, ii)} class="text-red-400/50 hover:text-red-400 text-xs cursor-pointer shrink-0"><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
                    </div>
                  {/each}
                  <button on:click={() => addIngredient(gi)} class="w-full text-[10px] text-primary cursor-pointer mt-2 py-1.5 border border-dashed border-primary/20 rounded hover:bg-primary/5 transition-colors">{t('admin.addItem', $lang)}</button>
                </div>
              {/each}
            </div>
            <button on:click={addGroup} class="w-full mt-3 text-[10px] text-primary uppercase tracking-wider cursor-pointer py-2 border border-dashed border-primary/20 rounded-lg hover:bg-primary/5 transition-colors">{t('admin.addGroup', $lang)}</button>
          </div>

          <div>
            <label class="block text-text-muted text-[10px] uppercase tracking-wider mb-1">{t('admin.steps', $lang)}</label>
            <textarea bind:value={steps} rows={tagsExpanded ? 8 : 12} class="w-full px-3 py-2 bg-surface border border-surface-lighter/40 rounded-lg text-text text-sm focus:outline-none focus:border-primary/30 resize-vertical" placeholder={t('admin.stepsPlaceholder', $lang)}></textarea>
          </div>

          <div>
            <label class="block text-text-muted text-[10px] uppercase tracking-wider mb-2">{t('admin.image', $lang)}</label>
            <div class="flex items-center gap-4">
              <input type="file" accept="image/*" on:change={onImageChange} class="text-text-muted text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-surface-lighter/40 file:bg-surface file:text-text-muted file:text-xs file:cursor-pointer" />
              {#if imagePreviewSrc}
                <img src={imagePreviewSrc} alt="Preview" class="w-20 h-20 rounded-lg object-cover border border-surface-lighter/40" />
              {/if}
            </div>
          </div>

          <div>
            <label class="block text-text-muted text-[10px] uppercase tracking-wider mb-2">{t('admin.courses', $lang)}</label>
            <div class="flex flex-wrap gap-1.5">
              {#each COURSES as c}
                <button type="button" on:click={() => toggleCourse(c.key)} class="px-3 py-1.5 text-[10px] uppercase tracking-wider rounded-full border cursor-pointer transition-all duration-200 {selectedCourses.includes(c.key) ? 'bg-primary/20 border-primary/40 text-primary' : 'border-surface-lighter/40 text-text-muted'}">{c.label}</button>
              {/each}
            </div>
          </div>
        </div>

        <div class="flex gap-3 px-6 py-4 border-t border-surface-lighter/20 shrink-0">
          <button on:click={saveDish} disabled={saving} class="px-5 py-2 text-xs uppercase tracking-wider text-surface bg-primary rounded-lg hover:bg-primary-light cursor-pointer font-medium" class:opacity-60={saving} class:pointer-events-none={saving}>{saving ? t('admin.saving', $lang) : t('admin.save', $lang)}</button>
          <button on:click={tryCloseEditor} class="px-5 py-2 text-xs uppercase tracking-wider text-text-muted border border-surface-lighter/40 rounded-lg hover:text-text cursor-pointer">{t('admin.cancel', $lang)}</button>
        </div>
      </div>
    </div>
  </div>
{/if}
