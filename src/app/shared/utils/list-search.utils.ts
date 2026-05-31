import { DestroyRef, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Pagination } from '@core/models/api-response.model';

export interface ListSearch<T> {
  items:        WritableSignal<T[]>;
  isLoading:    WritableSignal<boolean>;
  pagination:   WritableSignal<Pagination | null>;
  currentPage:  WritableSignal<number>;
  searchTerm:   WritableSignal<string>;
  errorMessage: WritableSignal<string | null>;
  totalCount:   Signal<number>;
  onSearchInput(value: string): void;
  clearSearch(): void;
}

export function useListSearch<T>(loadPage: (page: number) => void): ListSearch<T> {
  const destroyRef     = inject(DestroyRef);
  const searchSubject$ = new Subject<string>();

  const items        = signal<T[]>([]);
  const isLoading    = signal(true);
  const pagination   = signal<Pagination | null>(null);
  const currentPage  = signal(1);
  const searchTerm   = signal('');
  const errorMessage = signal<string | null>(null);
  const totalCount   = computed(() => pagination()?.count ?? 0);

  searchSubject$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    takeUntilDestroyed(destroyRef),
  ).subscribe(term => {
    searchTerm.set(term);
    loadPage(1);
  });

  return {
    items, isLoading, pagination, currentPage, searchTerm, errorMessage, totalCount,
    onSearchInput: (value: string) => searchSubject$.next(value),
    clearSearch:   ()               => { searchTerm.set(''); loadPage(1); },
  };
}
