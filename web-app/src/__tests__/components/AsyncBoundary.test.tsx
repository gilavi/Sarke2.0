import { describe, it, expect } from 'vitest';
import { screen, render } from '@/test-utils';
import { AsyncBoundary, ErrorView, EmptyView } from '@/components/async/AsyncBoundary';

function makeQuery<T>(over: Partial<{ data: T; isLoading: boolean; isError: boolean; error: unknown }>) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...over,
  } as never;
}

describe('AsyncBoundary', () => {
  it('renders the skeleton list while loading (default variant)', () => {
    const { container } = render(
      <AsyncBoundary query={makeQuery({ isLoading: true })}>
        {(data) => <p>{String(data)}</p>}
      </AsyncBoundary>,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders the detail skeleton in detail variant', () => {
    const { container } = render(
      <AsyncBoundary query={makeQuery({ isLoading: true })} variant="detail">
        {() => null}
      </AsyncBoundary>,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders ErrorView (humanized) when isError is true', () => {
    render(
      <AsyncBoundary query={makeQuery({ isError: true, error: new Error('boom') })}>
        {() => null}
      </AsyncBoundary>,
    );
    // Unknown raw errors are mapped to the localized fallback, not shown verbatim.
    expect(screen.getByText('დაფიქსირდა შეცდომა. სცადეთ თავიდან.')).toBeInTheDocument();
  });

  it('renders the default EmptyView when data is null', () => {
    render(
      <AsyncBoundary query={makeQuery({ data: null })}>
        {() => null}
      </AsyncBoundary>,
    );
    expect(screen.getByText('ვერ მოიძებნა.')).toBeInTheDocument();
  });

  it('honors a custom empty string message', () => {
    render(
      <AsyncBoundary query={makeQuery({ data: null })} empty="ცარიელია">
        {() => null}
      </AsyncBoundary>,
    );
    expect(screen.getByText('ცარიელია')).toBeInTheDocument();
  });

  it('uses the custom isEmpty predicate to treat present data as empty', () => {
    render(
      <AsyncBoundary
        query={makeQuery({ data: [] })}
        isEmpty={(arr) => (arr as unknown[]).length === 0}
      >
        {() => <p>has data</p>}
      </AsyncBoundary>,
    );
    expect(screen.queryByText('has data')).not.toBeInTheDocument();
    expect(screen.getByText('ვერ მოიძებნა.')).toBeInTheDocument();
  });

  it('renders children with the data when loaded', () => {
    render(
      <AsyncBoundary query={makeQuery({ data: { name: 'Acme' } })}>
        {(data) => <p>{(data as { name: string }).name}</p>}
      </AsyncBoundary>,
    );
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });
});

describe('ErrorView / EmptyView', () => {
  it('ErrorView humanizes errors to localized copy', () => {
    const { unmount } = render(<ErrorView error="just a string" />);
    expect(screen.getByText('დაფიქსირდა შეცდომა. სცადეთ თავიდან.')).toBeInTheDocument();
    unmount();
    // RLS / permission errors map to the "no permission" message.
    render(<ErrorView error={new Error('new row violates row-level security policy')} />);
    expect(screen.getByText('ამ მოქმედების ნებართვა არ გაქვთ.')).toBeInTheDocument();
  });

  it('EmptyView default message', () => {
    render(<EmptyView />);
    expect(screen.getByText('ვერ მოიძებნა.')).toBeInTheDocument();
  });
});
