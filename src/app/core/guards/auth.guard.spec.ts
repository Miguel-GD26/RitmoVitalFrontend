import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { of } from 'rxjs';
import { provideZonelessChangeDetection, signal } from '@angular/core';

import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth/auth.service';

describe('authGuard', () => {
  let mockAuthService: jasmine.SpyObj<AuthService> & {
    isAuthenticated: ReturnType<typeof signal<boolean | null>>;
  };
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['verifySession']);
    authSpy.isAuthenticated = signal<boolean | null>(null);

    const routerSpy = jasmine.createSpyObj('Router', ['createUrlTree']);
    routerSpy.createUrlTree.and.callFake((commands: any[]) => commands as unknown as UrlTree);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    mockAuthService = TestBed.inject(AuthService) as any;
    mockRouter     = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  function runGuard() {
    return TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
  }

  it('returns true when isAuthenticated is true', () => {
    mockAuthService.isAuthenticated.set(true);
    const result = runGuard();
    expect(result).toBeTrue();
  });

  it('redirects to /login when isAuthenticated is false', () => {
    mockAuthService.isAuthenticated.set(false);
    const result = runGuard();
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toEqual(['/login'] as unknown as UrlTree);
  });

  it('calls verifySession when isAuthenticated is null', (done) => {
    mockAuthService.isAuthenticated.set(null);
    mockAuthService.verifySession.and.returnValue(of(true));

    const result = runGuard() as any;

    result.subscribe((value: boolean | UrlTree) => {
      expect(mockAuthService.verifySession).toHaveBeenCalled();
      expect(value).toBeTrue();
      done();
    });
  });

  it('redirects to /login when verifySession returns false', (done) => {
    mockAuthService.isAuthenticated.set(null);
    mockAuthService.verifySession.and.returnValue(of(false));

    const result = runGuard() as any;

    result.subscribe((value: boolean | UrlTree) => {
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login']);
      done();
    });
  });

  it('allows navigation when verifySession returns true', (done) => {
    mockAuthService.isAuthenticated.set(null);
    mockAuthService.verifySession.and.returnValue(of(true));

    const result = runGuard() as any;

    result.subscribe((value: boolean | UrlTree) => {
      expect(value).toBeTrue();
      done();
    });
  });
});
