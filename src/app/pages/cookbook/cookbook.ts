import { Component, OnInit, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
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
    { name: 'Italian',  emoji: '🍝', slug: 'italian',  image: '/Cuisine-Bilder/Italian.svg'  },
    { name: 'German',   emoji: '🍻', slug: 'german',   image: '/Cuisine-Bilder/German.svg'   },
    { name: 'Japanese', emoji: '🍢', slug: 'japanese', image: '/Cuisine-Bilder/Japanese.svg' },
    { name: 'Indian',   emoji: '🍛', slug: 'indian',   image: '/Cuisine-Bilder/Indian.svg'   },
    { name: 'Gourmet',  emoji: '🤌', slug: 'gourmet',  image: '/Cuisine-Bilder/Gourmet.svg'  },
    { name: 'Fusion',   emoji: '🫕', slug: 'fusion',   image: '/Cuisine-Bilder/Fusion.svg'   },
  ];

  // ── Drag-to-scroll state ──────────────────────────────────────
  private isDragging = false;
  private dragStartX = 0;
  private dragScrollLeft = 0;
  private dragMoved = false;
  isDraggingActive = false;
  canScrollLeft = false;
  canScrollRight = true;

  // Momentum tracking
  private velocitySamples: { x: number; t: number }[] = [];
  private momentumRaf = 0;

  constructor(private supabase: SupabaseService, private router: Router) {}

  async ngOnInit(): Promise<void> {
    try {
      const recipes = await this.supabase.getMostLiked(5);
      this.mostLiked.set(recipes);
    } finally {
      this.loading.set(false);
    }
  }

  // ── Mouse events ─────────────────────────────────────────────

  onScrollMouseDown(event: MouseEvent, el: HTMLElement): void {
    this.stopMomentum();
    this.isDragging = true;
    this.dragMoved = false;
    this.isDraggingActive = false;
    this.dragStartX = event.pageX - el.offsetLeft;
    this.dragScrollLeft = el.scrollLeft;
    this.velocitySamples = [];
  }

  onScrollMouseMove(event: MouseEvent, el: HTMLElement): void {
    if (!this.isDragging) return;
    event.preventDefault();
    const x = event.pageX - el.offsetLeft;
    const dist = x - this.dragStartX;
    if (Math.abs(dist) > 4) {
      this.dragMoved = true;
      this.isDraggingActive = true;
    }
    el.scrollLeft = this.dragScrollLeft - dist;

    // Record velocity sample (keep last 5)
    const now = performance.now();
    this.velocitySamples.push({ x: event.pageX, t: now });
    if (this.velocitySamples.length > 5) this.velocitySamples.shift();
  }

  onScrollMouseUp(el?: HTMLElement): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.isDraggingActive = false;
    if (el) this.launchMomentum(el);
  }

  // ── Touch events ─────────────────────────────────────────────

  onScrollTouchStart(event: TouchEvent, el: HTMLElement): void {
    this.stopMomentum();
    this.isDragging = true;
    this.dragMoved = false;
    this.dragStartX = event.touches[0].pageX - el.offsetLeft;
    this.dragScrollLeft = el.scrollLeft;
    this.velocitySamples = [];
  }

  onScrollTouchMove(event: TouchEvent, el: HTMLElement): void {
    if (!this.isDragging) return;
    const x = event.touches[0].pageX - el.offsetLeft;
    const dist = x - this.dragStartX;
    if (Math.abs(dist) > 4) this.dragMoved = true;
    el.scrollLeft = this.dragScrollLeft - dist;

    const now = performance.now();
    this.velocitySamples.push({ x: event.touches[0].pageX, t: now });
    if (this.velocitySamples.length > 5) this.velocitySamples.shift();
  }

  onScrollTouchEnd(el: HTMLElement): void {
    this.isDragging = false;
    this.launchMomentum(el);
  }

  // ── Momentum ─────────────────────────────────────────────────

  private launchMomentum(el: HTMLElement): void {
    if (this.velocitySamples.length < 2) return;

    const first = this.velocitySamples[0];
    const last  = this.velocitySamples[this.velocitySamples.length - 1];
    const dt = last.t - first.t;
    if (dt === 0) return;

    // px/ms → convert to px/frame (60fps ≈ 16.67ms)
    let velocity = ((first.x - last.x) / dt) * 16.67;

    const friction = 0.92;
    const minSpeed = 0.5;

    const step = () => {
      el.scrollLeft += velocity;
      velocity *= friction;
      this.onScroll(el);
      if (Math.abs(velocity) > minSpeed) {
        this.momentumRaf = requestAnimationFrame(step);
      }
    };

    this.momentumRaf = requestAnimationFrame(step);
  }

  private stopMomentum(): void {
    if (this.momentumRaf) {
      cancelAnimationFrame(this.momentumRaf);
      this.momentumRaf = 0;
    }
  }

  // ── Scroll / arrows ──────────────────────────────────────────

  onScroll(el: HTMLElement): void {
    this.canScrollLeft  = el.scrollLeft > 0;
    this.canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  }

  scrollBy(el: HTMLElement, amount: number): void {
    this.stopMomentum();
    el.scrollBy({ left: amount, behavior: 'smooth' });
  }

  onCardClick(event: MouseEvent, recipeId: string): void {
    if (this.dragMoved) {
      event.preventDefault();
      this.dragMoved = false;
      return;
    }
    event.preventDefault();
    this.router.navigate(['/recipe', recipeId], {
      state: { backRoute: '/cookbook', backLabel: 'Cookbook' },
    });
  }
}
