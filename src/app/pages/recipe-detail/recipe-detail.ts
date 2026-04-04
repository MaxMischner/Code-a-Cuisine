import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { SupabaseService } from '../../core/services/supabase.service';

export interface RecipeStep {
  chef: 1 | 2;
  title?: string;
  text: string;
}

@Component({
  selector: 'app-recipe-detail',
  imports: [RouterLink, Navbar],
  templateUrl: './recipe-detail.html',
  styleUrl: './recipe-detail.scss',
})
export class RecipeDetail implements OnInit {

  recipe = signal<any | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  liked = signal(false);

  backRoute = signal('/generator');
  backLabel = signal('Recipe results');

  constructor(
    private route: ActivatedRoute,
    private supabase: SupabaseService,
  ) {}

  async ngOnInit(): Promise<void> {
    const state = window.history.state;
    if (state?.backRoute) this.backRoute.set(state.backRoute);
    if (state?.backLabel) this.backLabel.set(state.backLabel);

    const id = this.route.snapshot.paramMap.get('id') ?? '';
    try {
      const data = await this.supabase.getRecipeById(id);
      this.recipe.set(data);
    } catch (err) {
      this.error.set('Recipe could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }

  get hasChef2(): boolean {
    return (this.recipe()?.steps ?? []).some((s: RecipeStep) => s.chef === 2);
  }

  get chefCount(): number {
    const steps: RecipeStep[] = this.recipe()?.steps ?? [];
    return steps.length > 0 ? Math.max(...steps.map(s => s.chef)) : 1;
  }

  async likeRecipe(id: string): Promise<void> {
    if (this.liked()) return;
    this.liked.set(true);
    try {
      await this.supabase.likeRecipe(id);
      const r = this.recipe();
      if (r) this.recipe.set({ ...r, likes: (r.likes ?? 0) + 1 });
    } catch {
      this.liked.set(false);
    }
  }
}
