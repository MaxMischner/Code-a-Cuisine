import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { SupabaseService, DbRecipe } from '../../core/services/supabase.service';

interface CuisineCategory {
  name: string;
  emoji: string;
  slug: string;
  image: string;
}

@Component({
  selector: 'app-cookbook',
  imports: [RouterLink, Navbar],
  templateUrl: './cookbook.html',
  styleUrl: './cookbook.scss',
})
export class Cookbook implements OnInit {

  mostLiked = signal<DbRecipe[]>([]);
  loading   = signal(true);

  cuisines: CuisineCategory[] = [
    { name: 'Italian',  emoji: '🍝', slug: 'italian',  image: '/Cuisine-Bilder/card-1.svg' },
    { name: 'German',   emoji: '🍻', slug: 'german',   image: '/Cuisine-Bilder/card-2.svg' },
    { name: 'Japanese', emoji: '🍢', slug: 'japanese', image: '/Cuisine-Bilder/card-3.svg' },
    { name: 'Indian',   emoji: '🍛', slug: 'indian',   image: '/Cuisine-Bilder/card-4.svg' },
    { name: 'Gourmet',  emoji: '🤌', slug: 'gourmet',  image: '/Cuisine-Bilder/card-5.svg' },
    { name: 'Fusion',   emoji: '🫕', slug: 'fusion',   image: '/Cuisine-Bilder/card.svg'   },
  ];

  constructor(private supabase: SupabaseService) {}

  async ngOnInit(): Promise<void> {
    try {
      const recipes = await this.supabase.getMostLiked(10);
      this.mostLiked.set(recipes);
    } finally {
      this.loading.set(false);
    }
  }
}
