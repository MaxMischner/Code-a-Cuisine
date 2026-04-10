import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { SupabaseService } from '../../core/services/supabase.service';

/** A single preparation step with chef assignment */
export interface RecipeStep {
  chef: 1 | 2 | 3 | 4;
  title?: string;
  text: string;
}

/**
 * Recipe detail page — displays a complete recipe from Supabase.
 *
 * Supports dynamic back navigation via `window.history.state`
 * (either back to the generator results or to the library).
 */
@Component({
  selector: 'app-recipe-detail',
  imports: [RouterLink, Navbar],
  templateUrl: './recipe-detail.html',
  styleUrl: './recipe-detail.scss',
})
export class RecipeDetail implements OnInit {

  recipe  = signal<any | null>(null);
  loading = signal(true);
  error   = signal<string | null>(null);
  liked   = signal(false);

  backRoute = signal('/generator');
  backLabel = signal('Recipe results');

  private ip = 'unknown';

  constructor(
    private route: ActivatedRoute,
    private supabase: SupabaseService,
  ) {}

  /**
   * Reads optional navigation state data (`backRoute`, `backLabel`) from
   * `window.history.state` and loads the recipe + like status in parallel.
   */
  async ngOnInit(): Promise<void> {
    const state = window.history.state;
    if (state?.backRoute) this.backRoute.set(state.backRoute);
    if (state?.backLabel) this.backLabel.set(state.backLabel);

    const id = this.route.snapshot.paramMap.get('id') ?? '';

    try {
      const [data, ip] = await Promise.all([
        this.supabase.getRecipeById(id),
        this.supabase.getIp(),
      ]);
      this.recipe.set(data);
      this.ip = ip;
      this.liked.set(await this.supabase.hasLiked(id, ip));
    } catch (err) {
      this.error.set('Recipe could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }

  get hasChef2(): boolean {
    return (this.recipe()?.steps ?? []).some((s: RecipeStep) => s.chef === 2);
  }

  /** Highest chef value from the steps — determines how many avatars are shown */
  get chefCount(): number {
    const steps: RecipeStep[] = this.recipe()?.steps ?? [];
    return steps.length > 0 ? Math.max(...steps.map(s => s.chef)) : 1;
  }

  /**
   * Toggles the like status optimistically (UI updated immediately, DB asynchronously).
   * On known errors (`already_liked` / `not_liked`) the UI is corrected
   * to the actual DB state instead of being fully rolled back.
   * @param id - ID of the recipe to be liked/unliked
   */
  async likeRecipe(id: string): Promise<void> {
    const wasLiked = this.liked();
    const r = this.recipe();
    if (!r) return;

    this.liked.set(!wasLiked);
    this.recipe.set({ ...r, likes: Math.max(0, (r.likes ?? 0) + (wasLiked ? -1 : 1)) });

    try {
      if (wasLiked) {
        await this.supabase.unlikeRecipe(id, this.ip);
      } else {
        await this.supabase.likeRecipe(id, this.ip);
      }
    } catch (err: any) {
      // DB says already liked → correct UI to liked
      if (err?.message === 'already_liked') {
        this.liked.set(true);
        this.recipe.set({ ...r, likes: r.likes });
      // DB says not liked → correct UI to unliked
      } else if (err?.message === 'not_liked') {
        this.liked.set(false);
        this.recipe.set({ ...r, likes: r.likes });
      } else {
        // Real error → full rollback
        this.liked.set(wasLiked);
        this.recipe.set(r);
      }
    }
  }
}
