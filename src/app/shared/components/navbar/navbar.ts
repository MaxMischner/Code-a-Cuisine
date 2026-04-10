import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  /** Shows the back button */
  @Input() showBackButton = false;

  /** Text of the back link */
  @Input() backLabel = 'Back';

  /** Route for the back link */
  @Input() backRoute = '/';

  /** Shows the "Get started" button on the right */
  @Input() showGetStarted = true;

  /** Color the logo in creamy (#FAF0E6) — for dark backgrounds */
  @Input() logoLight = false;

  /** Optional icon before the back label */
  @Input() backIcon: string | null = null;

  /** Optional router state for the back link */
  @Input() backState: Record<string, unknown> = {};
}
