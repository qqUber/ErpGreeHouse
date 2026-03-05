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
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return '↑';
    if (growth < 0) return '↓';
    return '→';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Товары</h3>
        <span className="text-sm text-gray-600">
          Дата: {new Date(data.date).toLocaleDateString('ru-RU')}
        </span>
      </div>

      <div className="space-y-4">
        {/* Top Products Today */}
        {data.top_products_today.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Топ товаров сегодня</h4>
            <div className="space-y-2">
              {data.top_products_today.slice(0, 5).map((product) => (
                <div
                  key={product.code}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    <div className="text-xs text-gray-500">{product.code}</div>
                  </div>
                  <div className="ml-3 text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {product.quantity} шт
                    </div>
                    <div className="text-xs text-gray-500">
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
            <h4 className="text-sm font-medium text-gray-700 mb-2">Категории</h4>
            <div className="space-y-2">
              {data.category_performance.map((category) => (
                <div
                  key={category.category}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                >
                  <div className="text-sm text-gray-900">{category.category}</div>
                  <div className="text-sm text-gray-600">
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
            <h4 className="text-sm font-medium text-gray-700 mb-2">Тренды</h4>
            <div className="space-y-2">
              {data.trending_products.slice(0, 3).map((product) => (
                <div
                  key={product.code}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    <div className="text-xs text-gray-500">{product.code}</div>
                  </div>
                  <div className="ml-3 text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {product.this_week} шт
                    </div>
                    <div className={`text-xs ${getGrowthColor(product.growth_percent)}`}>
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