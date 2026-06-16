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
      skills: [
        { name: 'Angular', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angularjs/angularjs-original.svg' },
        { name: 'TypeScript', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg' },
        { name: 'SCSS', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sass/sass-original.svg' },
        { name: 'HTML5/CSS3', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg' },
        { name: 'Bootstrap', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/bootstrap/bootstrap-original.svg' }
      ]
    },
    {
      name: 'Backend',
      skills: [
        { name: '.NET', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dotnetcore/dotnetcore-original.svg' },
        { name: 'C#', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg' },
        { name: 'Python', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg' },
        { name: 'Django', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/django/django-plain.svg' },
        { name: 'REST APIs', icon: 'https://cdn.jsdelivr.net/npm/lucide-static@0.330.0/icons/braces.svg' }
      ]
    },
    {
      name: 'Data & Database',
      skills: [
        { name: 'SQL Server', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/microsoftsqlserver/microsoftsqlserver-original.svg' },
        { name: 'Data Analytics', icon: 'https://cdn.jsdelivr.net/npm/lucide-static@0.330.0/icons/line-chart.svg' },
        { name: 'Query Optimization', icon: 'https://cdn.jsdelivr.net/npm/lucide-static@0.330.0/icons/gauge.svg' }
      ]
    },
    {
      name: 'Specialized',
      skills: [
        { name: 'Cybersecurity', icon: 'https://cdn.jsdelivr.net/npm/lucide-static@0.330.0/icons/shield-check.svg' },
        { name: 'Compliance Systems', icon: 'https://cdn.jsdelivr.net/npm/lucide-static@0.330.0/icons/clipboard-check.svg' },
        { name: 'Email Automation', icon: 'https://cdn.jsdelivr.net/npm/lucide-static@0.330.0/icons/mail.svg' },
        { name: 'System Design', icon: 'https://cdn.jsdelivr.net/npm/lucide-static@0.330.0/icons/workflow.svg' }
      ]
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
