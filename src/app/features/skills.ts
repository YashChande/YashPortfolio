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
        { name: 'REST APIs', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/visualstudio/visualstudio-original.svg' }
      ]
    },
    {
      name: 'Data & Database',
      skills: [
        { name: 'SQL Server', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/microsoftsqlserver/microsoftsqlserver-original.svg' },
        { name: 'Data Analytics', icon: 'https://cdn.prod.website-files.com/601064f495f4b4967f921aa9/64246984585c9225aa4e4fc4_databricks.png' },
        { name: 'Query Optimization', icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSmNYlKiwU0LjNNf3s1PeKRtSi1bDOqQ7Mt47sDclIhDA&s=10' }
      ]
    },
    {
      name: 'Domain Experience',
      skills: [
        { name: 'Cybersecurity and IT', icon: 'assets/arcon_risk_control_logo.jpg' },
        { name: 'Equity Trading', icon: 'https://pnghdpro.com/wp-content/themes/pnghdpro/download/social-media-and-brands/zerodha-kite-app-icon-hd.png' },
        { name: 'Video Editing', icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Adobe_Premiere_Pro_CC_icon.svg/3840px-Adobe_Premiere_Pro_CC_icon.svg.png' }
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
