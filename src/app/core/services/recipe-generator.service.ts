import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

// ── Typen ────────────────────────────────────────────────────

export interface GeneratePayload {
  ingredients: { name: string; amount: number; unit: string }[];
  portions:    number;
  chefs:       number;
  time:        string;   // 'quick' | 'medium' | 'complex'
  cuisine:     string;   // 'Italian' | 'German' etc.
  diet:        string;   // 'Vegetarian' | 'Vegan' | 'Keto' | 'No preferences'
}

export interface GeneratedRecipe {
  id:    string;
  title: string;
  time:  string;
}

export interface GenerateResponse {
  recipes: GeneratedRecipe[];  // immer genau 3
}

// ── Service ──────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class RecipeGeneratorService {

  /** Letzte Ergebnisse — bleibt bei Navigation erhalten */
  lastResults: GeneratedRecipe[] = [];


  /**
   * Sendet die Nutzereingaben an den n8n-Webhook.
   * n8n ruft Gemini auf, speichert 3 Rezepte in Supabase
   * und liefert deren IDs + Titel + Kochzeit zurück.
   */
  async generate(payload: GeneratePayload): Promise<GeneratedRecipe[]> {
    const url = environment.n8nWebhookUrl;

    if (!url) {
      // Fallback während Entwicklung (n8n noch nicht konfiguriert)
      console.warn('n8nWebhookUrl nicht gesetzt — nutze Mock-Daten');
      return this.mockResponse();
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`n8n Webhook Fehler: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data?.error === 'quota_exceeded' || data?.[0]?.json?.error === 'quota_exceeded') {
      throw new Error('quota_exceeded');
    }

    return (data as GenerateResponse).recipes;
  }

  private mockResponse(): GeneratedRecipe[] {
    return [
      { id: '1', title: 'Pasta with spinach and cherry tomatoes', time: '20min' },
      { id: '2', title: 'Creamy garlic shrimp pasta',             time: '22min' },
      { id: '3', title: 'Pasta alla Trapanese',                   time: '20min' },
    ];
  }
}
