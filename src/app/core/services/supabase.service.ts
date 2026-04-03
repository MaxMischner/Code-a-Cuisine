import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

// ── Supabase Tabellen-Typen ──────────────────────────────────

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
  steps: { chef: 1 | 2; text: string }[];
  likes: number;
  created_at: string;
}

export interface DbQuota {
  ip: string;
  count: number;
  date: string;   // YYYY-MM-DD
}

// ── Service ──────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class SupabaseService {

  private readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey
    );
  }

  // ── Rezepte ─────────────────────────────────────────────────

  /** Alle Rezepte einer Küche, sortiert nach Likes */
  async getRecipesByCuisine(cuisine: string): Promise<DbRecipe[]> {
    const { data, error } = await this.client
      .from('recipes')
      .select('*')
      .ilike('cuisine', cuisine)
      .order('likes', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  /** Einzelnes Rezept per ID */
  async getRecipeById(id: string): Promise<DbRecipe | null> {
    const { data, error } = await this.client
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /** Top N Rezepte nach Likes (für Cookbook Most Liked) */
  async getMostLiked(limit = 10): Promise<DbRecipe[]> {
    const { data, error } = await this.client
      .from('recipes')
      .select('*')
      .order('likes', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  }

  /** Rezept aus n8n-Webhook eintragen */
  async insertRecipe(recipe: Omit<DbRecipe, 'id' | 'created_at' | 'likes'>): Promise<DbRecipe> {
    const { data, error } = await this.client
      .from('recipes')
      .insert({ ...recipe, likes: 0 })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /** Like eines Rezepts um 1 erhöhen */
  async likeRecipe(id: string): Promise<void> {
    const { error } = await this.client.rpc('increment_likes', { recipe_id: id });
    if (error) throw error;
  }

  // ── Quota (IP-basiert) ───────────────────────────────────────

  /**
   * Prüft ob eine IP heute noch generieren darf.
   * Limit: 3 pro IP / Tag — 12 gesamt / Tag (systemweit).
   */
  async checkQuota(ip: string): Promise<{ allowed: boolean; remaining: number }> {
    const today = new Date().toISOString().slice(0, 10);

    // IP-spezifisch
    const { data: ipRow } = await this.client
      .from('quota')
      .select('count')
      .eq('ip', ip)
      .eq('date', today)
      .maybeSingle();

    const ipCount = ipRow?.count ?? 0;
    if (ipCount >= 3) return { allowed: false, remaining: 0 };

    // Systemweit
    const { data: sysRows } = await this.client
      .from('quota')
      .select('count')
      .eq('date', today);

    const sysTotal = (sysRows ?? []).reduce((sum, r) => sum + r.count, 0);
    if (sysTotal >= 12) return { allowed: false, remaining: 0 };

    return { allowed: true, remaining: 3 - ipCount };
  }

  /** Quota-Zähler für eine IP erhöhen (nach erfolgreicher Generierung) */
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
