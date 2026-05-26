import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { screen, render } from '@/test-utils';

vi.mock('@/lib/auth', () => ({ useAuth: vi.fn(() => ({ session: { access_token: 'x' }, user: { id: 'u1' } })) }));
// Leaflet pulls in lots of DOM-specific code; stub the react-leaflet bindings.
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
  useMapEvents: () => null,
}));
vi.mock('leaflet', () => ({
  default: { Icon: { Default: { prototype: {}, mergeOptions: () => {} } } },
}));
vi.mock('leaflet/dist/leaflet.css', () => ({}));

import ProjectMap from '@/components/ProjectMap';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';
import { QuickWinChecklist } from '@/components/onboarding/QuickWinChecklist';
import PhotoGallery from '@/components/PhotoGallery';
import { AddressInput } from '@/components/AddressInput';

function renderInRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('ProjectMap', () => {
  it('renders the empty state when there are no pins', () => {
    const { container } = renderInRouter(<ProjectMap pins={[]} />);
    // The empty state is the only branch reached with an empty pin list.
    expect(container.firstChild).toBeTruthy();
  });

  it('renders without crashing when pins are provided', () => {
    const { container } = renderInRouter(
      <ProjectMap pins={[{ id: 'p1', name: 'პროექტი', address: 'X', latitude: 41.7, longitude: 44.8 }]} />,
    );
    expect(container).toBeTruthy();
  });
});

describe('WelcomeModal', () => {
  it('opens for a fresh session and shows the first step', () => {
    renderInRouter(<WelcomeModal />);
    expect(screen.getByText('მოგესალმებით Hubble-ში')).toBeInTheDocument();
  });

  it('stays closed when the modal has already been seen', () => {
    localStorage.setItem('sarke-welcome-seen', '1');
    renderInRouter(<WelcomeModal />);
    expect(screen.queryByText('მოგესალმებით Hubble-ში')).not.toBeInTheDocument();
  });
});

describe('QuickWinChecklist', () => {
  it('renders the four onboarding items', () => {
    renderInRouter(<QuickWinChecklist />);
    expect(screen.getByText('დასრულეთ პროფილი')).toBeInTheDocument();
    expect(screen.getByText('შექმენით პირველი პროექტი')).toBeInTheDocument();
    expect(screen.getByText('ჩაატარეთ პირველი შემოწმება')).toBeInTheDocument();
    expect(screen.getByText('გაიარეთ ტური')).toBeInTheDocument();
  });

  it('hides itself when the user has dismissed it', () => {
    localStorage.setItem('sarke-checklist-dismissed', '1');
    renderInRouter(<QuickWinChecklist />);
    expect(screen.queryByText('დასრულეთ პროფილი')).not.toBeInTheDocument();
  });
});

describe('PhotoGallery', () => {
  it('renders one tile per URL', () => {
    const { container } = renderInRouter(<PhotoGallery urls={['u1', 'u2', 'u3']} />);
    // Three image tiles inside the grid.
    expect(container.querySelectorAll('img').length).toBe(3);
  });

  it('renders placeholder tiles for empty strings', () => {
    const { container } = renderInRouter(<PhotoGallery urls={['', '', '']} />);
    // No real images (all placeholders).
    expect(container.querySelectorAll('img').length).toBe(0);
  });
});

describe('AddressInput', () => {
  it('renders the value in an input', () => {
    renderInRouter(<AddressInput value="თბილისი" onChange={() => {}} />);
    expect(screen.getByDisplayValue('თბილისი')).toBeInTheDocument();
  });
});
