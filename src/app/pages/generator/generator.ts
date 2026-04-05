import { Component, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { RecipeGeneratorService } from '../../core/services/recipe-generator.service';

/** Mögliche Einheiten für Zutatenmengen */
export type Unit = 'gram' | 'ml' | 'piece' | 'tbsp' | 'tsp';

/** Eine eingegebene Zutat */
export interface Ingredient {
  name: string;
  amount: number;
  unit: Unit;
}

/** Kochzeit-Optionen */
export type CookingTime = 'quick' | 'medium' | 'complex';

/** Kochstil-Optionen */
export type Cuisine = 'German' | 'Italian' | 'Indian' | 'Japanese' | 'Gourmet' | 'Fusion';

/** Diät-Optionen */
export type Diet = 'Vegetarian' | 'Vegan' | 'Keto' | 'No preferences';

/** Aktueller Schritt des Generators */
export type GeneratorStep = 'step1' | 'step2' | 'loading' | 'results';

/**
 * Generator-Komponente — verwaltet alle 4 Zustände:
 * step1 (Zutaten) → step2 (Präferenzen) → loading → results
 */
@Component({
  selector: 'app-generator',
  imports: [FormsModule, RouterLink, Navbar],
  templateUrl: './generator.html',
  styleUrl: './generator.scss',
})
export class Generator implements OnInit {

  constructor(private generatorService: RecipeGeneratorService, private router: Router) {}

  ngOnInit(): void {
    const state = window.history.state;
    if (state?.restoreResults && this.generatorService.lastResults.length > 0) {
      this.results.set(this.generatorService.lastResults);
      this.step.set('results');
    }
  }

  // ── State ──────────────────────────────────────────────────

  /** Aktueller Schritt */
  readonly step = signal<GeneratorStep>('step1');

  // Step 1 — Zutaten
  readonly ingredients = signal<Ingredient[]>([]);
  ingredientInput = '';
  amountInput: number = 100;
  unitInput: Unit = 'gram';

  // Autocomplete
  readonly autocompleteVisible = signal(false);
  readonly autocompleteResults = signal<string[]>([]);

  // Inline edit
  readonly editingIndex = signal<number | null>(null);
  editAmount = 100;
  editUnit: Unit = 'gram';

  // Beispiel-Zutatenliste für Autocomplete
  private readonly allIngredients = [
    // Grains & Pasta
    'Pasta', 'Spaghetti', 'Penne', 'Fusilli', 'Tagliatelle', 'Lasagne sheets',
    'Rice', 'Basmati rice', 'Jasmine rice', 'Brown rice', 'Risotto rice',
    'Bread', 'Breadcrumbs', 'Flour', 'Whole wheat flour', 'Cornstarch',
    'Oats', 'Couscous', 'Quinoa', 'Polenta', 'Noodles', 'Udon noodles', 'Rice noodles',
    // Vegetables
    'Onion', 'Red onion', 'Spring onion', 'Garlic', 'Shallot',
    'Tomato', 'Cherry tomatoes', 'Passata', 'Paprika', 'Bell pepper',
    'Broccoli', 'Cauliflower', 'Spinach', 'Kale', 'Lettuce', 'Arugula',
    'Carrot', 'Parsnip', 'Pastinake', 'Celery', 'Celeriac',
    'Potato', 'Sweet potato', 'Zucchini', 'Eggplant', 'Cucumber',
    'Mushrooms', 'Champignons', 'Shiitake', 'Portobello mushrooms',
    'Peas', 'Edamame', 'Green beans', 'Asparagus', 'Artichoke',
    'Corn', 'Leek', 'Fennel', 'Bok choy', 'Bean sprouts',
    'Beetroot', 'Radish', 'Turnip', 'Kohlrabi', 'Pumpkin', 'Butternut squash',
    // Proteins — Meat & Fish
    'Chicken', 'Chicken breast', 'Chicken thighs', 'Chicken wings',
    'Beef', 'Ground beef', 'Beef steak', 'Pork', 'Pork belly', 'Bacon',
    'Lamb', 'Turkey', 'Duck',
    'Salmon', 'Tuna', 'Cod', 'Sea bass', 'Shrimp', 'Prawns', 'Squid',
    'Anchovies', 'Sardines', 'Mackerel', 'Trout', 'Mussels', 'Clams',
    // Proteins — Plant
    'Egg', 'Tofu', 'Tempeh', 'Lentils', 'Chickpeas', 'Black beans',
    'Kidney beans', 'White beans', 'Edamame beans',
    // Dairy & Alternatives
    'Milk', 'Cream', 'Heavy cream', 'Sour cream', 'Crème fraîche',
    'Butter', 'Ghee', 'Yogurt', 'Greek yogurt',
    'Cheese', 'Parmesan', 'Mozzarella', 'Cheddar', 'Feta', 'Ricotta',
    'Brie', 'Gouda', 'Emmental', 'Cream cheese', 'Mascarpone',
    'Oat milk', 'Almond milk', 'Coconut milk', 'Coconut cream',
    // Herbs & Spices
    'Basil', 'Oregano', 'Thyme', 'Rosemary', 'Parsley', 'Cilantro',
    'Mint', 'Sage', 'Bay leaves', 'Tarragon', 'Chives', 'Dill',
    'Cumin', 'Coriander', 'Turmeric', 'Paprika powder', 'Smoked paprika',
    'Chili flakes', 'Cayenne pepper', 'Ginger', 'Cinnamon', 'Nutmeg',
    'Cardamom', 'Cloves', 'Star anise', 'Saffron', 'Vanilla',
    'Black pepper', 'White pepper', 'Salt', 'Curry powder', 'Garam masala',
    // Oils, Vinegars & Sauces
    'Olive oil', 'Sunflower oil', 'Sesame oil', 'Coconut oil',
    'Balsamic vinegar', 'Red wine vinegar', 'Rice vinegar', 'Apple cider vinegar',
    'Soy sauce', 'Tamari', 'Fish sauce', 'Oyster sauce', 'Hoisin sauce',
    'Worcestershire sauce', 'Tabasco', 'Sriracha', 'Miso paste',
    'Tomato paste', 'Tomato sauce', 'Pesto', 'Tahini', 'Hummus',
    // Sweeteners & Baking
    'Sugar', 'Brown sugar', 'Honey', 'Maple syrup', 'Agave syrup',
    'Baking powder', 'Baking soda', 'Yeast', 'Cocoa powder', 'Dark chocolate',
    // Fruits & Nuts
    'Lemon', 'Lime', 'Orange', 'Lemon zest', 'Orange zest',
    'Apple', 'Banana', 'Mango', 'Avocado', 'Strawberry', 'Blueberry',
    'Raspberry', 'Grapes', 'Pineapple', 'Pomegranate', 'Peach', 'Plum',
    'Walnuts', 'Almonds', 'Cashews', 'Pine nuts', 'Pistachios',
    'Peanuts', 'Peanut butter', 'Sesame seeds', 'Chia seeds', 'Sunflower seeds',
    // Stocks & Liquids
    'Vegetable stock', 'Chicken stock', 'Beef stock', 'White wine', 'Red wine',
    'Beer', 'Water', 'Sparkling water',
  ];

  // Step 2 — Präferenzen
  portions = signal(2);
  chefs = signal(1);
  selectedTime = signal<CookingTime | null>(null);
  selectedCuisine = signal<Cuisine | null>(null);
  selectedDiet = signal<Diet | null>(null);

  readonly results       = signal<{ id: string; title: string; time: string }[]>([]);
  readonly errorMsg      = signal<string | null>(null);
  readonly showQuotaModal = signal(false);

  // ── Computed ───────────────────────────────────────────────

  /** Step 1: "Next step" nur sichtbar wenn ≥1 Zutat */
  readonly canProceedToStep2 = computed(() => this.ingredients().length > 0);

  /** Step 2: "Generate" nur wenn alle Präferenzen gewählt */
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

  // ── Step 1 Methoden ────────────────────────────────────────

  /**
   * Filtert die Zutatenliste basierend auf der Eingabe und zeigt Autocomplete.
   * @param value - Aktueller Eingabewert
   */
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

  /**
   * Wählt einen Autocomplete-Vorschlag aus.
   * @param name - Ausgewählter Zutatename
   */
  selectSuggestion(name: string): void {
    this.ingredientInput = name;
    this.autocompleteVisible.set(false);
  }

  /**
   * Fügt die aktuell eingegebene Zutat zur Liste hinzu.
   */
  addIngredient(): void {
    const raw = this.ingredientInput.trim();
    const name = raw.replace(/[^a-zA-ZäöüÄÖÜß0-9 \-]/g, '').slice(0, 50);
    if (!name) return;
    this.ingredients.update(list => [
      ...list,
      { name, amount: this.amountInput, unit: this.unitInput }
    ]);
    this.ingredientInput = '';
    this.amountInput = 100;
    this.autocompleteVisible.set(false);
  }

  /**
   * Entfernt eine Zutat aus der Liste.
   * @param index - Index der zu entfernenden Zutat
   */
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

  /** Formatiert eine Einheit für die Anzeige */
  formatUnit(unit: Unit): string {
    const map: Record<Unit, string> = {
      gram: 'g', ml: 'ml', piece: 'x', tbsp: 'tbsp', tsp: 'tsp'
    };
    return map[unit];
  }

  // ── Step 2 Methoden ────────────────────────────────────────

  /** Erhöht die Portionsanzahl (max 12) */
  increasePortions(): void { if (this.portions() < 12) this.portions.update(v => v + 1); }

  /** Verringert die Portionsanzahl (min 1) */
  decreasePortions(): void { if (this.portions() > 1)  this.portions.update(v => v - 1); }

  /** Erhöht die Kochhelfer-Anzahl (max 4) */
  increaseChefs(): void { if (this.chefs() < 4) this.chefs.update(v => v + 1); }

  /** Verringert die Kochhelfer-Anzahl (min 1) */
  decreaseChefs(): void { if (this.chefs() > 1) this.chefs.update(v => v - 1); }

  // ── Navigation ─────────────────────────────────────────────

  /** Geht zu Step 2 */
  goToStep2(): void { if (this.canProceedToStep2()) this.step.set('step2'); }

  /** Geht zurück zu Step 1 */
  goToStep1(): void { this.step.set('step1'); }

  /**
   * Startet die Rezeptgenerierung — wechselt zu Loading,
   * dann (nach API-Antwort) zu Results.
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
      console.error('Generierung fehlgeschlagen:', err);
      if (err?.message === 'quota_exceeded') {
        this.showQuotaModal.set(true);
        // step bleibt 'loading' — GIF bleibt sichtbar hinter dem Modal
      } else {
        this.errorMsg.set('Something went wrong. Please try again.');
        this.step.set('step2');
      }
    }
  }

  goToCookbook(): void {
    this.showQuotaModal.set(false);
    this.generatorService.lastResults = [];
    this.router.navigate(['/cookbook']);
  }

  /** Startet den Generator neu */
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
