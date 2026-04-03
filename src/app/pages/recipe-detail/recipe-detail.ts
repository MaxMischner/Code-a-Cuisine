import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { SupabaseService } from '../../core/services/supabase.service';

export interface RecipeStep {
  chef: 1 | 2;
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

  constructor(
    private route: ActivatedRoute,
    private supabase: SupabaseService,
  ) {}

  async ngOnInit(): Promise<void> {
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
}
