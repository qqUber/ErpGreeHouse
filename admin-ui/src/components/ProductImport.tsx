import { useCallback, useRef, useState } from 'react';
import { api, ImportPreview, ImportResult } from '../api';

interface ProductImportProps {
  onImportComplete?: (result: ImportResult) => void;
  onClose?: () => void;
}

type TabType = 'file' | 'url';

export function ProductImport({ onImportComplete, onClose }: ProductImportProps) {
  const [activeTab, setActiveTab] = useState<TabType>('file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<'json' | 'xml'>('json');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const ext = droppedFile.name.toLowerCase().split('.').pop();
      if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
        setFile(droppedFile);
        setPreview(null);
        setResult(null);
        setError(null);
      } else {
        setError('Поддерживаются только файлы CSV и XLSX');
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreview(null);
      setResult(null);
      setError(null);
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    setBusy(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await api<ImportPreview>('/api/v1/products/import/preview', {
        method: 'POST',
        body: formData,
      });

      setPreview(data);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const handleImportFile = async () => {
    if (!file) return;

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const data: ImportResult = await api('/api/v1/products/import/file', {
        method: 'POST',
        body: formData,
      });

      setResult(data);
      if (onImportComplete) {
        onImportComplete(data);
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const handleImportUrl = async () => {
    if (!url.trim()) {
      setError('Введите URL');
      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const data: ImportResult = await api('/api/v1/products/import/url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim(), format }),
      });

      setResult(data);
      if (onImportComplete) {
        onImportComplete(data);
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setUrl('');
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="modal-overlay" onClick={() => onClose?.()}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
        <div className="modal-header">
          <h3>Импорт товаров</h3>
          <button className="btn-close" onClick={() => onClose?.()}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Tabs */}
          <div className="tabs" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <button
              className={`tab ${activeTab === 'file' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('file');
                handleReset();
              }}
            >
              Загрузка файла
            </button>
            <button
              className={`tab ${activeTab === 'url' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('url');
                handleReset();
              }}
            >
              Импорт по URL
            </button>
          </div>

          {error && (
            <div
              style={{
                padding: 'var(--spacing-md)',
                background: 'var(--bad-light)',
                color: 'var(--bad)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-lg)',
                border: '1px solid rgba(185, 28, 28, 0.25)',
              }}
            >
              {error}
            </div>
          )}

          {result && (
            <div
              style={{
                padding: 'var(--spacing-lg)',
                background: result.errors.length > 0 ? 'var(--warn-light)' : 'var(--good-light)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-lg)',
                border:
                  result.errors.length > 0
                    ? '1px solid rgba(180, 83, 9, 0.25)'
                    : '1px solid rgba(4, 120, 87, 0.25)',
              }}
            >
              <div
                style={{
                  fontWeight: 'var(--font-weight-semibold)',
                  marginBottom: 'var(--spacing-sm)',
                  fontSize: 'var(--font-size-base)',
                }}
              >
                Результат импорта:
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
                <div>
                  Всего: <strong>{result.total}</strong>
                </div>
                <div style={{ color: 'var(--good)' }}>
                  Создано: <strong>{result.created}</strong>
                </div>
                <div style={{ color: 'var(--primary)' }}>
                  Обновлено: <strong>{result.updated}</strong>
                </div>
                {result.errors.length > 0 && (
                  <div style={{ color: 'var(--bad)' }}>
                    Ошибок: <strong>{result.errors.length}</strong>
                  </div>
                )}
              </div>

              {result.errors.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <details>
                    <summary style={{ cursor: 'pointer', color: '#dc2626' }}>
                      Показать ошибки ({result.errors.length})
                    </summary>
                    <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 13 }}>
                      {result.errors.slice(0, 10).map((err, i) => (
                        <li key={i} style={{ marginBottom: 4 }}>
                          {err}
                        </li>
                      ))}
                      {result.errors.length > 10 && (
                        <li>... и ещё {result.errors.length - 10} ошибок</li>
                      )}
                    </ul>
                  </details>
                </div>
              )}

              {result.preview && result.preview.length > 0 && (
                <div style={{ marginTop: 'var(--spacing-md)' }}>
                  <div
                    style={{
                      fontWeight: 'var(--font-weight-semibold)',
                      marginBottom: 'var(--spacing-sm)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  >
                    Предпросмотр:
                  </div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Название</th>
                        <th>Артикул</th>
                        <th>Категория</th>
                        <th>Цена</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.preview.map((item, i) => (
                        <tr key={i}>
                          <td>{item.name}</td>
                          <td>{item.sku}</td>
                          <td>{item.category}</td>
                          <td>{item.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button
                className="btn"
                style={{ marginTop: 'var(--spacing-md)' }}
                onClick={handleReset}
              >
                Импортировать ещё
              </button>
            </div>
          )}

          {!result && (
            <>
              {/* File Upload Tab */}
              {activeTab === 'file' && (
                <div>
                  <div
                    className={`dropzone ${dragActive ? 'active' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--spacing-xl)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: dragActive ? 'var(--primary-light)' : 'var(--brand-light)',
                      transition: 'all 0.2s',
                      borderStyle: dragActive ? 'solid' : 'dashed',
                    }}
                  >
                    {file ? (
                      <div>
                        <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)' }}>
                          📄
                        </div>
                        <div
                          style={{
                            fontWeight: 'var(--font-weight-semibold)',
                            fontSize: 'var(--font-size-base)',
                          }}
                        >
                          {file.name}
                        </div>
                        <div
                          style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--muted)',
                            marginTop: 'var(--spacing-xs)',
                          }}
                        >
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)' }}>
                          📁
                        </div>
                        <div style={{ fontSize: 'var(--font-size-base)' }}>
                          Перетащите файл сюда или нажмите для выбора
                        </div>
                        <div
                          style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--muted)',
                            marginTop: 'var(--spacing-xs)',
                          }}
                        >
                          Поддерживаются CSV, XLSX, XLS
                        </div>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </div>

                  {file && !preview && (
                    <div style={{ marginTop: 'var(--spacing-lg)' }}>
                      <button className="btn" onClick={handlePreview} disabled={busy}>
                        {busy ? 'Загрузка...' : 'Предпросмотр'}
                      </button>
                    </div>
                  )}

                  {preview && (
                    <div style={{ marginTop: 'var(--spacing-lg)' }}>
                      <div
                        style={{
                          fontWeight: 'var(--font-weight-semibold)',
                          marginBottom: 'var(--spacing-sm)',
                          fontSize: 'var(--font-size-sm)',
                        }}
                      >
                        Предпросмотр ({preview.total_rows} строк)
                      </div>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Строка</th>
                            <th>Название</th>
                            <th>Артикул</th>
                            <th>Категория</th>
                            <th>Цена</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows.map((row, i) => (
                            <tr key={i}>
                              <td>{row.row}</td>
                              <td>{row.name}</td>
                              <td>{row.sku}</td>
                              <td>{row.category}</td>
                              <td>{row.price}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 'var(--spacing-lg)',
                      display: 'flex',
                      gap: 'var(--spacing-sm)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      className="btn btnPrimary"
                      onClick={handleImportFile}
                      disabled={!file || busy}
                    >
                      {busy ? 'Импорт...' : 'Импортировать'}
                    </button>
                    {file && (
                      <button className="btn" onClick={handleReset} disabled={busy}>
                        Сбросить
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* URL Import Tab */}
              {activeTab === 'url' && (
                <div>
                  <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: 'var(--spacing-sm)',
                        fontWeight: 'var(--font-weight-semibold)',
                        fontSize: 'var(--font-size-sm)',
                      }}
                    >
                      URL источника данных
                    </label>
                    <input
                      className="input"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/products.json"
                      disabled={busy}
                    />
                  </div>

                  <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: 'var(--spacing-sm)',
                        fontWeight: 'var(--font-weight-semibold)',
                        fontSize: 'var(--font-size-sm)',
                      }}
                    >
                      Формат данных
                    </label>
                    <select
                      className="input"
                      value={format}
                      onChange={(e) => setFormat(e.target.value as 'json' | 'xml')}
                      disabled={busy}
                    >
                      <option value="json">JSON</option>
                      <option value="xml">XML</option>
                    </select>
                  </div>

                  <div
                    style={{
                      padding: 'var(--spacing-md)',
                      background: 'var(--primary-light)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--primary)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                    }}
                  >
                    <strong>Ожидаемый формат JSON:</strong>
                    <pre
                      style={{
                        margin: 'var(--spacing-sm) 0 0',
                        fontSize: 'var(--font-size-xs)',
                        overflow: 'auto',
                        background: 'var(--panel)',
                        padding: 'var(--spacing-sm)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      {`[
  { "name": "Латте", "sku": "DRINK-001", "category": "Напитки", "price": 150 },
  { "name": "Капучино", "sku": "DRINK-002", "category": "Напитки", "price": 140 }
]`}
                    </pre>
                  </div>

                  <div
                    style={{
                      marginTop: 'var(--spacing-lg)',
                      display: 'flex',
                      gap: 'var(--spacing-sm)',
                    }}
                  >
                    <button
                      className="btn btnPrimary"
                      onClick={handleImportUrl}
                      disabled={!url.trim() || busy}
                    >
                      {busy ? 'Импорт...' : 'Импортировать'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductImport;
