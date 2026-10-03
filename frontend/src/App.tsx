import { useDishes } from './hooks/useDishes';
import { DishCard } from './components/DishCard';

export function App() {
  const {
    status,
    loadError,
    order,
    entries,
    connection,
    lastUpdated,
    load,
    edit,
    discard,
    save,
    reloadFromServer,
  } = useDishes();

  return (
    <div className="app-container">
      <header>
        <h1>Dish Dashboard</h1>
        <p>Edits stay local until you click Save.</p>
        {status === 'ready' && (
          <p className="connection-status" data-state={connection} role="status">
            {connection === 'online'
              ? `Live updates on${lastUpdated ? ` - last checked ${new Date(lastUpdated).toLocaleTimeString()}` : ''}`
              : 'Connection lost - showing last known data, retrying...'}
          </p>
        )}
      </header>

      {status === 'loading' && (
        <p className="state-message" role="status">
          Loading dishes...
        </p>
      )}

      {status === 'error' && (
        <div className="state-message" role="alert">
          <p>{loadError}</p>
          <button type="button" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {status === 'ready' && order.length === 0 && (
        <p className="state-message">
          No dishes found. Run the seed command to add dishes.
        </p>
      )}

      {status === 'ready' && order.length > 0 && (
        <main>
          <div className="dish-grid">
            {order.map((dishId) => {
              const entry = entries[dishId];
              if (!entry) return null;
              return (
                <DishCard
                  key={dishId}
                  entry={entry}
                  onEdit={(patch) => edit(dishId, patch)}
                  onDiscard={() => discard(dishId)}
                  onSave={() => save(dishId)}
                  onReload={() => reloadFromServer(dishId)}
                />
              );
            })}
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
