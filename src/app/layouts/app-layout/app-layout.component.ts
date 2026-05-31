import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarService } from '@shared/services/sidebar.service';
import { SidebarComponent } from '../app-shell/sidebar/sidebar.component';
import { HeaderComponent } from '../app-shell/header/header.component';

@Component({
  selector: 'app-app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  templateUrl: './app-layout.component.html',
  styleUrls: ['./app-layout.component.scss']
})
export class AppLayoutComponent {
  private sidebarService = inject(SidebarService);
  readonly isCollapsed = this.sidebarService.collapsed;
}
