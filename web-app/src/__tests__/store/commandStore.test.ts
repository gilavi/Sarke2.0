import { describe, it, expect, beforeEach } from 'vitest';
import { useCommandStore } from '@/store/commandStore';

const reset = () =>
  useCommandStore.setState({ commands: [], isOpen: false, query: '' });

beforeEach(reset);

const dummyCmd = (id = 'cmd-1') => ({
  id,
  title: 'Test Command',
  action: () => {},
});

describe('commandStore — initial state', () => {
  it('starts closed with empty commands and query', () => {
    const { isOpen, query, commands } = useCommandStore.getState();
    expect(isOpen).toBe(false);
    expect(query).toBe('');
    expect(commands).toHaveLength(0);
  });
});

describe('commandStore — open / close / toggle', () => {
  it('open() sets isOpen to true', () => {
    useCommandStore.getState().open();
    expect(useCommandStore.getState().isOpen).toBe(true);
  });

  it('close() sets isOpen to false and clears query', () => {
    useCommandStore.setState({ isOpen: true, query: 'foo' });
    useCommandStore.getState().close();
    const { isOpen, query } = useCommandStore.getState();
    expect(isOpen).toBe(false);
    expect(query).toBe('');
  });

  it('toggle() opens when closed', () => {
    useCommandStore.getState().toggle();
    expect(useCommandStore.getState().isOpen).toBe(true);
  });

  it('toggle() closes when open and clears query', () => {
    useCommandStore.setState({ isOpen: true, query: 'bar' });
    useCommandStore.getState().toggle();
    const { isOpen, query } = useCommandStore.getState();
    expect(isOpen).toBe(false);
    expect(query).toBe('');
  });
});

describe('commandStore — setQuery', () => {
  it('updates query', () => {
    useCommandStore.getState().setQuery('projects');
    expect(useCommandStore.getState().query).toBe('projects');
  });
});

describe('commandStore — register / unregister', () => {
  it('register adds a command', () => {
    useCommandStore.getState().register(dummyCmd());
    expect(useCommandStore.getState().commands).toHaveLength(1);
  });

  it('register deduplicates by id (no duplicate entries)', () => {
    useCommandStore.getState().register(dummyCmd('a'));
    useCommandStore.getState().register({ ...dummyCmd('a'), title: 'Updated' });
    const cmds = useCommandStore.getState().commands;
    expect(cmds).toHaveLength(1);
    expect(cmds[0].title).toBe('Updated');
  });

  it('unregister removes the command by id', () => {
    useCommandStore.getState().register(dummyCmd('to-remove'));
    useCommandStore.getState().register(dummyCmd('keep'));
    useCommandStore.getState().unregister('to-remove');
    const cmds = useCommandStore.getState().commands;
    expect(cmds).toHaveLength(1);
    expect(cmds[0].id).toBe('keep');
  });
});
