import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { SupabaseService, DbRecipe } from '../../core/services/supabase.service';

const CUISINE_IMAGES: Record<string, string> = {
  italian:  '/cookbook_recipes/Property 1=Italian.svg',
  german:   '/cookbook_recipes/Property 1=German.svg',
  japanese: '/cookbook_recipes/Property 1=Japanese.svg',
  indian:   '/cookbook_recipes/Property 1=Indian.svg',
  gourmet:  '/cookbook_recipes/Property 1=Gourmet.svg',
  fusion:   '/cookbook_recipes/Property 1=Fusion.svg',
};

const PER_PAGE = 10;

@Component({
  selector: 'app-library',
  imports: [RouterLink, Navbar],
  templateUrl: './library.html',
  styleUrl: './library.scss',
})
export class Library implements OnInit {

  cuisineSlug  = signal('');
  cuisineLabel = signal('');
  cuisineImage = signal('');

  recipes = signal<DbRecipe[]>([]);
  loading = signal(true);
  page    = signal(1);

  readonly totalPages = computed(() =>
    Math.ceil(this.recipes().length / PER_PAGE)
  );

  readonly pagedRecipes = computed(() => {
    const start = (this.page() - 1) * PER_PAGE;
    return this.recipes().slice(start, start + PER_PAGE);
  });

  readonly pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );

  constructor(
    private route: ActivatedRoute,
    private supabase: SupabaseService,
  ) {}

  async ngOnInit(): Promise<void> {
    const slug = this.route.snapshot.paramMap.get('cuisine') ?? 'italian';
    this.cuisineSlug.set(slug);
    this.cuisineLabel.set(slug.charAt(0).toUpperCase() + slug.slice(1));
    this.cuisineImage.set(CUISINE_IMAGES[slug] ?? '/Cuisine-Bilder/card-1.svg');

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
