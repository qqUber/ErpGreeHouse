import ReactECharts from 'echarts-for-react';
import { useEffect, useState } from 'react';
import { Api, CategoryDistribution, SalesByDay, TopProduct } from '../api';

interface AnalyticsChartsProps {
  days?: number;
}

export function AnalyticsCharts({ days = 30 }: AnalyticsChartsProps) {
  const [salesData, setSalesData] = useState<SalesByDay['sales_by_day']>([]);
  const [topProducts, setTopProducts] = useState<TopProduct['top_products']>([]);
  const [categoryData, setCategoryData] = useState<CategoryDistribution['category_distribution']>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalyticsData();
  }, [days]);

  async function loadAnalyticsData() {
    setLoading(true);
    setError(null);
    try {
      const [sales, products, categories] = await Promise.all([
        Api.salesByDay(days),
        Api.topProducts(days, 10),
        Api.categoryDistribution(days),
      ]);
      setSalesData(sales.sales_by_day);
      setTopProducts(products.top_products);
      setCategoryData(categories.category_distribution);
    } catch (e) {
      console.error('Failed to load analytics:', e);
      setError('Не удалось загрузить аналитику');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Загрузка аналитики...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-red-600">{error}</div>
        <button onClick={loadAnalyticsData} className="mt-2 text-sm text-red-700 underline">
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Sales Dynamics Line Chart */}
      <div className="bg-white rounded-lg shadow p-4 flex-grow min-w-full">
        <h3 className="text-lg font-semibold mb-4">Динамика продаж</h3>
        <ReactECharts
          option={getSalesLineOption(salesData)}
          style={{ height: '300px' }}
          opts={{ renderer: 'svg' }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Products Bar Chart */}
        <div className="bg-white rounded-lg shadow p-4 flex-grow min-w-0">
          <h3 className="text-lg font-semibold mb-4">Топ товаров</h3>
          <ReactECharts
            option={getTopProductsOption(topProducts)}
            style={{ height: '300px' }}
            opts={{ renderer: 'svg' }}
          />
        </div>

        {/* Category Distribution Pie Chart */}
        <div className="bg-white rounded-lg shadow p-4 flex-grow min-w-0">
          <h3 className="text-lg font-semibold mb-4">Распределение по категориям</h3>
          <ReactECharts
            option={getCategoryPieOption(categoryData)}
            style={{ height: '300px' }}
            opts={{ renderer: 'svg' }}
          />
        </div>
      </div>
    </div>
  );
}

function getSalesLineOption(data: SalesByDay['sales_by_day']) {
  const dates = data.map((d) => d.date);
  const amounts = data.map((d) => d.total_amount / 100); // Convert from cents
  const transactions = data.map((d) => d.transactions_count);

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#374151' },
    },
    legend: {
      data: ['Выручка', 'Транзакции'],
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLabel: {
        rotate: 45,
        fontSize: 10,
      },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Выручка (₽)',
        axisLabel: {
          formatter: (value: number) => `${(value / 1000).toFixed(0)}к`,
        },
      },
      {
        type: 'value',
        name: 'Транзакции',
        axisLabel: {
          formatter: (value: number) => `${value}`,
        },
      },
    ],
    series: [
      {
        name: 'Выручка',
        type: 'line',
        smooth: true,
        data: amounts,
        itemStyle: { color: '#3b82f6' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
            ],
          },
        },
      },
      {
        name: 'Транзакции',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: transactions,
        itemStyle: { color: '#10b981' },
      },
    ],
  };
}

function getTopProductsOption(data: TopProduct['top_products']) {
  const reversedData = [...data].reverse();
  const names = reversedData.map((d) =>
    d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name
  );
  const revenues = reversedData.map((d) => d.revenue / 100);

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#374151' },
      formatter: (params: any) => {
        const item = data[data.length - 1 - params[0].dataIndex];
        if (item) {
          return `<b>${item.name}</b><br/>Выручка: ${(item.revenue / 100).toFixed(2)} ₽<br/>Продано: ${item.qty} шт.`;
        }
        return '';
      },
    },
    grid: {
      left: '3%',
      right: '10%',
      bottom: '3%',
      top: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => `${(value / 1000).toFixed(0)}к`,
      },
    },
    yAxis: {
      type: 'category',
      data: names,
      axisLabel: {
        fontSize: 11,
        width: 100,
        overflow: 'truncate',
      },
    },
    series: [
      {
        type: 'bar',
        data: revenues,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#6366f1' },
              { offset: 1, color: '#8b5cf6' },
            ],
          },
          borderRadius: [0, 4, 4, 0],
        },
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => `${(params.value / 1000).toFixed(1)}к`,
          fontSize: 10,
        },
      },
    ],
  };
}

function getCategoryPieOption(data: CategoryDistribution['category_distribution']) {
  const colors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
    '#f97316',
    '#6366f1',
  ];

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#374151' },
      formatter: (params: any) => {
        const item = data[params.dataIndex];
        if (item) {
          return `<b>${item.name}</b><br/>Выручка: ${(item.revenue / 100).toFixed(2)} ₽<br/>Доля: ${params.percent}%`;
        }
        return '';
      },
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { fontSize: 11 },
    },
    series: [
      {
        name: 'Категории',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
          },
        },
        data: data.map((d, i) => ({
          value: d.revenue / 100,
          name: d.name,
          itemStyle: { color: colors[i % colors.length] },
        })),
      },
    ],
  };
}
