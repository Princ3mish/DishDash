import { useState, useEffect, type ChangeEvent } from 'react';
import type { DishEntry, Draft } from '../types';
import { isDirty } from '../hooks/useDishes';
import { DishImage } from './DishImage';

type DishCardProps = {
  entry: DishEntry;
  onEdit: (patch: Partial<Draft>) => void;
  onDiscard: () => void;
  onSave: () => void;
  onReload: () => void;
};

export function DishCard({
  entry,
  onEdit,
  onDiscard,
  onSave,
  onReload,
}: DishCardProps) {
  const { saved, draft, saving, error, conflict, newerAvailable } = entry;
  const dirty = isDirty(entry);
  const [confirmingReload, setConfirmingReload] = useState(false);

  useEffect(() => {
    if (!entry.conflict && !entry.newerAvailable) {
      setConfirmingReload(false);
    }
  }, [entry.conflict, entry.newerAvailable]);

  const nameInputId = `dish-name-${saved.dishId}`;
  const publishedInputId = `dish-published-${saved.dishId}`;
  const saveBtnId = `dish-save-${saved.dishId}`;
  const discardBtnId = `dish-discard-${saved.dishId}`;
  const reloadBtnId = `dish-reload-${saved.dishId}`;
  const loadLatestBtnId = `dish-load-latest-${saved.dishId}`;

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    onEdit({ dishName: e.target.value });
  };

  const handlePublishedChange = (e: ChangeEvent<HTMLInputElement>) => {
    onEdit({ isPublished: e.target.checked });
  };

  return (
    <article className="dish-card" data-dirty={dirty}>
      <DishImage src={saved.imageUrl} alt={saved.dishName} />

      <div className="dish-card-body">
        <div className="dish-meta">
          <span>ID: {saved.dishId}</span>
          <span>Version: {saved.version}</span>
        </div>

        <div className="dish-status-row">
          <span className={`status-pill ${saved.isPublished ? 'published' : 'draft'}`}>
            {saved.isPublished ? 'Published' : 'Draft'}
          </span>
          {dirty ? (
            <span className="badge-unsaved">Unsaved changes</span>
          ) : (
            <span className="badge-saved">Saved</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor={nameInputId}>Dish name</label>
          <input
            id={nameInputId}
            type="text"
            value={draft.dishName}
            onChange={handleNameChange}
            disabled={saving}
          />
        </div>

        <div className="form-group-checkbox">
          <label htmlFor={publishedInputId}>
            <input
              id={publishedInputId}
              type="checkbox"
              checked={draft.isPublished}
              onChange={handlePublishedChange}
              disabled={saving}
            />
            Published
          </label>
        </div>

        {dirty && (
          <div className="saved-value-line">
            Saved value: {saved.dishName} ({saved.isPublished ? 'Published' : 'Draft'})
          </div>
        )}

        <div className="button-group">
          <button
            id={saveBtnId}
            type="button"
            className="btn-save"
            onClick={onSave}
            disabled={!dirty || saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            id={discardBtnId}
            type="button"
            className="btn-discard"
            onClick={onDiscard}
            disabled={!dirty || saving}
          >
            Discard
          </button>
        </div>

        {error && (
          <div role="alert" className="error-message">
            {error}
          </div>
        )}

        {conflict && (
          <div role="alert" className="conflict-banner">
            <p>
              This dish was updated elsewhere (now version {conflict.version}). Your draft is preserved.
            </p>
            {confirmingReload ? (
              <>
                <p>This will discard your unsaved changes for this dish.</p>
                <div className="button-group">
                  <button
                    type="button"
                    onClick={() => {
                      onReload();
                      setConfirmingReload(false);
                    }}
                  >
                    Yes, discard my draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingReload(false)}
                  >
                    Keep editing
                  </button>
                </div>
              </>
            ) : (
              <button
                id={reloadBtnId}
                type="button"
                onClick={() => setConfirmingReload(true)}
              >
                Reload latest
              </button>
            )}
            <small className="conflict-warning">
              Reloading discards your local draft.
            </small>
          </div>
        )}

        {dirty && newerAvailable && !conflict && (
          <div role="status" className="newer-banner">
            <p>
              Newer saved data is available (version {newerAvailable.version}). Your draft is preserved.
            </p>
            {confirmingReload ? (
              <>
                <p>This will discard your unsaved changes for this dish.</p>
                <div className="button-group">
                  <button
                    type="button"
                    onClick={() => {
                      onReload();
                      setConfirmingReload(false);
                    }}
                  >
                    Yes, discard my draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingReload(false)}
                  >
                    Keep editing
                  </button>
                </div>
              </>
            ) : (
              <button
                id={loadLatestBtnId}
                type="button"
                onClick={() => setConfirmingReload(true)}
              >
                Load latest
              </button>
            )}
            <small className="newer-warning">
              Loading the latest version discards your local draft.
            </small>
          </div>
        )}
      </div>
    </article>
  );
}
