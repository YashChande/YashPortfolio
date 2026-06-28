import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private active$ = new BehaviorSubject<boolean>(false);
  public isActive$ = this.active$.asObservable();

  open() {
    this.active$.next(true);
  }

  close() {
    this.active$.next(false);
  }
}
