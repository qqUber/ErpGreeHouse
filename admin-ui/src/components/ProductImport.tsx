import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ImportPreview, ImportResult } from '../api';

interface ProductImportProps {
  onImportComplete?: (result: ImportResult) => void;
  onClose?: () => void;
}

type TabType = 'file' | 'url';

export function ProductImport({ onImportComplete, onClose }: ProductImportProps) {
  const { t } = useTranslation();
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
        setError(t('products.import.errors.unsupportedFormat') || 'Поддерживаются только файлы CSV и XLSX');
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
      setError(t('productImport.errors.enterUrl'));
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
      <div className="modal product-import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t('productImport.title')}</h3>
          <button className="btn-close" onClick={() => onClose?.()}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Tabs */}
          <div className="tabs product-import-tabs">
            <button
              className={`tab ${activeTab === 'file' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('file');
                handleReset();
              }}
            >
              {t('productImport.fileTab')}
            </button>
            <button
              className={`tab ${activeTab === 'url' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('url');
                handleReset();
              }}
            >
              {t('productImport.urlTab')}
            </button>
          </div>

          {error && (
            <div className="product-import-alert product-import-alert-error">
              {error}
            </div>
          )}

          {result && (
            <div
              className={`product-import-result ${result.errors.length > 0 ? 'product-import-result-warning' : 'product-import-result-success'}`}
            >
              <div className="product-import-result-title">
                {t('productImport.result.title')}
              </div>
              <div className="product-import-stats">
                <div>
                  {t('productImport.result.total')} <strong>{result.total}</strong>
                </div>
                <div className="product-import-stat-good">
                  {t('productImport.result.created')} <strong>{result.created}</strong>
                </div>
                <div className="product-import-stat-primary">
                  {t('productImport.result.updated')} <strong>{result.updated}</strong>
                </div>
                {result.errors.length > 0 && (
                  <div className="product-import-stat-error">
                    {t('productImport.result.errors')} <strong>{result.errors.length}</strong>
                  </div>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="product-import-errors">
                  <details>
                    <summary className="product-import-error-summary">
                      {t('productImport.result.showErrors', { count: result.errors.length })}
                    </summary>
                    <ul className="product-import-error-list">
                      {result.errors.slice(0, 10).map((err, i) => (
                        <li key={i} className="product-import-error-item">
                          {err}
                        </li>
                      ))}
                      {result.errors.length > 10 && (
                        <li>{t('productImport.result.moreErrors', { count: result.errors.length - 10 })}</li>
                      )}
                    </ul>
                  </details>
                </div>
              )}

              {result.preview && result.preview.length > 0 && (
                <div className="product-import-preview">
                  <div className="product-import-preview-title">
                    {t('productImport.preview.title')}
                  </div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{t('productImport.tableHeaders.name')}</th>
                        <th>{t('productImport.tableHeaders.sku')}</th>
                        <th>{t('productImport.tableHeaders.category')}</th>
                        <th>{t('productImport.tableHeaders.price')}</th>
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
                className="btn product-import-btn-margin"
                onClick={handleReset}
              >
                {t('productImport.buttons.importMore')}
              </button>
            </div>
          )}

          {!result && (
            <>
              {/* File Upload Tab */}
              {activeTab === 'file' && (
                <div>
                  <div
                    className={`product-import-dropzone ${dragActive ? 'product-import-dropzone-active' : 'product-import-dropzone-inactive'}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {file ? (
                      <div>
                        <div className="product-import-icon">
                          📄
                        </div>
                        <div className="product-import-file-name">
                          {file.name}
                        </div>
                        <div className="product-import-file-size">
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="product-import-icon">
                          📁
                        </div>
                        <div className="product-import-text">
                          {t('productImport.dropzone.dropText')}
                        </div>
                        <div className="product-import-hint">
                          {t('productImport.dropzone.supportedFormats')}
                        </div>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="product-import-hidden-input"
                    />
                  </div>

                  {file && !preview && (
                    <div className="product-import-margin-top">
                      <button className="btn" onClick={handlePreview} disabled={busy}>
                        {busy ? t('productImport.buttons.loading') : t('productImport.buttons.preview')}
                      </button>
                    </div>
                  )}

                  {preview && (
                    <div className="product-import-margin-top">
                      <div className="product-import-preview-title">
                        {t('productImport.preview.rows', { count: preview.total_rows })}
                      </div>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>{t('productImport.preview.row')}</th>
                            <th>{t('productImport.tableHeaders.name')}</th>
                            <th>{t('productImport.tableHeaders.sku')}</th>
                            <th>{t('productImport.tableHeaders.category')}</th>
                            <th>{t('productImport.tableHeaders.price')}</th>
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

                  <div className="product-import-btn-row">
                    <button
                      className="btn btnPrimary"
                      onClick={handleImportFile}
                      disabled={!file || busy}
                    >
                      {busy ? t('productImport.buttons.importing') : t('productImport.buttons.import')}
                    </button>
                    {file && (
                      <button className="btn" onClick={handleReset} disabled={busy}>
                        {t('productImport.buttons.reset')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* URL Import Tab */}
              {activeTab === 'url' && (
                <div>
                  <div className="product-import-form-group">
                    <label className="product-import-label">
                      {t('productImport.url.label')}
                    </label>
                    <input
                      className="input"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder={t('productImport.url.placeholder')}
                      disabled={busy}
                    />
                  </div>

                  <div className="product-import-form-group">
                    <label className="product-import-label">
                      {t('productImport.format.label')}
                    </label>
                    <select
                      className="input"
                      value={format}
                      onChange={(e) => setFormat(e.target.value as 'json' | 'xml')}
                      disabled={busy}
                    >
                      <option value="json">{t('productImport.format.json')}</option>
                      <option value="xml">{t('productImport.format.xml')}</option>
                    </select>
                  </div>

                  <div className="product-import-info-box">
                    <strong>{t('productImport.infoBox')}</strong>
                    <pre className="product-import-code-block">
                      {`[
  { "name": "Latte", "sku": "DRINK-001", "category": "Drinks", "price": 150 },
  { "name": "Cappuccino", "sku": "DRINK-002", "category": "Drinks", "price": 140 }
]`}
                    </pre>
                  </div>

                  <div className="product-import-btn-row">
                    <button
                      className="btn btnPrimary"
                      onClick={handleImportUrl}
                      disabled={!url.trim() || busy}
                    >
                      {busy ? t('productImport.buttons.importing') : t('productImport.buttons.import')}
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
