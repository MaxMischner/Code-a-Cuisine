import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink, Router, NavigationEnd } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { SupabaseService, DbRecipe } from '../../core/services/supabase.service';
import { filter } from 'rxjs/operators';

const CUISINE_IMAGES: Record<string, string> = {
  italian:  'cookbook_recipes/Property 1=Italian.svg',
  german:   'cookbook_recipes/Property 1=German.svg',
  japanese: 'cookbook_recipes/Property 1=Japanese.svg',
  indian:   'cookbook_recipes/Property 1=Indian.svg',
  gourmet:  'cookbook_recipes/Property 1=Gourmet.svg',
  fusion:   'cookbook_recipes/Property 1=Fusion.svg',
};

const CUISINE_MOBILE_IMAGES: Record<string, string> = {
  italian:  'cookbook_recipes/Mobil/Property 1=Italian.svg',
  german:   'cookbook_recipes/Mobil/Property 1=German.svg',
  japanese: 'cookbook_recipes/Mobil/Property 1=Japanese.svg',
  indian:   'cookbook_recipes/Mobil/Property 1=Indian.svg',
  gourmet:  'cookbook_recipes/Mobil/Property 1=Gourmet.svg',
  fusion:   'cookbook_recipes/Mobil/Property 1=Fusion.svg',
};

const PER_PAGE = 10;

/**
 * Library page — displays all recipes of a cuisine with pagination.
 *
 * The cuisine is read from the route parameter `:cuisine`.
 * Recipes are sorted by likes descending.
 */
@Component({
  selector: 'app-library',
  imports: [RouterLink, Navbar],
  templateUrl: './library.html',
  styleUrl: './library.scss',
})
export class Library implements OnInit {

  cuisineSlug        = signal('');
  cuisineLabel       = signal('');
  cuisineImage       = signal('');
  cuisineMobileImage = signal('');

  recipes = signal<DbRecipe[]>([]);
  loading = signal(true);
  page    = signal(1);

  /** Total number of pages based on the loaded recipes */
  readonly totalPages = computed(() =>
    Math.ceil(this.recipes().length / PER_PAGE)
  );

  /** Recipes for the current page (slice of the full array) */
  readonly pagedRecipes = computed(() => {
    const start = (this.page() - 1) * PER_PAGE;
    return this.recipes().slice(start, start + PER_PAGE);
  });

  /** Array of page numbers [1, 2, …, n] for the pagination UI */
  readonly pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabase: SupabaseService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadRecipes();

    // Reload data when navigating back to the library
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => this.loadRecipes());
  }

  /**
   * Reads the `:cuisine` parameter from the route, sets all display signals
   * (label, image URLs) and loads the filtered recipes from Supabase.
   */
  private async loadRecipes(): Promise<void> {
    const slug = this.route.snapshot.paramMap.get('cuisine') ?? 'italian';
    this.cuisineSlug.set(slug);
    this.cuisineLabel.set(slug.charAt(0).toUpperCase() + slug.slice(1));
    this.cuisineImage.set(CUISINE_IMAGES[slug] ?? 'cookbook_recipes/Property 1=Italian.svg');
    this.cuisineMobileImage.set(CUISINE_MOBILE_IMAGES[slug] ?? 'cookbook_recipes/Mobil/Property 1=Italian.svg');

    this.loading.set(true);
    try {
      const recipes = await this.supabase.getRecipesByCuisine(slug);
      this.recipes.set(recipes);
    } finally {
      this.loading.set(false);
    }
  }

  prevPage(): void { if (this.page() > 1) this.page.update(p => p - 1); }
  nextPage(): void { if (this.page() < this.totalPages()) this.page.update(p => p + 1); }
}
