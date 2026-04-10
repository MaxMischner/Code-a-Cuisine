import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

// ── Types ─────────────────────────────────────────────────────

/** Input data sent to the n8n webhook */
export interface GeneratePayload {
  ingredients: { name: string; amount: number; unit: string }[];
  portions:    number;
  chefs:       number;
  time:        string;   // 'quick' | 'medium' | 'complex'
  cuisine:     string;   // 'Italian' | 'German' etc.
  diet:        string;   // 'Vegetarian' | 'Vegan' | 'Keto' | 'No preferences'
}

/** Compact recipe object returned by the webhook after generation */
export interface GeneratedRecipe {
  id:    string;
  title: string;
  time:  string;
}

/** Response format of the n8n webhook — always contains exactly 3 recipes */
export interface GenerateResponse {
  recipes: GeneratedRecipe[];  // always exactly 3
}

// ── Service ───────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class RecipeGeneratorService {

  /**
   * Cache for the last generation results.
   * Used to restore the results when the user navigates back
   * from the recipe detail page to the generator page.
   */
  lastResults: GeneratedRecipe[] = [];


  /**
   * Sends the user inputs to the n8n webhook.
   * n8n calls Gemini, saves 3 recipes to Supabase
   * and returns their IDs + titles + cooking times.
   */
  async generate(payload: GeneratePayload): Promise<GeneratedRecipe[]> {
    const url = environment.n8nWebhookUrl;

    if (!url) {
      // Fallback during development (n8n not yet configured)
      console.warn('n8nWebhookUrl not set — using mock data');
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

  /** Static mock data for development without an active n8n webhook */
  private mockResponse(): GeneratedRecipe[] {
    return [
      { id: '1', title: 'Pasta with spinach and cherry tomatoes', time: '20min' },
      { id: '2', title: 'Creamy garlic shrimp pasta',             time: '22min' },
      { id: '3', title: 'Pasta alla Trapanese',                   time: '20min' },
    ];
  }
}
