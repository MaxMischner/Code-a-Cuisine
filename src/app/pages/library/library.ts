import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { SupabaseService, DbRecipe } from '../../core/services/supabase.service';

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
 * Bibliotheks-Seite — zeigt alle Rezepte einer Küche paginiert an.
 *
 * Die Küche wird aus dem Route-Parameter `:cuisine` gelesen.
 * Rezepte werden nach Likes absteigend sortiert.
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

  /** Gesamtanzahl der Seiten basierend auf den geladenen Rezepten */
  readonly totalPages = computed(() =>
    Math.ceil(this.recipes().length / PER_PAGE)
  );

  /** Rezepte der aktuellen Seite (Slice aus dem vollständigen Array) */
  readonly pagedRecipes = computed(() => {
    const start = (this.page() - 1) * PER_PAGE;
    return this.recipes().slice(start, start + PER_PAGE);
  });

  /** Array mit Seitenzahlen [1, 2, …, n] für die Paginierungs-UI */
  readonly pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );

  constructor(
    private route: ActivatedRoute,
    private supabase: SupabaseService,
  ) {}

  /**
   * Liest den Küchen-Slug aus der Route und lädt die passenden Rezepte.
   * Setzt Bild-Pfade für Desktop und Mobile anhand des Slugs.
   */
  async ngOnInit(): Promise<void> {
    const slug = this.route.snapshot.paramMap.get('cuisine') ?? 'italian';
    this.cuisineSlug.set(slug);
    this.cuisineLabel.set(slug.charAt(0).toUpperCase() + slug.slice(1));
    this.cuisineImage.set(CUISINE_IMAGES[slug] ?? '/cookbook_recipes/Property 1=Italian.svg');
    this.cuisineMobileImage.set(CUISINE_MOBILE_IMAGES[slug] ?? '/cookbook_recipes/Mobil/Property 1=Italian.svg');

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
