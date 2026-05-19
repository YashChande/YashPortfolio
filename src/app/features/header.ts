import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimationService } from '../core/services/animation.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class HeaderComponent {
  isScrolled = false;
  navItems = [
    { label: 'About', id: '#about' },
    { label: 'Skills', id: '#skills' },
    { label: 'Experience', id: '#experience' },
    { label: 'Projects', id: '#projects' },
    { label: 'Contact', id: '#contact' }
  ];

  constructor(private animService: AnimationService) {}

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 50;
  }

  scrollTo(id: string) {
    this.animService.scrollTo(id);
  }
}
