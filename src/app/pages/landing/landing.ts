import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';

/**
 * Landing Page — Einstiegsseite der App.
 *
 * Zeigt Hero mit Logo, Hauptheadline, CTA "Get started" → /generator
 * und sekundären CTA "Go to cookbook" → /cookbook.
 * Hintergrund: Olive Green (#396039).
 */
@Component({
  selector: 'app-landing',
  imports: [RouterLink, Navbar],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {}
