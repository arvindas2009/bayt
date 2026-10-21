/**
 * Gulf home-cooking library.
 *
 * Used two ways: (1) as the pool of substitutes when the validator has to swap a meal for a
 * member whose constraints it breaks, and (2) as the source of the varied, fully compliant
 * fallback plan. Ingredient lists are what the validator checks, so keep them honest and
 * specific; a meal that hides gluten behind "dough" will be (correctly) rejected for Fatima.
 */

export type MealSlot = 'breakfast' | 'lunch' | 'dinner'

export interface MealTemplate {
  id: string
  slot: MealSlot
  name: string
  ingredients: string[]
  calories: number
  tags: string[]
}

const b = (id: string, name: string, calories: number, ingredients: string[], tags: string[] = []): MealTemplate => ({
  id, slot: 'breakfast', name, calories, ingredients, tags: ['Emirati', ...tags],
})
const l = (id: string, name: string, calories: number, ingredients: string[], tags: string[] = []): MealTemplate => ({
  id, slot: 'lunch', name, calories, ingredients, tags: ['Emirati', ...tags],
})
const d = (id: string, name: string, calories: number, ingredients: string[], tags: string[] = []): MealTemplate => ({
  id, slot: 'dinner', name, calories, ingredients, tags: ['Emirati', ...tags],
})

export const MEAL_LIBRARY: MealTemplate[] = [
  // ── Breakfast ──────────────────────────────────────────────────────────────────
  b('b_foul', 'Foul medames with tomato and lemon', 320,
    ['dried fava beans', 'tomato', 'lemon', 'olive oil', 'cumin', 'parsley', 'cucumber'], ['High fibre']),
  b('b_labneh', 'Labneh plate with cucumber, tomato and za’atar', 280,
    ['labneh', 'cucumber', 'tomato', 'za’atar', 'olive oil', 'mint'], ['Quick']),
  b('b_egg_tomato', 'Bayd bi bandoura (egg and tomato skillet)', 310,
    ['eggs', 'tomato', 'onion', 'olive oil', 'black pepper', 'parsley'], ['High protein']),
  b('b_omelette', 'Herb omelette with cucumber salad', 300,
    ['eggs', 'parsley', 'coriander', 'onion', 'cucumber', 'olive oil'], ['High protein', 'Quick']),
  b('b_yoghurt', 'Yoghurt with cucumber and mint', 190,
    ['plain yoghurt', 'cucumber', 'mint', 'lemon'], ['Quick', 'Light']),
  b('b_soft_eggs', 'Soft scrambled eggs with labneh', 290,
    ['eggs', 'labneh', 'butter', 'chives'], ['High protein']),
  b('b_balaleet', 'Balaleet (saffron vermicelli with omelette)', 430,
    ['vermicelli', 'sugar', 'saffron', 'cardamom', 'rose water', 'eggs'], ['Traditional']),
  b('b_chebab', 'Chebab pancakes with date syrup', 460,
    ['flour', 'saffron', 'cardamom', 'yoghurt', 'date syrup'], ['Traditional']),
  b('b_khameer', 'Khameer bread with cheese and honey', 420,
    ['flour', 'yeast', 'milk', 'cheese', 'honey'], ['Traditional']),
  b('b_muhammar', 'Muhammar (sweet rice with ghee)', 440,
    ['rice', 'date syrup', 'ghee', 'cardamom'], ['Traditional']),

  // ── Lunch ──────────────────────────────────────────────────────────────────────
  l('l_veg_machboos', 'Vegetable machboos', 480,
    ['basmati rice', 'tomato', 'carrot', 'potato', 'dried lime', 'turmeric', 'cardamom', 'onion'], ['Vegetarian']),
  l('l_chicken_machboos', 'Chicken machboos', 560,
    ['basmati rice', 'chicken', 'tomato', 'dried lime', 'turmeric', 'cardamom', 'onion'], ['High protein', 'Traditional']),
  l('l_lentil_shorba', 'Lentil shorba with lemon', 330,
    ['red lentils', 'carrot', 'onion', 'cumin', 'lemon', 'olive oil'], ['Vegetarian', 'Soft']),
  l('l_balila', 'Balila (warm spiced chickpeas) with salad', 360,
    ['chickpeas', 'cumin', 'lemon', 'olive oil', 'parsley', 'tomato', 'cucumber'], ['Vegetarian', 'High fibre']),
  l('l_hammour', 'Grilled hammour with herbs, rice and salad', 520,
    ['hammour', 'lemon', 'coriander', 'garlic', 'basmati rice', 'cucumber', 'tomato'], ['High protein']),
  l('l_saloona', 'Chicken saloona with potato and rice', 540,
    ['chicken', 'potato', 'carrot', 'tomato', 'onion', 'turmeric', 'basmati rice'], ['High protein', 'Traditional']),
  l('l_madrouba', 'Chicken madrouba (slow-cooked rice porridge)', 500,
    ['rice', 'chicken', 'ghee', 'cardamom', 'turmeric', 'garlic'], ['Soft', 'Traditional']),
  l('l_falafel', 'Falafel plate with salad and tahini', 520,
    ['chickpeas', 'parsley', 'coriander', 'onion', 'cumin', 'tahini', 'cucumber', 'tomato', 'lemon'], ['Vegetarian']),
  l('l_veg_biryani', 'Vegetable biryani with raita', 510,
    ['basmati rice', 'cauliflower', 'peas', 'carrot', 'onion', 'cardamom', 'plain yoghurt', 'cucumber'], ['Vegetarian']),
  l('l_kofta', 'Chicken kofta with cucumber salad and rice', 540,
    ['minced chicken', 'onion', 'parsley', 'cumin', 'cucumber', 'tomato', 'basmati rice'], ['High protein']),
  l('l_harees', 'Harees (cracked wheat and chicken)', 480,
    ['wheat', 'chicken', 'ghee', 'salt', 'cinnamon'], ['Soft', 'Traditional']),
  l('l_tabbouleh', 'Tabbouleh with grilled chicken', 430,
    ['bulgur', 'parsley', 'tomato', 'mint', 'lemon', 'chicken'], ['Light']),

  // ── Dinner ─────────────────────────────────────────────────────────────────────
  d('d_fish_machboos', 'Fish machboos', 520,
    ['kingfish', 'basmati rice', 'tomato', 'dried lime', 'turmeric', 'onion'], ['High protein', 'Traditional']),
  d('d_roast_chicken', 'Roast turmeric chicken with potatoes and green salad', 560,
    ['chicken', 'turmeric', 'potato', 'garlic', 'lemon', 'lettuce', 'cucumber'], ['High protein']),
  d('d_veg_saloona', 'Vegetable saloona with rice', 450,
    ['potato', 'eggplant', 'tomato', 'carrot', 'onion', 'turmeric', 'basmati rice'], ['Vegetarian']),
  d('d_koussa', 'Rice-stuffed zucchini (koussa) in tomato sauce', 420,
    ['zucchini', 'rice', 'tomato', 'onion', 'parsley', 'mint', 'lemon'], ['Vegetarian', 'Soft']),
  d('d_chicken_veg', 'Grilled chicken with roasted vegetables and rice', 540,
    ['chicken', 'bell pepper', 'zucchini', 'carrot', 'olive oil', 'basmati rice'], ['High protein']),
  d('d_baked_fish', 'Baked fish with lemon, herbs and roasted vegetables', 460,
    ['kingfish', 'lemon', 'coriander', 'garlic', 'zucchini', 'tomato', 'olive oil'], ['High protein', 'Light']),
  d('d_chickpea_curry', 'Gulf-style chickpea curry with rice', 480,
    ['chickpeas', 'tomato', 'onion', 'turmeric', 'cumin', 'coriander', 'basmati rice'], ['Vegetarian']),
  d('d_lamb_stew', 'Slow-cooked lamb and vegetable stew', 540,
    ['lamb', 'potato', 'carrot', 'tomato', 'onion', 'cardamom', 'basmati rice'], ['Soft', 'Traditional']),
  d('d_lentil_spinach', 'Lentil and spinach soup with rice', 380,
    ['brown lentils', 'spinach', 'onion', 'garlic', 'lemon', 'basmati rice'], ['Vegetarian', 'Soft']),
  d('d_egg_potato', 'Bayd wa batata (egg and potato) with salad', 400,
    ['eggs', 'potato', 'onion', 'tomato', 'cucumber', 'olive oil'], ['Vegetarian']),
  d('d_thareed', 'Chicken thareed (bread in stew)', 560,
    ['chicken', 'regag bread', 'potato', 'tomato', 'onion', 'cardamom'], ['Traditional']),
  d('d_margoog', 'Lamb margoog (wheat dough stew)', 580,
    ['lamb', 'wheat dough', 'pumpkin', 'tomato', 'onion'], ['Traditional']),
]

export const templatesFor = (slot: MealSlot) => MEAL_LIBRARY.filter((m) => m.slot === slot)
