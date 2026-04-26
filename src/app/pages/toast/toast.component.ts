/**
 * Toast Component
 * Barra de notificaciones en la parte superior
 */

import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { errorService, Toast } from '../../core/services/error.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  readonly errorService = errorService;

  trackById(index: number, toast: Toast): string {
    return toast.id;
  }
}
