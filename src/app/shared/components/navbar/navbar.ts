import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

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

  /** Logo in cremy (#FAF0E6) färben — für dunkle Hintergründe */
  @Input() logoLight = false;

  /** Optionales Icon vor dem Back-Label */
  @Input() backIcon: string | null = null;

  /** Optionaler Router-State für den Back-Link */
  @Input() backState: Record<string, unknown> = {};
}
