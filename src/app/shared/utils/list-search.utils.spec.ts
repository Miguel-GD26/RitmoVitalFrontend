import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { useListSearch, ListSearch } from './list-search.utils';
import { Pagination } from '@core/models/api-response.model';

/**
 * Host component que provee el DestroyRef necesario para
 * takeUntilDestroyed dentro de useListSearch.
 */
@Component({
  standalone: true,
  template: '',
})
class HostComponent {
  loadPage = jasmine.createSpy('loadPage');
  search: ListSearch<unknown> = useListSearch<unknown>((page) => this.loadPage(page));
}

describe('useListSearch', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<HostComponent>>;
  let host: HostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideZonelessChangeDetection()],
    });
    fixture = TestBed.createComponent(HostComponent);
    host    = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('initial state', () => {
    it('starts with empty items array', () => {
      expect(host.search.items()).toEqual([]);
    });

    it('starts with isLoading true', () => {
      expect(host.search.isLoading()).toBeTrue();
    });

    it('starts with null pagination', () => {
      expect(host.search.pagination()).toBeNull();
    });

    it('starts on page 1', () => {
      expect(host.search.currentPage()).toBe(1);
    });

    it('starts with empty searchTerm', () => {
      expect(host.search.searchTerm()).toBe('');
    });

    it('starts with null errorMessage', () => {
      expect(host.search.errorMessage()).toBeNull();
    });

    it('totalCount is 0 when pagination is null', () => {
      expect(host.search.totalCount()).toBe(0);
    });
  });

  describe('onSearchInput debounce', () => {
    it('does not call loadPage synchronously on input', () => {
      host.search.onSearchInput('eco');
      // debounceTime(300) — no immediate call
      expect(host.loadPage).not.toHaveBeenCalled();
    });

    // RxJS 7 asyncScheduler bypasses jasmine.clock in zoneless mode;
    // use real async timers via done() to verify the debounce fires.
    it('calls loadPage(1) with correct term after 300ms', (done) => {
      host.search.onSearchInput('ecg');
      setTimeout(() => {
        expect(host.loadPage).toHaveBeenCalledWith(1);
        expect(host.search.searchTerm()).toBe('ecg');
        done();
      }, 350);
    }, 1000);

    it('only fires once for same consecutive input (distinctUntilChanged)', (done) => {
      host.search.onSearchInput('a');
      setTimeout(() => {
        host.loadPage.calls.reset();
        // Same term: distinctUntilChanged should suppress
        host.search.onSearchInput('a');
        setTimeout(() => {
          expect(host.loadPage).not.toHaveBeenCalled();
          done();
        }, 350);
      }, 350);
    }, 2000);
  });

  describe('clearSearch', () => {
    it('resets searchTerm to empty string', () => {
      host.search.searchTerm.set('previous');
      host.search.clearSearch();
      expect(host.search.searchTerm()).toBe('');
    });

    it('calls loadPage(1) immediately', () => {
      host.search.clearSearch();
      expect(host.loadPage).toHaveBeenCalledWith(1);
    });

    it('calls loadPage again after a prior search term was set', () => {
      host.search.searchTerm.set('test');
      host.loadPage.calls.reset();

      host.search.clearSearch();
      expect(host.loadPage).toHaveBeenCalledWith(1);
    });
  });

  describe('totalCount computed', () => {
    it('returns pagination.count when pagination is set', () => {
      const pagination: Pagination = {
        page: 1,
        page_size: 10,
        count: 42,
        total_pages: 5,
        has_next: true,
        has_previous: false,
      };
      host.search.pagination.set(pagination);
      expect(host.search.totalCount()).toBe(42);
    });

    it('returns 0 when pagination is null', () => {
      host.search.pagination.set(null);
      expect(host.search.totalCount()).toBe(0);
    });

    it('updates reactively when count changes', () => {
      const pag: Pagination = {
        page: 1, page_size: 20, count: 5, total_pages: 1,
        has_next: false, has_previous: false,
      };
      host.search.pagination.set(pag);
      expect(host.search.totalCount()).toBe(5);

      host.search.pagination.set({ ...pag, count: 100 });
      expect(host.search.totalCount()).toBe(100);
    });
  });
});
