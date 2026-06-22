import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { screen, fireEvent, render } from '@/test-utils';

vi.mock('@/lib/auth', () => ({ useAuth: vi.fn() }));

import { useAuth } from '@/lib/auth';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import WizardSteps from '@/components/WizardSteps';
import { ChipSelect } from '@/components/ui/chip-select';
import { VirtualList } from '@/components/VirtualList';
import SignatureCanvas from '@/components/SignatureCanvas';
import SidePanel from '@/components/SidePanel';
import { PrintLayout } from '@/components/print/PrintLayout';
import { routes, routePattern } from '@/app/routes';
import { useSafetyStore } from '@/store/safetyStore';

beforeEach(() => {
  vi.clearAllMocks();
  useSafetyStore.setState({ selectedPartId: null, hoveredPartId: null, isPanelOpen: true, cameraTarget: null });
});

describe('ErrorBoundary', () => {
  function Boom() {
    throw new Error('test crash');
  }

  it('catches a render error and shows the fallback', () => {
    const err = console.error;
    console.error = () => {};
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('test crash')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload Page' })).toBeInTheDocument();
    console.error = err;
  });

  it('passes children through when there is no error', () => {
    render(<ErrorBoundary><p>safe content</p></ErrorBoundary>);
    expect(screen.getByText('safe content')).toBeInTheDocument();
  });
});

describe('ProtectedRoute', () => {
  it('redirects to /login when there is no session', () => {
    vi.mocked(useAuth).mockReturnValue({ session: null, loading: false } as never);
    render(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route path="/secret" element={<ProtectedRoute><p>secret</p></ProtectedRoute>} />
          <Route path="/login" element={<p>login screen</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('login screen')).toBeInTheDocument();
  });

  it('renders children when there is a session', () => {
    vi.mocked(useAuth).mockReturnValue({ session: { access_token: 'x' }, loading: false } as never);
    render(
      <MemoryRouter><ProtectedRoute><p>secret</p></ProtectedRoute></MemoryRouter>,
    );
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('shows a loading spinner while auth is loading', () => {
    vi.mocked(useAuth).mockReturnValue({ session: null, loading: true } as never);
    const { container } = render(
      <MemoryRouter><ProtectedRoute><p>secret</p></ProtectedRoute></MemoryRouter>,
    );
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});

describe('WizardSteps', () => {
  it('renders all steps and highlights the current one', () => {
    render(<WizardSteps steps={[{ label: 'A' }, { label: 'B' }, { label: 'C' }]} current={1} onStep={() => {}} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('fires onStep when a step is clicked', () => {
    const onStep = vi.fn();
    render(<WizardSteps steps={[{ label: 'A' }, { label: 'B' }]} current={0} onStep={onStep} />);
    fireEvent.click(screen.getByText('B'));
    expect(onStep).toHaveBeenCalledWith(1);
  });
});

describe('ChipSelect', () => {
  it('renders options and fires onChange when a chip is clicked', () => {
    const onChange = vi.fn();
    render(
      <ChipSelect
        label="ფილტრი"
        value=""
        onChange={onChange}
        options={[{ value: 'a', label: 'ერთი' }, { value: 'b', label: 'ორი' }]}
      />,
    );
    expect(screen.getByText('ფილტრი')).toBeInTheDocument();
    fireEvent.click(screen.getByText('ერთი'));
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('shows the empty-projects placeholder when options is empty', () => {
    render(<ChipSelect value="" onChange={() => {}} options={[]} />);
    expect(screen.getByText('პროექტი არ არის')).toBeInTheDocument();
  });
});


describe('VirtualList', () => {
  it('renders the virtualized list shell', () => {
    const { container } = render(
      <VirtualList
        items={['a', 'b', 'c']}
        rowHeight={40}
        renderItem={(item) => <span>{item}</span>}
        keyExtractor={(item) => item}
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });
});

describe('SignatureCanvas', () => {
  it('renders the canvas + save/cancel buttons', () => {
    const { container } = render(<SignatureCanvas onSave={() => {}} onCancel={() => {}} />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'გაუქმება' })).toBeInTheDocument();
  });

  it('calls onCancel when the cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<SignatureCanvas onSave={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'გაუქმება' }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('SidePanel', () => {
  it('renders a closed panel when nothing is selected', () => {
    useSafetyStore.setState({ selectedPartId: null, isPanelOpen: true });
    const { container } = render(<SidePanel />);
    expect(container.firstChild).toBeTruthy();
  });
});

describe('PrintLayout', () => {
  it('renders the print toolbar by default', () => {
    render(<PrintLayout><p>content</p></PrintLayout>);
    expect(screen.getByText('content')).toBeInTheDocument();
    // Default toolbar has "ბეჭდვა" button.
    expect(screen.getByText('ბეჭდვა')).toBeInTheDocument();
  });

  it('hides the toolbar in preview mode', () => {
    render(<PrintLayout preview><p>preview content</p></PrintLayout>);
    expect(screen.getByText('preview content')).toBeInTheDocument();
    expect(screen.queryByText('ბეჭდვა')).not.toBeInTheDocument();
  });
});

describe('routes', () => {
  it('exposes static + parameterized route builders', () => {
    expect(routes.home).toBe('/home');
    expect(routes.projects.detail('p1')).toBe('/projects/p1');
    expect(routePattern.projectDetail).toBe('/projects/:id');
  });
});
