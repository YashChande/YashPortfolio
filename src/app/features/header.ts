import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimationService } from '../core/services/animation.service';
import { GameWorldService } from '../core/services/game-world.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class HeaderComponent {
  isScrolled = false;
  mobileMenuOpen = false;
  resumeUrl = 'https://drive.google.com/file/d/106UQFavTfF1JRLYkogVVg0kHjc7nDzVO/view?usp=sharing';
  navItems = [
    { label: 'About', id: '#about' },
    { label: 'Skills', id: '#skills' },
    { label: 'Experience', id: '#experience' },
    { label: 'Projects', id: '#projects' },
    { label: 'Honours', id: '#certifications' },
    { label: 'Contact', id: '#contact' }
  ];

  readonly gameWorldService = inject(GameWorldService);

  constructor(
    private animService: AnimationService
  ) {}

  toggleInteractiveMode() {
    this.mobileMenuOpen = false;
    this.gameWorldService.toggleInteractiveMode();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 50;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  scrollTo(id: string) {
    this.mobileMenuOpen = false;
    this.animService.scrollTo(id);
  }
}
