import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimationService } from '../core/services/animation.service';
import { GameService } from '../core/services/game.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './projects.html',
  styleUrl: './projects.scss'
})
export class ProjectsComponent implements AfterViewInit {
  projects = [
    {
      title: 'Automobile Verification System',
      category: 'Research Publication',
      date: 'April 2023',
      image: 'assets/automobile_verification.png',
      description: 'Authentication system for manufacturing units using yawn detection and vehicle verification. Published in IRJMETS Volume 5.',
      tags: ['Python', 'Automation', 'Manufacturing', 'Research'],
      link: 'https://drive.google.com/file/d/19Ozql_o579aWcmxLB9Pm3-683A_AVIPi/view',
      buttonLabel: 'View Credential',
      isGame: false
    },
    {
      title: 'Translation Ally',
      category: 'National-Level Hackathon Project',
      date: 'Aug 2022',
      image: 'assets/translator1.jpg',
      description: 'Built a real-time document and speech-to-speech translation and transcription platform supporting multiple languages',
      tags: ['Django', 'Python', 'NLP', 'SIH 2022'],
      link: 'https://translation-ally-6wbv.onrender.com/',
      buttonLabel: 'Visit Deployed Site',
      isGame: false
    },
    {
      title: 'Skin Cancer Detection',
      category: 'Deep Learning',
      date: 'Jan 2022 – Jun 2022',
      image: 'assets/skin_cancer_detection.png',
      description: 'Developed a CNN and YOLO-powered website to detect skin cancer from images, aiding early diagnosis using PyTorch and DenseNet for accurate image classification.',
      tags: ['PyTorch', 'YOLO', 'CNN', 'DenseNet', 'Machine learning'],
      link: null,
      buttonLabel: null,
      isGame: false
    },
    {
      title: 'Space Shooter PyGame',
      category: 'Personal Project',
      date: 'Mar 2021 – Oct 2021',
      image: 'assets/space_shooter_preview.png',
      description: 'Developed a space shooter game using Python and Pygame. Features multi-level enemy waves, local high score tracking, sound toggles, and optimized sprite collision physics.',
      tags: ['Python', 'Pygame', 'Game Dev', 'Audio Synth'],
      link: null,
      buttonLabel: 'Play Now',
      isGame: true
    }
  ];

  certifications = [
    {
      title: 'Smart India Hackathon Finalist',
      issuer: 'Ministry of Education, India',
      date: 'Aug 2022',
      link: 'https://drive.google.com/file/d/1rep4XwLAc0HXHqXVMGrxIdphP9-vRR-m/view?usp=sharing',
      logo: 'assets/SIH2.webp'
    },
    {
      title: 'Developing Applications with Apache Spark™',
      issuer: 'Databricks',
      date: 'Jun 2026',
      link: 'https://drive.google.com/file/d/1td3uZgAych_iDe8J1Rlp7-Aztp3zMQ7H/view',
      logo: 'assets/databricks_logo.jpg'
    },
    {
      title: 'Digital Marketing',
      issuer: 'Google',
      date: 'Mar 2023',
      link: 'https://drive.google.com/file/d/12QA-_6O1Ra2CR9buRuS-zGfPbeZpp0uy/view',
      logo: 'assets/google_logo.jpg'
    },
    {
      title: 'Entrepreneurial Management',
      issuer: 'Great Learning',
      date: 'Dec 2025',
      link: 'https://www.mygreatlearning.com/certificate/XFCTJCOC',
      logo: 'assets/great_learning_academy_logo.jpg'
    },
    {
      title: 'Programming for Everybody',
      issuer: 'University of Michigan',
      date: 'Nov 2020',
      link: 'https://drive.google.com/file/d/1cEcmhgIB87Rh1WTfJxJi7PnK2xulCmxk/view',
      logo: 'assets/michigan.jpg'
    },
    {
      title: 'Python for Machine Learning',
      issuer: 'Great Learning',
      date: 'Nov 2021',
      link: 'https://drive.google.com/file/d/1uH2L4SyAvh3TIC-lvHSBghaA0WIKDdXX/view',
      logo: 'assets/great_learning_academy_logo.jpg'
    }
  ];

  constructor(
    private animService: AnimationService,
    private gameService: GameService
  ) { }

  playGame() {
    this.gameService.open();
  }

  ngAfterViewInit() {
    const gsap = this.animService.gsap;

    gsap.fromTo('.project-card',
      { y: 50, opacity: 0 },
      {
        scrollTrigger: {
          trigger: '.projects-grid',
          start: 'top 85%',
        },
        y: 0,
        opacity: 1,
        duration: 1,
        stagger: 0.2,
        ease: 'power4.out',
        clearProps: 'opacity'
      }
    );
  }
}
