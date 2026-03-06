import React from 'react';

interface Product {
  code: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface CategoryPerformance {
  category: string;
  transactions: number;
  items_sold: number;
  revenue: number;
}

interface TrendingProduct {
  code: string;
  name: string;
  this_week: number;
  last_week: number;
  growth_percent: number;
}

interface ProductData {
  top_products_today: Product[];
  category_performance: CategoryPerformance[];
  trending_products: TrendingProduct[];
  date: string;
}

interface ProductsWidgetProps {
  data: ProductData;
}

export const ProductsWidget: React.FC<ProductsWidgetProps> = ({ data }) => {
  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'var(--good)';
    if (growth < 0) return 'var(--bad)';
    return 'var(--muted)';
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return '↑';
    if (growth < 0) return '↓';
    return '→';
  };

  return (
    <div className="card cardFull" data-testid="admin_widget_products_en" role="region" aria-label="Products">
      <div className="row mb-4">
        <div style={{ 
          fontWeight: 'var(--font-weight-extrabold)', 
          fontSize: 'var(--font-size-xl)'
        }}>
          Товары
        </div>
        <span style={{ 
          fontSize: 'var(--font-size-sm)', 
          color: 'var(--muted)'
        }}>
          Дата: {new Date(data.date).toLocaleDateString('ru-RU')}
        </span>
      </div>

      <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
        {/* Top Products Today */}
        {data.top_products_today.length > 0 && (
          <div>
            <div style={{ 
              fontSize: 'var(--font-size-sm)', 
              fontWeight: 'var(--font-weight-semibold)', 
              color: 'var(--text)', 
              marginBottom: 'var(--spacing-sm)'
            }}>
              Топ товаров сегодня
            </div>
            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
              {data.top_products_today.slice(0, 5).map((product) => (
                <div
                  key={product.code}
                  className="row"
                  style={{ 
                    padding: 'var(--spacing-sm)', 
                    borderRadius: 'var(--radius-md)', 
                    background: 'var(--brand-light)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary-light)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--brand-light)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: 'var(--font-size-sm)', 
                      fontWeight: 'var(--font-weight-semibold)', 
                      color: 'var(--text)'
                    }}>
                      {product.name}
                    </div>
                    <div style={{ 
                      fontSize: 'var(--font-size-xs)', 
                      color: 'var(--muted)'
                    }}>
                      {product.code}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontSize: 'var(--font-size-sm)', 
                      fontWeight: 'var(--font-weight-bold)', 
                      color: 'var(--text)'
                    }}>
                      {product.quantity} шт
                    </div>
                    <div style={{ 
                      fontSize: 'var(--font-size-xs)', 
                      color: 'var(--muted)'
                    }}>
                      {product.revenue.toFixed(2)} ₽
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Performance */}
        {data.category_performance.length > 0 && (
          <div>
            <div style={{ 
              fontSize: 'var(--font-size-sm)', 
              fontWeight: 'var(--font-weight-semibold)', 
              color: 'var(--text)', 
              marginBottom: 'var(--spacing-sm)'
            }}>
              Категории
            </div>
            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
              {data.category_performance.map((category) => (
                <div
                  key={category.category}
                  className="row"
                  style={{ 
                    padding: 'var(--spacing-sm)', 
                    borderRadius: 'var(--radius-md)', 
                    background: 'var(--brand-light)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary-light)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--brand-light)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text)' }}>
                    {category.category}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)' }}>
                    {category.items_sold} шт · {category.revenue.toFixed(2)} ₽
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trending Products */}
        {data.trending_products.length > 0 && (
          <div>
            <div style={{ 
              fontSize: 'var(--font-size-sm)', 
              fontWeight: 'var(--font-weight-semibold)', 
              color: 'var(--text)', 
              marginBottom: 'var(--spacing-sm)'
            }}>
              Тренды
            </div>
            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
              {data.trending_products.slice(0, 3).map((product) => (
                <div
                  key={product.code}
                  className="row"
                  style={{ 
                    padding: 'var(--spacing-sm)', 
                    borderRadius: 'var(--radius-md)', 
                    background: 'var(--brand-light)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary-light)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--brand-light)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: 'var(--font-size-sm)', 
                      fontWeight: 'var(--font-weight-semibold)', 
                      color: 'var(--text)'
                    }}>
                      {product.name}
                    </div>
                    <div style={{ 
                      fontSize: 'var(--font-size-xs)', 
                      color: 'var(--muted)'
                    }}>
                      {product.code}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontSize: 'var(--font-size-sm)', 
                      fontWeight: 'var(--font-weight-bold)', 
                      color: 'var(--text)'
                    }}>
                      {product.this_week} шт
                    </div>
                    <div style={{ 
                      fontSize: 'var(--font-size-xs)', 
                      color: getGrowthColor(product.growth_percent)
                    }}>
                      {getGrowthIcon(product.growth_percent)} {Math.abs(product.growth_percent).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};