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
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 700, width: '90%' }}
      >
        <div className="modal-header">
          <h3>Импорт товаров</h3>
          <button className="btn-close" onClick={() => onClose?.()}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Tabs */}
          <div className="tabs" style={{ marginBottom: 16 }}>
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
                padding: '12px 16px',
                background: '#fee2e2',
                color: '#dc2626',
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          {result && (
            <div
              style={{
                padding: '16px',
                background: result.errors.length > 0 ? '#fef3c7' : '#dcfce7',
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Результат импорта:</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div>
                  Всего: <strong>{result.total}</strong>
                </div>
                <div style={{ color: '#16a34a' }}>
                  Создано: <strong>{result.created}</strong>
                </div>
                <div style={{ color: '#2563eb' }}>
                  Обновлено: <strong>{result.updated}</strong>
                </div>
                {result.errors.length > 0 && (
                  <div style={{ color: '#dc2626' }}>
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
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 500, marginBottom: 8 }}>Предпросмотр:</div>
                  <table className="table" style={{ fontSize: 13 }}>
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

              <button className="btn" style={{ marginTop: 12 }} onClick={handleReset}>
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
                      border: '2px dashed #ccc',
                      borderRadius: 8,
                      padding: '32px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: dragActive ? '#f0f9ff' : '#fafafa',
                      transition: 'all 0.2s',
                    }}
                  >
                    {file ? (
                      <div>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
                        <div style={{ fontWeight: 500 }}>{file.name}</div>
                        <div style={{ fontSize: 13, color: '#666' }}>
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>📁</div>
                        <div>Перетащите файл сюда или нажмите для выбора</div>
                        <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
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
                    <div style={{ marginTop: 16 }}>
                      <button className="btn" onClick={handlePreview} disabled={busy}>
                        {busy ? 'Загрузка...' : 'Предпросмотр'}
                      </button>
                    </div>
                  )}

                  {preview && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontWeight: 500, marginBottom: 8 }}>
                        Предпросмотр ({preview.total_rows} строк)
                      </div>
                      <table className="table" style={{ fontSize: 13 }}>
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

                  <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
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
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
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

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
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
                      padding: '12px 16px',
                      background: '#f0f9ff',
                      borderRadius: 8,
                      fontSize: 13,
                      color: '#0369a1',
                    }}
                  >
                    <strong>Ожидаемый формат JSON:</strong>
                    <pre style={{ margin: '8px 0 0', fontSize: 12, overflow: 'auto' }}>
                      {`[
  { "name": "Латте", "sku": "DRINK-001", "category": "Напитки", "price": 150 },
  { "name": "Капучино", "sku": "DRINK-002", "category": "Напитки", "price": 140 }
]`}
                    </pre>
                  </div>

                  <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
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
