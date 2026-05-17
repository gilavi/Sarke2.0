import { create } from 'zustand';

interface Command {
  id: string;
  title: string;
  shortcut?: string;
  icon?: string;
  action: () => void;
}

interface CommandStore {
  commands: Command[];
  isOpen: boolean;
  query: string;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setQuery: (q: string) => void;
  register: (cmd: Command) => void;
  unregister: (id: string) => void;
}

export const useCommandStore = create<CommandStore>((set) => ({
  commands: [],
  isOpen: false,
  query: '',
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, query: '' }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen, query: s.isOpen ? '' : s.query })),
  setQuery: (q) => set({ query: q }),
  register: (cmd) => set((s) => ({ commands: [...s.commands.filter((c) => c.id !== cmd.id), cmd] })),
  unregister: (id) => set((s) => ({ commands: s.commands.filter((c) => c.id !== id) })),
}));
