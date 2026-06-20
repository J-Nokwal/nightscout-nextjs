// Built-in food database — common foods with macros per standard serving.
// Matches Nightscout's food database schema (type, category, carbs, fat, protein, calories, weight, unit).

export interface FoodItem {
  name:     string;
  category: string;
  carbs:    number; // g per serving
  fat:      number;
  protein:  number;
  calories: number;
  weight:   number; // g per serving
  unit:     string;
}

export const BUILT_IN_FOODS: FoodItem[] = [
  // Grains / Bread
  { name: "White Bread",        category: "Grains",  carbs: 15, fat: 1,  protein: 3,  calories: 79,  weight: 30,  unit: "slice" },
  { name: "Whole Wheat Bread",  category: "Grains",  carbs: 14, fat: 1,  protein: 4,  calories: 79,  weight: 30,  unit: "slice" },
  { name: "White Rice (cooked)",category: "Grains",  carbs: 45, fat: 0,  protein: 4,  calories: 206, weight: 186, unit: "cup" },
  { name: "Brown Rice (cooked)",category: "Grains",  carbs: 45, fat: 2,  protein: 5,  calories: 216, weight: 202, unit: "cup" },
  { name: "Pasta (cooked)",     category: "Grains",  carbs: 43, fat: 1,  protein: 8,  calories: 220, weight: 140, unit: "cup" },
  { name: "Oatmeal (cooked)",   category: "Grains",  carbs: 28, fat: 3,  protein: 5,  calories: 158, weight: 234, unit: "cup" },
  { name: "Corn Tortilla",      category: "Grains",  carbs: 14, fat: 1,  protein: 2,  calories: 62,  weight: 29,  unit: "tortilla" },
  { name: "Flour Tortilla",     category: "Grains",  carbs: 26, fat: 5,  protein: 5,  calories: 168, weight: 54,  unit: "tortilla" },
  // Fruit
  { name: "Apple",              category: "Fruit",   carbs: 25, fat: 0,  protein: 0,  calories: 95,  weight: 182, unit: "medium" },
  { name: "Banana",             category: "Fruit",   carbs: 27, fat: 0,  protein: 1,  calories: 105, weight: 118, unit: "medium" },
  { name: "Orange",             category: "Fruit",   carbs: 15, fat: 0,  protein: 1,  calories: 62,  weight: 131, unit: "medium" },
  { name: "Grapes",             category: "Fruit",   carbs: 28, fat: 0,  protein: 1,  calories: 104, weight: 151, unit: "cup" },
  { name: "Strawberries",       category: "Fruit",   carbs: 11, fat: 0,  protein: 1,  calories: 49,  weight: 152, unit: "cup" },
  { name: "Watermelon",         category: "Fruit",   carbs: 21, fat: 0,  protein: 2,  calories: 85,  weight: 280, unit: "2 cups" },
  { name: "Mango",              category: "Fruit",   carbs: 25, fat: 1,  protein: 1,  calories: 99,  weight: 165, unit: "cup" },
  // Dairy
  { name: "Whole Milk",         category: "Dairy",   carbs: 12, fat: 8,  protein: 8,  calories: 149, weight: 244, unit: "cup" },
  { name: "Skim Milk",          category: "Dairy",   carbs: 12, fat: 0,  protein: 8,  calories: 83,  weight: 245, unit: "cup" },
  { name: "Yogurt (plain)",     category: "Dairy",   carbs: 17, fat: 4,  protein: 9,  calories: 137, weight: 227, unit: "cup" },
  { name: "Ice Cream",          category: "Dairy",   carbs: 32, fat: 11, protein: 4,  calories: 273, weight: 133, unit: "cup" },
  // Vegetables
  { name: "Potato (baked)",     category: "Vegetables", carbs: 37, fat: 0, protein: 4, calories: 161, weight: 173, unit: "medium" },
  { name: "Sweet Potato",       category: "Vegetables", carbs: 26, fat: 0, protein: 2, calories: 112, weight: 130, unit: "medium" },
  { name: "Corn",               category: "Vegetables", carbs: 29, fat: 2, protein: 4, calories: 132, weight: 154, unit: "cup" },
  { name: "Peas",               category: "Vegetables", carbs: 21, fat: 0, protein: 8, calories: 118, weight: 160, unit: "cup" },
  // Protein / Snacks
  { name: "Peanut Butter",      category: "Snacks",  carbs: 6,  fat: 16, protein: 8,  calories: 188, weight: 32,  unit: "2 tbsp" },
  { name: "Almonds",            category: "Snacks",  carbs: 6,  fat: 14, protein: 6,  calories: 164, weight: 28,  unit: "oz" },
  { name: "Crackers",           category: "Snacks",  carbs: 17, fat: 4,  protein: 2,  calories: 109, weight: 28,  unit: "serving" },
  { name: "Potato Chips",       category: "Snacks",  carbs: 15, fat: 10, protein: 2,  calories: 154, weight: 28,  unit: "oz" },
  // Drinks
  { name: "Orange Juice",       category: "Drinks",  carbs: 26, fat: 0,  protein: 2,  calories: 112, weight: 248, unit: "cup" },
  { name: "Cola / Soda",        category: "Drinks",  carbs: 39, fat: 0,  protein: 0,  calories: 136, weight: 368, unit: "12oz can" },
  { name: "Apple Juice",        category: "Drinks",  carbs: 28, fat: 0,  protein: 0,  calories: 114, weight: 248, unit: "cup" },
  // Fast food
  { name: "Hamburger Bun",      category: "Fast Food", carbs: 28, fat: 4, protein: 5, calories: 158, weight: 57,  unit: "bun" },
  { name: "Pizza (cheese, 1 slice)", category: "Fast Food", carbs: 35, fat: 10, protein: 12, calories: 272, weight: 107, unit: "slice" },
];

export function searchFoods(query: string, limit = 10): FoodItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return BUILT_IN_FOODS.slice(0, limit);
  return BUILT_IN_FOODS
    .filter((f) => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q))
    .slice(0, limit);
}
