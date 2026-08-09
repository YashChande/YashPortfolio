import { Injectable, signal } from '@angular/core';

export type PortfolioSectionKey = 'about' | 'skills' | 'experience' | 'projects' | 'certifications' | 'contact';
export type CloudTransitionState = 'idle' | 'covering' | 'uncovering';

@Injectable({
  providedIn: 'root'
})
export class GameWorldService {
  /** Indicates whether the interactive 2D game world mode is currently active */
  readonly isInteractiveMode = signal<boolean>(false);

  /** Active portfolio section modal triggered by walking up to a building in game mode */
  readonly activeModalSection = signal<PortfolioSectionKey | null>(null);

  /** Near interaction zone prompt text (e.g. "Press E to enter Tech District") */
  readonly currentInteractionPrompt = signal<string | null>(null);

  /** Clash of Clans cloud transition animation state */
  readonly cloudState = signal<CloudTransitionState>('idle');
  private isTransitionBusy = false;

  enableInteractiveMode(): void {
    if (this.isInteractiveMode()) return;
    this.triggerCloudTransition(() => {
      this.isInteractiveMode.set(true);
    });
  }

  disableInteractiveMode(): void {
    if (!this.isInteractiveMode() && this.cloudState() === 'idle') return;
    this.triggerCloudTransition(() => {
      this.isInteractiveMode.set(false);
      this.activeModalSection.set(null);
      this.currentInteractionPrompt.set(null);
    });
  }

  toggleInteractiveMode(): void {
    if (this.isInteractiveMode()) {
      this.disableInteractiveMode();
    } else {
      this.enableInteractiveMode();
    }
  }

  /**
   * Triggers Clash of Clans cloud transition:
   * 1. 'covering': Clouds sweep in from left & right to meet in middle (550ms)
   * 2. Swap background mode invisibly behind clouds
   * 3. 'uncovering': Clouds part in center and sweep outward (550ms)
   */
  private triggerCloudTransition(onCovered: () => void): void {
    if (this.isTransitionBusy) return;
    this.isTransitionBusy = true;

    // Step 1: Cover screen with clouds
    this.cloudState.set('covering');

    // Step 2: At peak coverage (550ms), execute callback & begin uncovering
    setTimeout(() => {
      onCovered();
      this.cloudState.set('uncovering');

      // Step 3: At 1100ms, finish transition & return to idle
      setTimeout(() => {
        this.cloudState.set('idle');
        this.isTransitionBusy = false;
      }, 550);
    }, 550);
  }

  openSectionModal(section: PortfolioSectionKey): void {
    this.activeModalSection.set(section);
  }

  closeSectionModal(): void {
    this.activeModalSection.set(null);
  }
}
