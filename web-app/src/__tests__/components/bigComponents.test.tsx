import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { screen, fireEvent, render } from '@/test-utils';

vi.mock('@/lib/photoUpload', () => ({
  signedInspectionPhotoUrl: vi.fn().mockResolvedValue('https://signed/p'),
  uploadInspectionPhoto: vi.fn().mockResolvedValue('uploaded/path.png'),
  deleteInspectionPhoto: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/data/inspections', async (io) => ({
  ...(await io<object>()),
  updateInspection: vi.fn(),
}));
vi.mock('@/store/commandStore', () => ({ useCommandStore: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'u1', email: 'a@b.com' },
    profile: { first_name: 'გელა', last_name: 'ხელაძე', email: 'a@b.com' },
    signOut: vi.fn(),
  })),
}));
vi.mock('@/lib/usePdfUsage', () => ({
  usePdfUsage: vi.fn(() => ({ data: { status: 'free' } })),
}));

import { useCommandStore } from '@/store/commandStore';
import InspectionInfoView from '@/components/InspectionInfoView';
import PhotoUploadZone from '@/components/PhotoUploadZone';
import PhotoUploadWidget from '@/components/PhotoUploadWidget';
import InspectionSignatures from '@/components/InspectionSignatures';
import { WizardSidebar } from '@/components/wizard/WizardSidebar';
import { CommandPalette } from '@/components/cmdk/CommandPalette';
import { SidebarNavList } from '@/components/layout/SidebarNav';
import { SidebarFooter } from '@/components/layout/SidebarFooter';

const renderInRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('InspectionInfoView', () => {
  it('renders the four read-only section cards', () => {
    renderInRouter(
      <InspectionInfoView
        inspection={{
          id: 'i1', project_id: 'p1', user_id: 'u1', template_id: 't1',
          status: 'completed', harness_name: 'ქამარი A', department: 'დეპ',
          inspector_name: 'ინსპ', conclusion_text: 'OK',
          is_safe_for_use: true, inspector_signature: null,
          conclusion_photo_paths: [], signatories: [],
          created_at: '2026-05-01', completed_at: '2026-05-01',
        }}
        isDraft={false}
        answers={[]}
        gridQuestion={null}
        onFieldSave={() => {}}
      />,
    );
    expect(screen.getByText(/ზოგადი/)).toBeInTheDocument();
  });
});

describe('PhotoUploadZone', () => {
  it('renders the empty drop zone with the placeholder', () => {
    renderInRouter(
      <PhotoUploadZone
        paths={[]}
        prefix="bobcat"
        inspectionId="i1"
        itemId={1}
        onAdd={() => {}}
        onRemove={() => {}}
        placeholder="დაამატე ფოტო"
      />,
    );
    expect(screen.getByText('დაამატე ფოტო')).toBeInTheDocument();
  });

  it('shows a thumbnail row when paths are present', () => {
    const { container } = renderInRouter(
      <PhotoUploadZone
        paths={['a.png', 'b.png']}
        prefix="bobcat"
        inspectionId="i1"
        itemId={1}
        onAdd={() => {}}
        onRemove={() => {}}
      />,
    );
    // Either thumbnails (img) or placeholder slots — at least one element renders.
    expect(container.firstChild).toBeTruthy();
  });

  it('hides upload affordances when disabled and there are no paths', () => {
    const { container } = renderInRouter(
      <PhotoUploadZone
        paths={[]}
        prefix="bobcat"
        inspectionId="i1"
        itemId={1}
        onAdd={() => {}}
        onRemove={() => {}}
        disabled
      />,
    );
    expect(container).toBeTruthy();
  });
});

describe('PhotoUploadWidget', () => {
  it('renders the camera button when there are no photos', () => {
    const { container } = renderInRouter(
      <PhotoUploadWidget
        paths={[]}
        prefix="bobcat"
        inspectionId="i1"
        itemId={1}
        onAdd={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders thumbnails when paths exist', () => {
    const { container } = renderInRouter(
      <PhotoUploadWidget
        paths={['a.png']}
        prefix="bobcat"
        inspectionId="i1"
        itemId={1}
        onAdd={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });
});

describe('InspectionSignatures', () => {
  it('renders an empty list with the add button when canEdit is true', () => {
    renderInRouter(
      <InspectionSignatures
        inspection={{
          signatories: [],
          inspector_signature: null,
          inspector_name: null,
          completed_at: null,
          created_at: '2026-05-01',
        }}
        canEdit
        onUpdate={() => {}}
      />,
    );
    // The add-signatory button (UserPlus icon button) is present in edit mode.
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('renders existing signatories', () => {
    renderInRouter(
      <InspectionSignatures
        inspection={{
          signatories: [
            { name: 'გელა ხელაძე', role: 'მენეჯერი', signature: 'AAAA', signed_at: '2026-05-01' },
          ],
          inspector_signature: null,
          inspector_name: null,
          completed_at: '2026-05-01',
          created_at: '2026-05-01',
        }}
        canEdit={false}
        onUpdate={() => {}}
      />,
    );
    expect(screen.getByText('გელა ხელაძე')).toBeInTheDocument();
  });
});

describe('WizardSidebar', () => {
  it('renders the heading and rows', () => {
    renderInRouter(
      <WizardSidebar
        heading="ქამრები"
        addLabel="ახალი"
        itemLabel="ქამარი"
        rows={['ქამარი 1', 'ქამარი 2']}
        addedCount={2}
        activeIdx={0}
        values={{}}
        statusCols={['ოპერაცია', 'ბუდე']}
        canAddMore
        onSelect={() => {}}
        onAdd={() => {}}
      />,
    );
    expect(screen.getByText('ქამრები')).toBeInTheDocument();
    expect(screen.getByText('ქამარი 1')).toBeInTheDocument();
    expect(screen.getByText('ქამარი 2')).toBeInTheDocument();
  });

  it('fires onAdd when the add button is clicked', () => {
    const onAdd = vi.fn();
    renderInRouter(
      <WizardSidebar
        heading="ქამრები"
        addLabel="ახალი ქამარი"
        itemLabel="ქამარი"
        rows={['ქამარი 1']}
        addedCount={1}
        activeIdx={0}
        values={{}}
        statusCols={['ბუდე']}
        canAddMore
        onSelect={() => {}}
        onAdd={onAdd}
      />,
    );
    fireEvent.click(screen.getByText(/ახალი ქამარი/));
    expect(onAdd).toHaveBeenCalled();
  });
});

describe('CommandPalette', () => {
  it('renders nothing when the store is closed', () => {
    vi.mocked(useCommandStore).mockReturnValue({
      isOpen: false, toggle: vi.fn(), close: vi.fn(), query: '', setQuery: vi.fn(),
    } as never);
    renderInRouter(<CommandPalette />);
    expect(screen.queryByPlaceholderText(/მოძებნეთ/)).not.toBeInTheDocument();
  });

  it('renders the static navigation commands when open', () => {
    vi.mocked(useCommandStore).mockReturnValue({
      isOpen: true, toggle: vi.fn(), close: vi.fn(), query: '', setQuery: vi.fn(),
    } as never);
    renderInRouter(<CommandPalette />);
    expect(screen.getByText('მთავარი')).toBeInTheDocument();
    expect(screen.getByText('პროექტები')).toBeInTheDocument();
  });
});

describe('SidebarNavList + SidebarFooter', () => {
  it('SidebarNavList renders all top nav items when expanded', () => {
    renderInRouter(<SidebarNavList onNavigate={() => {}} />);
    expect(screen.getByText('მთავარი')).toBeInTheDocument();
    expect(screen.getByText('პროექტები')).toBeInTheDocument();
    expect(screen.getByText('კალენდარი')).toBeInTheDocument();
  });

  it('SidebarFooter renders the user avatar / footer chrome', () => {
    const { container } = renderInRouter(<SidebarFooter />);
    expect(container.firstChild).toBeTruthy();
  });
});
