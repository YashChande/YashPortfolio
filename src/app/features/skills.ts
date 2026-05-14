import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimationService } from '../core/services/animation.service';

@Component({
  selector: 'app-skills',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skills.html',
  styleUrl: './skills.scss'
})
export class SkillsComponent implements AfterViewInit {
  skillGroups = [
    {
      name: 'Frontend',
      skills: ['Angular', 'TypeScript', 'SCSS', 'HTML5/CSS3', 'Bootstrap']
    },
    {
      name: 'Backend',
      skills: ['.NET', 'C#', 'Python', 'Django', 'REST APIs']
    },
    {
      name: 'Data & Database',
      skills: ['SQL Server', 'Data Analytics', 'Query Optimization', 'Data Structures']
    },
    {
      name: 'Specialized',
      skills: ['Cybersecurity', 'Compliance Systems', 'Email Automation', 'System Design']
    }
  ];

  constructor(private animService: AnimationService) {}

  ngAfterViewInit() {
    const gsap = this.animService.gsap;
    
    gsap.fromTo('.skill-category', 
      { scale: 0.9, opacity: 0 },
      {
        scrollTrigger: {
          trigger: '.skills-grid',
          start: 'top 85%',
        },
        scale: 1,
        opacity: 1,
        duration: 0.8,
        stagger: 0.1,
        ease: 'back.out(1.7)',
        clearProps: 'opacity'
      }
    );
  }
}
