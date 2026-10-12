const METHODS: Record<string, readonly string[]> = {
  "berry-oats": [
    "Stir the oats, yogurt, chia seeds, and almond milk together in a jar or bowl.",
    "Cover and refrigerate overnight, or for at least 4 hours, until thickened.",
    "Top with mixed berries and serve chilled.",
  ],
  "egg-toast": [
    "Toast the sourdough until crisp and prepare the avocado with a pinch of chili flakes.",
    "Scramble the eggs gently in a pan until just set.",
    "Serve the eggs and avocado over the toast with baby greens.",
  ],
  "yogurt-parfait": [
    "Spoon half of the yogurt into a glass or bowl.",
    "Layer with mango, granola, and pumpkin seeds, then add the remaining yogurt.",
    "Finish with lime zest or a squeeze of lime and serve immediately.",
  ],
  "smoothie-bowl": [
    "Blend the blueberries, banana, and almond milk until smooth and thick.",
    "Spoon the mixture into a bowl.",
    "Top with granola and a light drizzle of date syrup.",
  ],
  "avo-toast-egg": [
    "Toast the sourdough until crisp and prepare the avocado with a pinch of chili flakes.",
    "Scramble the eggs gently in a pan until just set.",
    "Serve the eggs and avocado over the toast with baby greens.",
  ],
  "banana-pancakes": [
    "Blend or mash the banana with oats, flaxseed meal, oat milk, and vanilla.",
    "Cook small pancakes on a lightly oiled pan over medium heat, turning when bubbles form.",
    "Serve with maple syrup.",
  ],
  "chia-pudding": [
    "Whisk the chia seeds, coconut milk, agave, and vanilla together.",
    "Cover and refrigerate for at least 4 hours or overnight, stirring once after 15 minutes.",
    "Top with mixed berries before serving.",
  ],
  "harvest-salad": [
    "Season and grill or pan-cook the chicken until fully cooked, then slice it.",
    "Toss the mixed greens, apple, walnuts, feta, and mustard dressing together.",
    "Add the chicken and serve.",
  ],
  "salmon-quinoa": [
    "Cook the quinoa according to its package directions and let it stand covered.",
    "Roast or pan-cook the salmon until opaque and cooked through.",
    "Serve the salmon over quinoa with cucumber, edamame, avocado, and sesame.",
  ],
  "lentil-soup": [
    "Simmer the lentils, carrots, celery, and vegetable stock until the lentils are tender.",
    "Stir in the spinach and cook until wilted.",
    "Finish with lemon and serve hot.",
  ],
  "hummus-wrap": [
    "Spread hummus over the whole wheat wrap.",
    "Layer on turkey, tomato, cucumber, and greens.",
    "Roll tightly, slice in half, and serve.",
  ],
  "greek-salad": [
    "Chop the cucumber, tomato, and red onion and add them to a bowl.",
    "Add the olives and plant feta.",
    "Toss with olive oil and oregano, then serve.",
  ],
  "tuna-poke": [
    "Cook and cool the sushi rice.",
    "Toss the tuna with soy sauce and sesame oil.",
    "Serve over rice with mango, radish, spring onion, and sesame.",
  ],
  "chickpea-bowl": [
    "Roast the chickpeas and sweet potato until browned and tender, and cook the farro.",
    "Massage the kale with a little lemon juice.",
    "Layer the farro, kale, chickpeas, and sweet potato, then drizzle with tahini and lemon.",
  ],
  "stir-fry": [
    "Cook the brown rice according to its package directions.",
    "Stir-fry the tofu, broccoli, bell pepper, and ginger until browned and tender.",
    "Add tamari, then serve the stir-fry over rice.",
  ],
  "med-pasta": [
    "Cook the pasta until al dente and reserve a little cooking water.",
    "Cook the tomatoes, beans, spinach, and basil until warmed through.",
    "Toss with the pasta and nutritional yeast, loosening with cooking water if needed.",
  ],
  "chicken-rice": [
    "Season and roast or pan-cook the chicken until fully cooked.",
    "Cook the brown rice and sauté or roast the zucchini.",
    "Serve together with yogurt sauce, parsley, and lemon.",
  ],
  "thai-curry": [
    "Cook the curry paste briefly, then add coconut milk and bring to a gentle simmer.",
    "Add the chicken, eggplant, and snap peas and cook until the chicken is done.",
    "Serve with jasmine rice.",
  ],
  "spaghetti-bol": [
    "Cook the beef with carrot and celery until browned and softened.",
    "Add the crushed tomatoes and simmer until thickened.",
    "Cook the spaghetti, toss with the sauce, and finish with parmesan.",
  ],
  "beef-tacos": [
    "Season and cook the beef until browned and fully cooked.",
    "Warm the corn tortillas and prepare the cabbage slaw and avocado.",
    "Fill the tortillas with beef, slaw, avocado, and pico de gallo, then finish with lime.",
  ],
  "prawn-stirfry": [
    "Cook the noodles according to their package directions.",
    "Stir-fry the prawns, bok choy, snap peas, ginger, and garlic until the prawns are opaque.",
    "Add oyster sauce, toss with the noodles, and serve.",
  ],
  "keto-chicken-zucchini": [
    "Season the chicken with lemon, olive oil, and herbs, then roast or pan-cook until done.",
    "Roast or sauté the zucchini and asparagus until tender.",
    "Serve with avocado and the remaining lemon-herb juices.",
  ],
  "keto-salmon-olive": [
    "Top the salmon with chopped olives and roast until opaque and cooked through.",
    "Wilt the spinach and roast the cherry tomatoes until softened.",
    "Serve the salmon with the greens, tomatoes, avocado, olive oil, and lemon.",
  ],
  "apple-almond": [
    "Core and slice the apple.",
    "Arrange the slices with almond butter.",
    "Finish with cinnamon and serve.",
  ],
  edamame: [
    "Cook the edamame by steaming until hot and tender.",
    "Drain and season with flaky sea salt.",
    "Finish with lemon and serve.",
  ],
  "trail-mix": [
    "Combine the almonds, cashews, walnuts, dried cranberries, and pumpkin seeds.",
    "Stir everything together in a bowl.",
    "Serve a small handful.",
  ],
  "hummus-veggies": [
    "Wash and cut the carrot, cucumber, celery, and bell pepper into sticks.",
    "Spoon the hummus into a serving bowl.",
    "Arrange the vegetable sticks around the hummus and serve.",
  ],
  "banana-pb": [
    "Peel and slice the banana.",
    "Arrange the slices and spoon or drizzle over the peanut butter.",
    "Finish with chia seeds and serve.",
  ],
};

export function caloraOriginalRecipeInstructions(recipeId: string): string {
  return (METHODS[recipeId] ?? []).join("\n");
}

export function hasCaloraOriginalRecipeInstructions(recipeId: string): boolean {
  return Boolean(METHODS[recipeId]?.length);
}
