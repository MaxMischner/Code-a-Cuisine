import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Navbar-Komponente — erscheint auf allen Seiten.
 *
 * Verhält sich je nach Kontext unterschiedlich:
 * - `showBackButton`: zeigt "← [backLabel]" links an (nur auf Unterseiten)
 * - `backLabel`: Text des Back-Links (z.B. "Ingredients", "Recipe results")
 * - `backRoute`: Route des Back-Links
 * - `showGetStarted`: zeigt den "Get started"-Button rechts an (Standard: true)
 */
@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  /** Zeigt den Back-Button an */
  @Input() showBackButton = false;

  /** Text des Back-Links */
  @Input() backLabel = 'Back';

  /** Route für den Back-Link */
  @Input() backRoute = '/';

  /** Zeigt den "Get started"-Button rechts an */
  @Input() showGetStarted = true;
}
