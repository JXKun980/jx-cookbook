import type { Ingredient, Lang } from './types';
import { t } from './i18n';

const meatKeywords = ['chicken', 'beef', 'pork', 'lamb', 'fish', 'salmon', 'shrimp', 'prawn', 'duck', 'turkey', 'bacon', 'guanciale', 'ham', 'sausage', 'anchovy'];
const seafoodKeywords = ['salmon', 'fish', 'shrimp', 'prawn', 'crab', 'lobster', 'mussel', 'clam', 'oyster', 'squid', 'octopus', 'tuna', 'cod'];
const dairyEggKeywords = ['egg', 'milk', 'cream', 'cheese', 'butter', 'yogurt', 'honey', 'pecorino', 'parmesan', 'mozzarella'];
const nutKeywords = ['nut', 'almond', 'cashew', 'peanut', 'walnut', 'pistachio', 'pecan', 'hazelnut'];

export interface DietaryIcon {
  emoji: string;
  label: string;
}

export function getDietaryIcons(ingredients: Record<string, Ingredient[]>, flavourProfile: string[], lang: Lang): DietaryIcon[] {
  const allIngredients = Object.values(ingredients).flat();
  const ingredientNames = allIngredients.map((i) => i.name_en.toLowerCase());

  const hasMeat = ingredientNames.some((n) => meatKeywords.some((k) => n.includes(k)));
  const hasSeafood = ingredientNames.some((n) => seafoodKeywords.some((k) => n.includes(k)));
  const hasDairyEgg = ingredientNames.some((n) => dairyEggKeywords.some((k) => n.includes(k)));
  const hasNuts = ingredientNames.some((n) => nutKeywords.some((k) => n.includes(k)));
  const isSpicy = flavourProfile.some((f) => f.toLowerCase().includes('spicy') || f.toLowerCase().includes('fiery'));

  const isVegetarian = !hasMeat && !hasSeafood;
  const isVegan = isVegetarian && !hasDairyEgg;

  const icons: DietaryIcon[] = [];
  if (isVegan) icons.push({ emoji: '🌿', label: t('dietary.vegan', lang) });
  else if (isVegetarian) icons.push({ emoji: '🌱', label: t('dietary.vegetarian', lang) });
  if (hasSeafood) icons.push({ emoji: '🐟', label: t('dietary.seafood', lang) });
  if (isSpicy) icons.push({ emoji: '🌶️', label: t('dietary.spicy', lang) });
  if (hasNuts) icons.push({ emoji: '🥜', label: t('dietary.nuts', lang) });

  return icons;
}
