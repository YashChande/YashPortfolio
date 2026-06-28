import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimationService } from '../core/services/animation.service';
import { GameService } from '../core/services/game.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class HeaderComponent {
  isScrolled = false;
  resumeUrl = 'https://drive.google.com/file/d/106UQFavTfF1JRLYkogVVg0kHjc7nDzVO/view?usp=sharing';
  navItems = [
    { label: 'About', id: '#about' },
    { label: 'Skills', id: '#skills' },
    { label: 'Experience', id: '#experience' },
    { label: 'Projects', id: '#projects' },
    { label: 'Honours', id: '#certifications' },
    { label: 'Contact', id: '#contact' }
  ];

  constructor(
    private animService: AnimationService,
    private gameService: GameService
  ) {}

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 50;
  }

  scrollTo(id: string) {
    this.animService.scrollTo(id);
  }

  showNewFeature() {
    this.gameService.open();
  }
}
