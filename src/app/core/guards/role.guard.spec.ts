import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { of } from 'rxjs';
import { provideZonelessChangeDetection, signal } from '@angular/core';

import { roleGuard } from './role.guard';
import { AuthService, CurrentUser } from '../services/auth/auth.service';

function makeUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 1,
    username: 'testuser',
    email: 'test@test.com',
    groups: [],
    is_superuser: false,
    ...overrides,
  };
}

describe('roleGuard', () => {
  let mockAuthService: jasmine.SpyObj<AuthService> & {
    isAuthenticated: ReturnType<typeof signal<boolean | null>>;
    currentUser: ReturnType<typeof signal<CurrentUser | null>>;
  };
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['verifySession']);
    authSpy.isAuthenticated = signal<boolean | null>(null);
    authSpy.currentUser     = signal<CurrentUser | null>(null);

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
    mockRouter      = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  function runGuard(allowedGroups: string[]) {
    return TestBed.runInInjectionContext(() =>
      roleGuard(allowedGroups)({} as any, {} as any)
    );
  }

  it('redirects to /login when isAuthenticated is false', () => {
    mockAuthService.isAuthenticated.set(false);
    const result = runGuard(['medico']);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toEqual(['/login'] as unknown as UrlTree);
  });

  it('allows superuser regardless of groups', () => {
    mockAuthService.isAuthenticated.set(true);
    mockAuthService.currentUser.set(makeUser({ is_superuser: true, groups: [] }));
    const result = runGuard(['medico']);
    expect(result).toBeTrue();
  });

  it('allows user whose group is in the allowed list', () => {
    mockAuthService.isAuthenticated.set(true);
    mockAuthService.currentUser.set(makeUser({ groups: ['medico'] }));
    const result = runGuard(['medico']);
    expect(result).toBeTrue();
  });

  it('redirects to /dashboard when user group is not allowed', () => {
    mockAuthService.isAuthenticated.set(true);
    mockAuthService.currentUser.set(makeUser({ groups: ['paciente'] }));
    runGuard(['medico']);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
  });

  it('redirects to /login when user is null after authentication', () => {
    mockAuthService.isAuthenticated.set(true);
    mockAuthService.currentUser.set(null);
    runGuard(['medico']);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login']);
  });

  it('calls verifySession when isAuthenticated is null', (done) => {
    mockAuthService.isAuthenticated.set(null);
    mockAuthService.currentUser.set(makeUser({ groups: ['medico'] }));
    mockAuthService.verifySession.and.returnValue(of(true));

    const result = runGuard(['medico']) as any;

    result.subscribe((value: boolean | UrlTree) => {
      expect(mockAuthService.verifySession).toHaveBeenCalled();
      expect(value).toBeTrue();
      done();
    });
  });

  it('redirects to /login via verifySession when session is invalid', (done) => {
    mockAuthService.isAuthenticated.set(null);
    mockAuthService.verifySession.and.returnValue(of(false));

    const result = runGuard(['medico']) as any;

    result.subscribe((_: boolean | UrlTree) => {
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login']);
      done();
    });
  });

  it('checks role after verifySession returns true', (done) => {
    mockAuthService.isAuthenticated.set(null);
    mockAuthService.currentUser.set(makeUser({ groups: ['paciente'] }));
    mockAuthService.verifySession.and.returnValue(of(true));

    const result = runGuard(['medico']) as any;

    result.subscribe((_: boolean | UrlTree) => {
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
      done();
    });
  });
});
