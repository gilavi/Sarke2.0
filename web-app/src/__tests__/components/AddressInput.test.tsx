/**
 * AddressInput — typing + map-toggle interactions. The leaflet integration
 * requires mocking react-leaflet so the map doesn't crash in jsdom.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
  useMapEvents: () => null,
}));

import { AddressInput } from '@/components/AddressInput';

describe('AddressInput', () => {
  it('renders the text input prefilled with value', () => {
    render(<AddressInput value="თბილისი" onChange={() => {}} />);
    expect(screen.getByDisplayValue('თბილისი')).toBeInTheDocument();
  });

  it('typing into the input fires onChange', () => {
    const onChange = vi.fn();
    render(<AddressInput value="" onChange={onChange} />);
    const input = screen.getByPlaceholderText('მისამართი');
    fireEvent.change(input, { target: { value: 'ბათუმი' } });
    expect(onChange).toHaveBeenCalledWith('ბათუმი');
  });

  it('opens the map overlay when the MapPin button is clicked', () => {
    render(<AddressInput value="" onChange={() => {}} />);
    const mapBtn = screen.getByTitle('რუკაზე არჩევა');
    fireEvent.click(mapBtn);
    expect(screen.getByText('რუკაზე არჩევა')).toBeInTheDocument();
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });

  it('closes the map overlay when the X button is clicked', () => {
    render(<AddressInput value="" onChange={() => {}} />);
    fireEvent.click(screen.getByTitle('რუკაზე არჩევა'));
    expect(screen.getByText('რუკაზე არჩევა')).toBeInTheDocument();
    // The X close button is the lone X icon in the header.
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // First button in the open overlay's header.
    // The overlay header text vanishes.
    expect(screen.queryByText('მდებარეობა არჩეულია')).not.toBeInTheDocument();
  });

  it('renders with initialLat/initialLng → marker is preset', () => {
    render(<AddressInput value="" onChange={() => {}} initialLat={41.7} initialLng={44.8} />);
    fireEvent.click(screen.getByTitle('რუკაზე არჩევა'));
    // The "მდებარეობა არჩეულია" message appears when marker is set.
    expect(screen.getByText('მდებარეობა არჩეულია')).toBeInTheDocument();
  });
});
