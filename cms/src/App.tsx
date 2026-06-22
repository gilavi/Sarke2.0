import { useEffect, useState } from 'react';
import { load } from './api';
import { Editor } from './Editor';
import { PasswordGate } from './PasswordGate';
import type { Row } from './types';

type Auth = { pw: string; rows: Row[] };

export function App() {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [booting, setBooting] = useState(true);

  // Re-use the session password on refresh so a reload doesn't kick you out.
  useEffect(() => {
    const pw = sessionStorage.getItem('cms.pw');
    if (!pw) {
      setBooting(false);
      return;
    }
    load(pw)
      .then((rows) => setAuth({ pw, rows }))
      .catch(() => sessionStorage.removeItem('cms.pw'))
      .finally(() => setBooting(false));
  }, []);

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-400">
        იტვირთება…
      </div>
    );
  }

  if (!auth) {
    return <PasswordGate onAuthed={(pw, rows) => setAuth({ pw, rows })} />;
  }

  return (
    <Editor
      initialRows={auth.rows}
      password={auth.pw}
      onAuthLost={() => {
        sessionStorage.removeItem('cms.pw');
        setAuth(null);
      }}
    />
  );
}
