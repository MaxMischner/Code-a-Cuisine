import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, Navbar],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {}
