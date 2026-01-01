import { useMemo, useState } from 'react';
import './App.css';

const getStoredAuth = () => {
  try {
    return localStorage.getItem('todo-auth') === 'true';
  } catch (error) {
    return false;
  }
};

const setStoredAuth = (value) => {
  try {
    if (value) {
      localStorage.setItem('todo-auth', 'true');
    } else {
      localStorage.removeItem('todo-auth');
    }
  } catch (error) {
    return;
  }
};

function App() {
  const passcode = useMemo(() => {
    return import.meta.env.VITE_TODO_PASSCODE || 'Frankie2026!';
  }, []);
  const [isAuthed, setIsAuthed] = useState(getStoredAuth);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (value.trim() === passcode) {
      setIsAuthed(true);
      setStoredAuth(true);
      setValue('');
      setError('');
      return;
    }
    setIsAuthed(false);
    setStoredAuth(false);
    setError('Passcode does not match.');
  };

  const handleSignOut = () => {
    setIsAuthed(false);
    setStoredAuth(false);
    setValue('');
    setError('');
  };

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <div className="app__name">Todo</div>
          <div className="app__subtitle">Private workspace</div>
        </div>
        {isAuthed ? (
          <button className="ghost-button" type="button" onClick={handleSignOut}>
            Sign out
          </button>
        ) : null}
      </header>

      <main className="panel">
        {!isAuthed ? (
          <>
            <h1>Enter passcode</h1>
            <p className="muted">
              This is a private space. Enter your passcode to continue.
            </p>
            <form className="form" onSubmit={handleSubmit}>
              <label className="field">
                Passcode
                <input
                  autoFocus
                  type="password"
                  autoComplete="current-password"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="Enter passcode"
                />
              </label>
              <button className="primary-button" type="submit">
                Unlock
              </button>
            </form>
            {error ? <div className="error" role="status">{error}</div> : null}
          </>
        ) : (
          <>
            <h1>Ready for your build.</h1>
            <p className="muted">
              We can start shaping the todo experience now. Tell me the core
              flows you want and I will build it out.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
