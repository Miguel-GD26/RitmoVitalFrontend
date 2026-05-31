import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService, LoginStep } from '@core/services/auth/auth.service';
import { AlertService } from '@core/services/alert/alert.service';

const DONE: LoginStep = { requires2fa: false };
const NEEDS_2FA: LoginStep = { requires2fa: true, tempToken: 'tok' };

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let alertServiceSpy: jasmine.SpyObj<AlertService>;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login'], {
      isAuthenticated: signal(false),
    });
    alertServiceSpy = jasmine.createSpyObj('AlertService', ['error', 'success']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService,  useValue: authServiceSpy },
        { provide: AlertService, useValue: alertServiceSpy },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router    = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call AuthService.login with email and password', () => {
    authServiceSpy.login.and.returnValue(of(DONE));
    component.email    = 'test@test.com';
    component.password = 'testpass';
    component.login();
    expect(authServiceSpy.login).toHaveBeenCalledWith('test@test.com', 'testpass');
  });

  it('should navigate to "/" on successful login', () => {
    authServiceSpy.login.and.returnValue(of(DONE));
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.email    = 'test@test.com';
    component.password = 'testpass';
    component.login();
    expect(navSpy).toHaveBeenCalledWith(['/']);
  });

  it('should clear password after successful login', () => {
    authServiceSpy.login.and.returnValue(of(DONE));
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.email    = 'test@test.com';
    component.password = 'testpass';
    component.login();
    expect(component.password).toBe('');
  });

  it('should switch to 2fa step when server requires it', () => {
    authServiceSpy.login.and.returnValue(of(NEEDS_2FA));
    component.email    = 'test@test.com';
    component.password = 'testpass';
    component.login();
    expect(component.loginStep()).toBe('2fa');
  });

  it('should call AlertService.error on failed login', () => {
    authServiceSpy.login.and.returnValue(
      throwError(() => new HttpErrorResponse({
        error: { message: 'Credenciales incorrectas.' },
        status: 400,
        statusText: 'Bad Request',
      }))
    );
    component.email    = 'test@test.com';
    component.password = 'wrong';
    component.login();
    expect(alertServiceSpy.error).toHaveBeenCalled();
  });

  it('should not call login when email is empty', () => {
    component.email    = '';
    component.password = 'pass';
    component.login();
    expect(authServiceSpy.login).not.toHaveBeenCalled();
  });

  it('should not call login when password is empty', () => {
    component.email    = 'test@test.com';
    component.password = '';
    component.login();
    expect(authServiceSpy.login).not.toHaveBeenCalled();
  });

  it('should set isLoggingIn to false after login completes', () => {
    authServiceSpy.login.and.returnValue(of(DONE));
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.email    = 'test@test.com';
    component.password = 'pass';
    component.login();
    expect(component.isLoggingIn()).toBeFalse();
  });

  it('should not allow double-submission while logging in', () => {
    authServiceSpy.login.and.returnValue(of(DONE));
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.email    = 'test@test.com';
    component.password = 'pass';
    component.isLoggingIn.set(true);
    component.login();
    expect(authServiceSpy.login).not.toHaveBeenCalled();
  });

  it('should navigate to "/" after successful 2FA verification', () => {
    authServiceSpy.verify2fa = jasmine.createSpy('verify2fa').and.returnValue(of(void 0));
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.totpCode = '123456';
    component.verify2fa();
    expect(authServiceSpy.verify2fa).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/']);
  });

  it('backToCredentials resets step to credentials', () => {
    authServiceSpy.login.and.returnValue(of(NEEDS_2FA));
    component.email = 'test@test.com'; component.password = 'pass';
    component.login();
    component.backToCredentials();
    expect(component.loginStep()).toBe('credentials');
  });
});
