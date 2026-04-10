import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

// ── Supabase Table Types ──────────────────────────────────────

/**
 * Represents a recipe record from the `recipes` table in Supabase.
 *
 * `your_ingredients` are the ingredients entered by the user;
 * `additional_ingredients` are ingredients added by the AI model.
 * `steps` contain a chef assignment (1 or 2) for the two-chef view.
 */
export interface DbRecipe {
  id: string;
  title: string;
  time: string;
  portions: number;
  cuisine: string;
  diet: string;
  tags: string[];
  nutrition: { label: string; value: string }[];
  your_ingredients: { amount: string; name: string }[];
  additional_ingredients: { amount: string; name: string }[];
  steps: { chef: 1 | 2; title?: string; text: string }[];
  likes: number;
  created_at: string;
}

/** Daily quota record per IP address in the `quota` table */
export interface DbQuota {
  ip: string;
  count: number;
  date: string;   // YYYY-MM-DD
}

// ── Service ───────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class SupabaseService {

  private readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey
    );
  }

  // ── Recipes ──────────────────────────────────────────────────

  /** Returns all recipes for a cuisine, sorted by likes descending */
  async getRecipesByCuisine(cuisine: string): Promise<DbRecipe[]> {
    const { data, error } = await this.client
      .from('recipes')
      .select('*')
      .ilike('cuisine', cuisine)
      .order('likes', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async getRecipeById(id: string): Promise<DbRecipe | null> {
    const { data, error } = await this.client
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Returns the most liked recipes across all cuisines.
   * @param limit - Maximum number of recipes (default: 10)
   */
  async getMostLiked(limit = 10): Promise<DbRecipe[]> {
    const { data, error } = await this.client
      .from('recipes')
      .select('*')
      .order('likes', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Saves a new recipe to Supabase. Called by the n8n workflow,
   * not directly from the frontend. `likes` is initialised to 0 server-side.
   */
  async insertRecipe(recipe: Omit<DbRecipe, 'id' | 'created_at' | 'likes'>): Promise<DbRecipe> {
    const { data, error } = await this.client
      .from('recipes')
      .insert({ ...recipe, likes: 0 })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /** Retrieves the user's public IP via ipify. Returns 'unknown' if the request fails. */
  async getIp(): Promise<string> {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /** Checks whether an IP has already liked a specific recipe */
  async hasLiked(recipeId: string, ip: string): Promise<boolean> {
    const { data } = await this.client
      .from('likes')
      .select('id')
      .eq('recipe_id', recipeId)
      .eq('ip', ip)
      .maybeSingle();
    return data !== null;
  }

  /**
   * Adds a like entry to the `likes` table and increments the
   * likes counter on the recipe via the DB function `increment_likes`.
   * @throws `Error('already_liked')` if the IP has already liked this recipe
   */
  async likeRecipe(recipeId: string, ip: string): Promise<void> {
    // Guard: already liked → no duplicate entry
    const alreadyLiked = await this.hasLiked(recipeId, ip);
    if (alreadyLiked) throw new Error('already_liked');

    const { error } = await this.client
      .from('likes')
      .insert({ recipe_id: recipeId, ip });
    if (error) throw error;

    await this.client.rpc('increment_likes', { recipe_id: recipeId });
  }

  /**
   * Removes the like entry and decrements the counter via `decrement_likes`.
   * @throws `Error('not_liked')` if no like entry exists for this IP
   */
  async unlikeRecipe(recipeId: string, ip: string): Promise<void> {
    // Guard: not liked → no decrement
    const isLiked = await this.hasLiked(recipeId, ip);
    if (!isLiked) throw new Error('not_liked');

    const { error } = await this.client
      .from('likes')
      .delete()
      .eq('recipe_id', recipeId)
      .eq('ip', ip);
    if (error) throw error;

    await this.client.rpc('decrement_likes', { recipe_id: recipeId });
  }

  // ── Quota (IP-based) ─────────────────────────────────────────

  /**
   * Checks whether an IP is still allowed to generate today.
   * Limit: 3 per IP / day — 12 total / day (system-wide).
   */
  async checkQuota(ip: string): Promise<{ allowed: boolean; remaining: number }> {
    const today = new Date().toISOString().slice(0, 10);

    // IP-specific
    const { data: ipRow } = await this.client
      .from('quota')
      .select('count')
      .eq('ip', ip)
      .eq('date', today)
      .maybeSingle();

    const ipCount = ipRow?.count ?? 0;
    if (ipCount >= 3) return { allowed: false, remaining: 0 };

    // System-wide
    const { data: sysRows } = await this.client
      .from('quota')
      .select('count')
      .eq('date', today);

    const sysTotal = (sysRows ?? []).reduce((sum, r) => sum + r.count, 0);
    if (sysTotal >= 12) return { allowed: false, remaining: 0 };

    return { allowed: true, remaining: 3 - ipCount };
  }

  /**
   * Increments the generation counter for the IP by 1. Creates a new record
   * if the IP has no entry for today yet (upsert logic without a DB constraint).
   */
  async incrementQuota(ip: string): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);

    const { data: existing } = await this.client
      .from('quota')
      .select('id, count')
      .eq('ip', ip)
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      await this.client
        .from('quota')
        .update({ count: existing.count + 1 })
        .eq('id', (existing as any).id);
    } else {
      await this.client
        .from('quota')
        .insert({ ip, count: 1, date: today });
    }
  }
}
