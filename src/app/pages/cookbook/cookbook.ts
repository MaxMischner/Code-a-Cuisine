import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { SupabaseService, DbRecipe } from '../../core/services/supabase.service';

/** Tile data for a cuisine category in the overview */
interface CuisineCategory {
  name: string;
  emoji: string;
  slug: string;
  image: string;
  mobileImage: string;
}

/**
 * Cookbook page — entry point into the recipe library.
 *
 * Displays all 6 cuisine categories as clickable tiles as well as
 * the most liked recipes in a horizontally
 * scrollable carousel with drag-to-scroll and momentum physics.
 */
@Component({
  selector: 'app-cookbook',
  imports: [RouterLink, Navbar],
  templateUrl: './cookbook.html',
  styleUrl: './cookbook.scss',
})
export class Cookbook implements OnInit, AfterViewInit {

  @ViewChild('scrollRow') scrollRowRef!: ElementRef<HTMLElement>;

  mostLiked = signal<DbRecipe[]>([]);
  loading   = signal(true);

  cuisines: CuisineCategory[] = [
    { name: 'Italian',  emoji: '🍝', slug: 'italian',  image: 'Cuisine-Bilder/Italian.webp',  mobileImage: 'Cuisine-Bilder/Italian.webp'  },
    { name: 'German',   emoji: '🍻', slug: 'german',   image: 'Cuisine-Bilder/German.webp',   mobileImage: 'Cuisine-Bilder/German.webp'   },
    { name: 'Japanese', emoji: '🍢', slug: 'japanese', image: 'Cuisine-Bilder/Japanese.webp', mobileImage: 'Cuisine-Bilder/Japanese.webp' },
    { name: 'Indian',   emoji: '🍛', slug: 'indian',   image: 'Cuisine-Bilder/Indian.webp',   mobileImage: 'Cuisine-Bilder/Indian.webp'   },
    { name: 'Gourmet',  emoji: '🤌', slug: 'gourmet',  image: 'Cuisine-Bilder/Gourmet.webp',  mobileImage: 'Cuisine-Bilder/Gourmet.webp'  },
    { name: 'Fusion',   emoji: '🫕', slug: 'fusion',   image: 'Cuisine-Bilder/Fusion.webp',   mobileImage: 'Cuisine-Bilder/Fusion.webp'   },
  ];

  private isDragging      = false;
  private dragStartX      = 0;
  private dragScrollLeft  = 0;
  private dragMoved       = false;
  isDraggingActive        = false;
  canScrollLeft           = false;
  canScrollRight          = true;

  private velocitySamples: { x: number; t: number }[] = [];
  private momentumRaf = 0;

  constructor(private supabase: SupabaseService, private router: Router) {}

  /** Loads the 5 most liked recipes for the carousel */
  async ngOnInit(): Promise<void> {
    try {
      const recipes = await this.supabase.getMostLiked(5);
      this.mostLiked.set(recipes);
    } finally {
      this.loading.set(false);
      setTimeout(() => {
        if (this.scrollRowRef?.nativeElement) {
          this.onScroll(this.scrollRowRef.nativeElement);
        }
      }, 0);
    }
  }

  ngAfterViewInit(): void {
    if (this.scrollRowRef?.nativeElement) {
      this.onScroll(this.scrollRowRef.nativeElement);
    }
  }

  /** Starts a new drag gesture and stops any running momentum animation */
  onScrollMouseDown(event: MouseEvent, el: HTMLElement): void {
    this.stopMomentum();
    this.isDragging = true;
    this.dragMoved = false;
    this.isDraggingActive = false;
    this.dragStartX = event.pageX - el.offsetLeft;
    this.dragScrollLeft = el.scrollLeft;
    this.velocitySamples = [];
  }

  /** Tracks velocity for the subsequent momentum animation */
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

  /**
   * Calculates the initial velocity from the last velocity samples
   * and animates the scroll with exponential deceleration (friction 0.92).
   * @param el - The scrollable container element
   */
  private launchMomentum(el: HTMLElement): void {
    if (this.velocitySamples.length < 2) return;

    const first = this.velocitySamples[0];
    const last  = this.velocitySamples[this.velocitySamples.length - 1];
    const dt = last.t - first.t;
    if (dt === 0) return;

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

  /** Stops a running momentum animation */
  private stopMomentum(): void {
    if (this.momentumRaf) {
      cancelAnimationFrame(this.momentumRaf);
      this.momentumRaf = 0;
    }
  }

  /** Updates the scroll indicator flags for the arrow buttons */
  onScroll(el: HTMLElement): void {
    this.canScrollLeft  = el.scrollLeft > 0;
    this.canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  }

  /**
   * Scrolls the carousel by exactly one card width (including gap).
   * @param direction - Positive = forward, negative = backward
   */
  scrollBy(el: HTMLElement, direction: number): void {
    this.stopMomentum();
    const card = el.firstElementChild as HTMLElement | null;
    const cardWidth = card ? card.getBoundingClientRect().width + 12 : 370;
    el.scrollBy({ left: Math.sign(direction) * cardWidth, behavior: 'smooth' });
  }

  /** Generates the inline style string with CSS custom properties for background images */
  cuisineStyle(c: CuisineCategory): string {
    return `--img: url("${c.image}"); --img-mob: url("${c.mobileImage}")`;
  }

  /** Ignores clicks that were part of a drag gesture */
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
