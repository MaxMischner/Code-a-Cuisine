import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { SupabaseService } from '../../core/services/supabase.service';

/** Ein einzelner Zubereitungsschritt mit Chef-Zuweisung */
export interface RecipeStep {
  chef: 1 | 2 | 3 | 4;
  title?: string;
  text: string;
}

/**
 * Rezept-Detailseite — zeigt ein vollständiges Rezept aus Supabase.
 *
 * Unterstützt dynamische Zurück-Navigation via `window.history.state`
 * (entweder zurück zu den Generator-Ergebnissen oder zur Bibliothek).
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

  constructor(
    private route: ActivatedRoute,
    private supabase: SupabaseService,
  ) {}

  /**
   * Lädt das Rezept anhand der Route-ID.
   * Setzt Zurück-Navigation aus dem History-State wenn vorhanden.
   */
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

  /**
   * Gibt an ob das Rezept Schritte für Chef 2 enthält.
   * Wird verwendet um den zweiten Chef-Avatar anzuzeigen.
   */
  get hasChef2(): boolean {
    return (this.recipe()?.steps ?? []).some((s: RecipeStep) => s.chef === 2);
  }

  /**
   * Ermittelt die Anzahl der benötigten Köche aus den Schritten.
   * Entspricht dem höchsten Chef-Wert in den Steps.
   */
  get chefCount(): number {
    const steps: RecipeStep[] = this.recipe()?.steps ?? [];
    return steps.length > 0 ? Math.max(...steps.map(s => s.chef)) : 1;
  }

  /**
   * Sendet einen Like für das aktuelle Rezept.
   * Verhindert mehrfaches Liken (optimistic update mit Rollback bei Fehler).
   * @param id - UUID des Rezepts
   */
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
