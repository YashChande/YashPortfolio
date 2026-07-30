import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
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
      description: 'Developed a CNN and YOLO-powered website to detect skin cancer from images, aiding early diagnosis and for accurate image classification.',
      tags: ['PyTorch', 'YOLO', 'CNN', 'DenseNet', 'Machine learning'],
      link: null,
      buttonLabel: 'Visit Deployed Site',
      isGame: false,
      isMaintenance: true
    },
    {
      title: 'Space Shooter PyGame',
      category: 'Personal Project',
      date: 'Mar 2021 – Oct 2021',
      image: 'assets/space_shooter_preview.png',
      description: 'Developed a space shooter game using Python and Pygame. Features multi-level enemy waves and local high score tracking.',
      tags: ['Python', 'Pygame', 'Game Dev', 'Audio Synth'],
      link: null,
      buttonLabel: 'Play Now',
      isGame: true
    },
    {
      title: 'AeroWeather',
      category: 'Side Project',
      image: 'assets/AeroWeather.png',
      description: 'A full-stack app featuring a dynamic weather-reactive UI with custom CSS micro-animations based on real-time Open-Meteo API data.',
      tags: ['Angular 17', '.NET 6', 'SQLite', 'Docker'],
      link: 'https://yashchande.github.io/AeroWeather-/',
      buttonLabel: 'Visit Deployed Site',
      isGame: false
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

  showToast = false;
  toastMessage = '';
  private toastTimer: any;

  @ViewChild('scrollWrapper', { static: true }) scrollWrapper!: ElementRef;
  @ViewChild('projectsTrack', { static: true }) projectsTrack!: ElementRef;

  private projectsScrollTl: any;
  public isMobile = false;

  constructor(
    private animService: AnimationService,
    private gameService: GameService
  ) { }

  playGame() {
    this.gameService.open();
  }

  showMaintenanceToast() {
    this.toastMessage = 'Site is under maintenance. Please try again later.';
    this.showToast = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.showToast = false;
    }, 3500);
  }

  ngAfterViewInit() {
    const setupProjectsScroll = () => {
      const gsap = this.animService.gsap;
      const ScrollTrigger = this.animService.scrollTrigger;

      const track = this.projectsTrack.nativeElement;
      const wrapper = this.scrollWrapper.nativeElement;

      // Kill existing ScrollTrigger to rebuild with fresh layout calculations
      if (this.projectsScrollTl) {
        this.projectsScrollTl.scrollTrigger?.kill();
        this.projectsScrollTl.kill();
      }

      this.isMobile = window.innerWidth <= 768;

      // Robust track size calculations to prevent early slide-ups due to DOM render latency
      const getScrollAmount = () => {
        const cardCount = track.querySelectorAll('.project-card').length || 5;
        const cardWidth = this.isMobile ? 290 : 420;
        const gap = 32; // 2rem
        const padding = this.isMobile ? 128 : 128;
        const computedWidth = cardCount * cardWidth + (cardCount - 1) * gap + padding;
        const trackWidth = Math.max(track.scrollWidth, computedWidth);
        const amount = trackWidth - window.innerWidth;
        return amount > 0 ? -amount : 0;
      };

      // Alignment check:
      // On desktop: center wrapper vertically in screen before horizontal sliding starts (no cuts)
      // On mobile: start when the wrapper top hits 80px (just below header)
      const startPoint = this.isMobile ? 'top 80px' : 'center center';

      this.projectsScrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapper,
          start: startPoint,
          end: () => {
            const cardCount = track.querySelectorAll('.project-card').length || 5;
            const cardWidth = this.isMobile ? 290 : 420;
            const gap = 32;
            const padding = this.isMobile ? 128 : 128;
            const computedWidth = cardCount * cardWidth + (cardCount - 1) * gap + padding;
            const trackWidth = Math.max(track.scrollWidth, computedWidth);
            const amount = trackWidth - window.innerWidth;
            return amount > 0 ? `+=${amount}` : '+=100';
          },
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true
        }
      });

      this.projectsScrollTl.to(track, {
        x: getScrollAmount,
        ease: 'none'
      });

      // Recalculate all ScrollTrigger coordinates across the page
      ScrollTrigger.refresh();
    };

    // Defer setup to allow hero and other layout spacers to render
    setTimeout(setupProjectsScroll, 350);

    // Rebuild triggers on window resize (zoom level changes)
    window.addEventListener('resize', setupProjectsScroll);
  }
}
