import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'generator',
    loadComponent: () =>
      import('./pages/generator/generator').then((m) => m.Generator),
  },
  {
    path: 'cookbook',
    loadComponent: () =>
      import('./pages/cookbook/cookbook').then((m) => m.Cookbook),
  },
  {
    path: 'library',
    loadComponent: () =>
      import('./pages/library/library').then((m) => m.Library),
  },
  {
    path: 'library/:cuisine',
    loadComponent: () =>
      import('./pages/library/library').then((m) => m.Library),
  },
  {
    path: 'recipe/:id',
    loadComponent: () =>
      import('./pages/recipe-detail/recipe-detail').then(
        (m) => m.RecipeDetail
      ),
  },
  {
    path: 'impressum',
    loadComponent: () =>
      import('./pages/impressum/impressum').then((m) => m.Impressum),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
