import { Component, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { RecipeGeneratorService } from '../../core/services/recipe-generator.service';

export type Unit = 'gram' | 'ml' | 'piece' | 'tbsp' | 'tsp';

export interface Ingredient {
  name: string;
  amount: number;
  unit: Unit;
}

export type CookingTime = 'quick' | 'medium' | 'complex';

export type Cuisine = 'German' | 'Italian' | 'Indian' | 'Japanese' | 'Gourmet' | 'Fusion';

export type Diet = 'Vegetarian' | 'Vegan' | 'Keto' | 'No preferences';

/** Steps of the multi-step generator flow */
export type GeneratorStep = 'step1' | 'step2' | 'loading' | 'results';

@Component({
  selector: 'app-generator',
  imports: [FormsModule, RouterLink, Navbar],
  templateUrl: './generator.html',
  styleUrl: './generator.scss',
})
export class Generator implements OnInit {

  constructor(private generatorService: RecipeGeneratorService, private router: Router) {}

  // Restores saved results when the user navigates back from the recipe detail page.
  ngOnInit(): void {
    const state = window.history.state;
    if (state?.restoreResults && this.generatorService.lastResults.length > 0) {
      this.results.set(this.generatorService.lastResults);
      this.step.set('results');
    }
  }

  readonly step = signal<GeneratorStep>('step1');

  readonly ingredients = signal<Ingredient[]>([]);
  ingredientInput = '';
  amountInput: number = 100;
  unitInput: Unit = 'gram';

  readonly autocompleteVisible = signal(false);
  readonly autocompleteResults = signal<string[]>([]);
  readonly unitDropdownOpen = signal(false);

  readonly editingIndex = signal<number | null>(null);
  editAmount = 100;
  editUnit: Unit = 'gram';

  private readonly allIngredients = [
    'Pasta', 'Spaghetti', 'Penne', 'Fusilli', 'Tagliatelle', 'Lasagne sheets',
    'Rice', 'Basmati rice', 'Jasmine rice', 'Brown rice', 'Risotto rice',
    'Bread', 'Breadcrumbs', 'Flour', 'Whole wheat flour', 'Cornstarch',
    'Oats', 'Couscous', 'Quinoa', 'Polenta', 'Noodles', 'Udon noodles', 'Rice noodles',
    'Onion', 'Red onion', 'Spring onion', 'Garlic', 'Shallot',
    'Tomato', 'Cherry tomatoes', 'Passata', 'Paprika', 'Bell pepper',
    'Broccoli', 'Cauliflower', 'Spinach', 'Kale', 'Lettuce', 'Arugula',
    'Carrot', 'Parsnip', 'Pastinake', 'Celery', 'Celeriac',
    'Potato', 'Sweet potato', 'Zucchini', 'Eggplant', 'Cucumber',
    'Mushrooms', 'Champignons', 'Shiitake', 'Portobello mushrooms',
    'Peas', 'Edamame', 'Green beans', 'Asparagus', 'Artichoke',
    'Corn', 'Leek', 'Fennel', 'Bok choy', 'Bean sprouts',
    'Beetroot', 'Radish', 'Turnip', 'Kohlrabi', 'Pumpkin', 'Butternut squash',
    'Chicken', 'Chicken breast', 'Chicken thighs', 'Chicken wings',
    'Beef', 'Ground beef', 'Beef steak', 'Pork', 'Pork belly', 'Bacon',
    'Lamb', 'Turkey', 'Duck',
    'Salmon', 'Tuna', 'Cod', 'Sea bass', 'Shrimp', 'Prawns', 'Squid',
    'Anchovies', 'Sardines', 'Mackerel', 'Trout', 'Mussels', 'Clams',
    'Egg', 'Tofu', 'Tempeh', 'Lentils', 'Chickpeas', 'Black beans',
    'Kidney beans', 'White beans', 'Edamame beans',
    'Milk', 'Cream', 'Heavy cream', 'Sour cream', 'Crème fraîche',
    'Butter', 'Ghee', 'Yogurt', 'Greek yogurt',
    'Cheese', 'Parmesan', 'Mozzarella', 'Cheddar', 'Feta', 'Ricotta',
    'Brie', 'Gouda', 'Emmental', 'Cream cheese', 'Mascarpone',
    'Oat milk', 'Almond milk', 'Coconut milk', 'Coconut cream',
    'Basil', 'Oregano', 'Thyme', 'Rosemary', 'Parsley', 'Cilantro',
    'Mint', 'Sage', 'Bay leaves', 'Tarragon', 'Chives', 'Dill',
    'Cumin', 'Coriander', 'Turmeric', 'Paprika powder', 'Smoked paprika',
    'Chili flakes', 'Cayenne pepper', 'Ginger', 'Cinnamon', 'Nutmeg',
    'Cardamom', 'Cloves', 'Star anise', 'Saffron', 'Vanilla',
    'Black pepper', 'White pepper', 'Salt', 'Curry powder', 'Garam masala',
    'Olive oil', 'Sunflower oil', 'Sesame oil', 'Coconut oil',
    'Balsamic vinegar', 'Red wine vinegar', 'Rice vinegar', 'Apple cider vinegar',
    'Soy sauce', 'Tamari', 'Fish sauce', 'Oyster sauce', 'Hoisin sauce',
    'Worcestershire sauce', 'Tabasco', 'Sriracha', 'Miso paste',
    'Tomato paste', 'Tomato sauce', 'Pesto', 'Tahini', 'Hummus',
    'Sugar', 'Brown sugar', 'Honey', 'Maple syrup', 'Agave syrup',
    'Baking powder', 'Baking soda', 'Yeast', 'Cocoa powder', 'Dark chocolate',
    'Lemon', 'Lime', 'Orange', 'Lemon zest', 'Orange zest',
    'Apple', 'Banana', 'Mango', 'Avocado', 'Strawberry', 'Blueberry',
    'Raspberry', 'Grapes', 'Pineapple', 'Pomegranate', 'Peach', 'Plum',
    'Walnuts', 'Almonds', 'Cashews', 'Pine nuts', 'Pistachios',
    'Peanuts', 'Peanut butter', 'Sesame seeds', 'Chia seeds', 'Sunflower seeds',
    'Vegetable stock', 'Chicken stock', 'Beef stock', 'White wine', 'Red wine',
    'Beer', 'Water', 'Sparkling water',
  ];

  portions = signal(2);
  chefs = signal(1);
  selectedTime = signal<CookingTime | null>(null);
  selectedCuisine = signal<Cuisine | null>(null);
  selectedDiet = signal<Diet | null>(null);

  readonly results        = signal<{ id: string; title: string; time: string }[]>([]);
  readonly errorMsg       = signal<string | null>(null);
  readonly showQuotaModal = signal(false);

  /** Step 1 is complete as soon as at least one ingredient has been added */
  readonly canProceedToStep2 = computed(() => this.ingredients().length > 0);

  /** Step 2 is complete when all three required fields (time, cuisine, diet) are set */
  readonly canGenerate = computed(() =>
    this.selectedTime() !== null &&
    this.selectedCuisine() !== null &&
    this.selectedDiet() !== null
  );

  readonly units: Unit[] = ['gram', 'ml', 'piece', 'tbsp', 'tsp'];

  readonly cookingTimes: { value: CookingTime; label: string; sub: string }[] = [
    { value: 'quick',   label: 'Quick',   sub: 'up to 20min' },
    { value: 'medium',  label: 'Medium',  sub: '35-45min'    },
    { value: 'complex', label: 'Complex', sub: 'over 40min'  },
  ];

  readonly cuisines: Cuisine[] = ['German', 'Italian', 'Indian', 'Japanese', 'Gourmet', 'Fusion'];

  readonly diets: Diet[] = ['Vegetarian', 'Vegan', 'Keto', 'No preferences'];

  /** Filters the autocomplete list based on the input value (from 2 characters, prefix match) */
  onIngredientInput(value: string): void {
    this.ingredientInput = value;
    if (value.length < 2) {
      this.autocompleteVisible.set(false);
      return;
    }
    const results = this.allIngredients.filter(i =>
      i.toLowerCase().startsWith(value.toLowerCase())
    );
    this.autocompleteResults.set(results);
    this.autocompleteVisible.set(results.length > 0);
  }

  selectSuggestion(name: string): void {
    this.ingredientInput = name;
    this.autocompleteVisible.set(false);
  }

  toggleUnitDropdown(): void {
    this.unitDropdownOpen.update(v => !v);
  }

  closeUnitDropdown(): void {
    this.unitDropdownOpen.set(false);
  }

  selectUnit(unit: Unit): void {
    this.unitInput = unit;
    this.unitDropdownOpen.set(false);
  }

  // Special characters are sanitized and the name is capped at 50 chars before adding.
  addIngredient(): void {
    const raw = this.ingredientInput.trim();
    const name = raw.replace(/[^a-zA-ZäöüÄÖÜß0-9 \-]/g, '').slice(0, 50);
    if (!name) return;
    const amount = Math.min(Math.max(1, Math.floor(this.amountInput)), 9999);
    this.ingredients.update(list => [
      ...list,
      { name, amount, unit: this.unitInput }
    ]);
    this.ingredientInput = '';
    this.amountInput = 100;
    this.autocompleteVisible.set(false);
  }

  removeIngredient(index: number): void {
    this.ingredients.update(list => list.filter((_, i) => i !== index));
    if (this.editingIndex() === index) this.editingIndex.set(null);
  }

  startEdit(index: number): void {
    const item = this.ingredients()[index];
    this.editAmount = item.amount;
    this.editUnit   = item.unit;
    this.editingIndex.set(index);
  }

  saveEdit(index: number): void {
    this.ingredients.update(list =>
      list.map((item, i) =>
        i === index ? { ...item, amount: this.editAmount, unit: this.editUnit } : item
      )
    );
    this.editingIndex.set(null);
  }

  cancelEdit(): void {
    this.editingIndex.set(null);
  }

  /** Maps internal unit keys to display strings (e.g. 'gram' → 'g') */
  formatUnit(unit: Unit): string {
    const map: Record<Unit, string> = {
      gram: 'g', ml: 'ml', piece: 'x', tbsp: 'tbsp', tsp: 'tsp'
    };
    return map[unit];
  }

  increasePortions(): void { if (this.portions() < 12) this.portions.update(v => v + 1); }
  decreasePortions(): void { if (this.portions() > 1)  this.portions.update(v => v - 1); }

  increaseChefs(): void { if (this.chefs() < 4) this.chefs.update(v => v + 1); }
  decreaseChefs(): void { if (this.chefs() > 1) this.chefs.update(v => v - 1); }

  goToStep2(): void { if (this.canProceedToStep2()) this.step.set('step2'); }
  goToStep1(): void { this.step.set('step1'); }

  /**
   * Sends all form values to the RecipeGeneratorService.
   * On `quota_exceeded` a modal is shown instead of an inline error message;
   * all other errors are stored as text in the `errorMsg` signal on step 2.
   */
  async generate(): Promise<void> {
    if (!this.canGenerate()) return;

    this.errorMsg.set(null);
    this.step.set('loading');

    try {
      const recipes = await this.generatorService.generate({
        ingredients: this.ingredients(),
        portions:    this.portions(),
        chefs:       this.chefs(),
        time:        this.selectedTime()!,
        cuisine:     this.selectedCuisine()!,
        diet:        this.selectedDiet()!,
      });
      this.results.set(recipes);
      this.generatorService.lastResults = recipes;
      this.step.set('results');
    } catch (err: any) {
      // quota_exceeded triggers a modal instead of an inline error
      if (err?.message === 'quota_exceeded') {
        this.showQuotaModal.set(true);
      } else {
        this.errorMsg.set('Something went wrong. Please try again.');
        this.step.set('step2');
      }
    }
  }

  /** Closes the quota modal and navigates to the cookbook as an alternative */
  goToCookbook(): void {
    this.showQuotaModal.set(false);
    this.generatorService.lastResults = [];
    this.router.navigate(['/cookbook']);
  }

  reset(): void {
    this.generatorService.lastResults = [];
    this.step.set('step1');
    this.ingredients.set([]);
    this.ingredientInput = '';
    this.selectedTime.set(null);
    this.selectedCuisine.set(null);
    this.selectedDiet.set(null);
  }
}
