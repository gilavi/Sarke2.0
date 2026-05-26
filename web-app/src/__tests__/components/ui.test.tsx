import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

describe('Button', () => {
  it('renders its label and fires onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>შენახვა</Button>);
    const btn = screen.getByRole('button', { name: 'შენახვა' });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders danger and link variants without error', () => {
    render(<Button variant="danger">წაშლა</Button>);
    render(<Button variant="link">ბმული</Button>);
    expect(screen.getByRole('button', { name: 'წაშლა' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ბმული' })).toBeInTheDocument();
  });

  it('buttonVariants stub returns an empty string', () => {
    expect(buttonVariants({ variant: 'ghost', size: 'sm' })).toBe('');
  });
});

describe('Card family', () => {
  it('renders the card with all section sub-components', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle as="h2">სათაური</CardTitle>
          <CardDescription>აღწერა</CardDescription>
        </CardHeader>
        <CardContent>შიგთავსი</CardContent>
        <CardFooter>ფუტერი</CardFooter>
      </Card>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'სათაური' })).toBeInTheDocument();
    expect(screen.getByText('აღწერა')).toBeInTheDocument();
    expect(screen.getByText('შიგთავსი')).toBeInTheDocument();
    expect(screen.getByText('ფუტერი')).toBeInTheDocument();
  });
});
