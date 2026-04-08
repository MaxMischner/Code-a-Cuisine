import { Component, OnInit, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { SupabaseService, DbRecipe } from '../../core/services/supabase.service';

/** Kachel-Daten für eine Küchen-Kategorie in der Übersicht */
interface CuisineCategory {
  name: string;
  emoji: string;
  slug: string;
  image: string;
  mobileImage: string;
}

/**
 * Cookbook-Seite — Einstieg in die Rezeptbibliothek.
 *
 * Zeigt alle 6 Küchen-Kategorien als anklickbare Kacheln sowie
 * die am häufigsten gemochten Rezepte in einem horizontal
 * scrollbaren Karussell mit Drag-to-scroll und Momentum-Physik.
 */
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
    { name: 'Italian',  emoji: '🍝', slug: 'italian',  image: '/Cuisine-Bilder/Italian.svg',  mobileImage: '/Cuisine-Bilder/Italian.svg'  },
    { name: 'German',   emoji: '🍻', slug: 'german',   image: '/Cuisine-Bilder/German.svg',   mobileImage: '/Cuisine-Bilder/German.svg'   },
    { name: 'Japanese', emoji: '🍢', slug: 'japanese', image: '/Cuisine-Bilder/Japanese.svg', mobileImage: '/Cuisine-Bilder/Japanese.svg' },
    { name: 'Indian',   emoji: '🍛', slug: 'indian',   image: '/Cuisine-Bilder/Indian.svg',   mobileImage: '/Cuisine-Bilder/Indian.svg'   },
    { name: 'Gourmet',  emoji: '🤌', slug: 'gourmet',  image: '/Cuisine-Bilder/Gourmet.svg',  mobileImage: '/Cuisine-Bilder/Gourmet.svg'  },
    { name: 'Fusion',   emoji: '🫕', slug: 'fusion',   image: '/Cuisine-Bilder/Fusion.svg',   mobileImage: '/Cuisine-Bilder/Fusion.svg'   },
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

  /** Lädt die 5 am häufigsten gemochten Rezepte für das Karussell */
  async ngOnInit(): Promise<void> {
    try {
      const recipes = await this.supabase.getMostLiked(5);
      this.mostLiked.set(recipes);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Startet Drag-Scroll auf dem Karussell (Mouse-Event).
   * @param event - Das MouseEvent vom Pointer-Down
   * @param el - Das scrollbare Container-Element
   */
  onScrollMouseDown(event: MouseEvent, el: HTMLElement): void {
    this.stopMomentum();
    this.isDragging = true;
    this.dragMoved = false;
    this.isDraggingActive = false;
    this.dragStartX = event.pageX - el.offsetLeft;
    this.dragScrollLeft = el.scrollLeft;
    this.velocitySamples = [];
  }

  /**
   * Führt Drag-Scroll während Mausbewegung aus und trackt Geschwindigkeit.
   * @param event - Das MouseEvent vom Pointer-Move
   * @param el - Das scrollbare Container-Element
   */
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

  /**
   * Beendet Drag-Scroll und startet Momentum-Animation (Mouse-Event).
   * @param el - Das scrollbare Container-Element (optional)
   */
  onScrollMouseUp(el?: HTMLElement): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.isDraggingActive = false;
    if (el) this.launchMomentum(el);
  }

  /**
   * Startet Touch-Drag-Scroll auf dem Karussell.
   * @param event - Das TouchEvent vom Touch-Start
   * @param el - Das scrollbare Container-Element
   */
  onScrollTouchStart(event: TouchEvent, el: HTMLElement): void {
    this.stopMomentum();
    this.isDragging = true;
    this.dragMoved = false;
    this.dragStartX = event.touches[0].pageX - el.offsetLeft;
    this.dragScrollLeft = el.scrollLeft;
    this.velocitySamples = [];
  }

  /**
   * Führt Touch-Drag-Scroll aus und trackt Geschwindigkeit für Momentum.
   * @param event - Das TouchEvent vom Touch-Move
   * @param el - Das scrollbare Container-Element
   */
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

  /**
   * Beendet Touch-Drag und startet Momentum-Animation.
   * @param el - Das scrollbare Container-Element
   */
  onScrollTouchEnd(el: HTMLElement): void {
    this.isDragging = false;
    this.launchMomentum(el);
  }

  /**
   * Berechnet die Anfangsgeschwindigkeit aus den letzten Velocity-Samples
   * und animiert den Scroll mit exponentieller Abbremsung (Reibung 0.92).
   * @param el - Das scrollbare Container-Element
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

  /** Stoppt eine laufende Momentum-Animation */
  private stopMomentum(): void {
    if (this.momentumRaf) {
      cancelAnimationFrame(this.momentumRaf);
      this.momentumRaf = 0;
    }
  }

  /**
   * Aktualisiert die Scroll-Pfeile basierend auf der aktuellen Scroll-Position.
   * @param el - Das scrollbare Container-Element
   */
  onScroll(el: HTMLElement): void {
    this.canScrollLeft  = el.scrollLeft > 0;
    this.canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  }

  /**
   * Scrollt das Karussell programmatisch um einen festen Betrag.
   * @param el - Das scrollbare Container-Element
   * @param amount - Scroll-Betrag in Pixel (negativ = links, positiv = rechts)
   */
  scrollBy(el: HTMLElement, amount: number): void {
    this.stopMomentum();
    el.scrollBy({ left: amount, behavior: 'smooth' });
  }

  /**
   * Erzeugt den CSS-Custom-Property-String für das Hintergrundbild einer Küchen-Kachel.
   * @param c - Die Küchen-Kategorie
   * @returns Inline-Style-String mit `--img` und `--img-mob` Variablen
   */
  cuisineStyle(c: CuisineCategory): string {
    return `--img: url("${c.image}"); --img-mob: url("${c.mobileImage}")`;
  }

  /**
   * Navigiert zu einem Rezept aus dem Karussell — ignoriert Klicks
   * die Teil einer Drag-Geste waren.
   * @param event - Das Klick-Event
   * @param recipeId - UUID des Zielrezepts
   */
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
