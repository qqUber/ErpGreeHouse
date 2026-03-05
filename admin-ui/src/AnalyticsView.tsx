import ReactECharts from 'echarts-for-react';
import { useEffect, useState } from 'react';
import { Api, DashboardOverview, ChartData, LoyaltyReportOverview, LoyaltyDetailedReport, CustomerSegmentation } from './api';

export function AnalyticsView() {
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [salesChart, setSalesChart] = useState<ChartData | null>(null);
  const [customerChart, setCustomerChart] = useState<ChartData | null>(null);
  const [loyaltyChart, setLoyaltyChart] = useState<ChartData | null>(null);
  const [loyaltyOverview, setLoyaltyOverview] = useState<LoyaltyReportOverview | null>(null);
  const [loyaltyDetails, setLoyaltyDetails] = useState<LoyaltyDetailedReport | null>(null);
  const [segmentation, setSegmentation] = useState<CustomerSegmentation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  async function loadAnalyticsData() {
    setLoading(true);
    setError(null);
    try {
      const [
        overviewData,
        salesData,
        customerData,
        loyaltyData,
        loyaltyReport,
        loyaltyDetailed,
        segmentationData,
      ] = await Promise.all([
        Api.dashboardOverview(timeRange),
        Api.salesChart(timeRange),
        Api.customerChart(timeRange),
        Api.loyaltyChart(timeRange),
        Api.loyaltyReportOverview(timeRange),
        Api.loyaltyDetailedReport(timeRange),
        Api.customerSegmentation(),
      ]);

      setOverview(overviewData);
      setSalesChart(salesData);
      setCustomerChart(customerData);
      setLoyaltyChart(loyaltyData);
      setLoyaltyOverview(loyaltyReport);
      setLoyaltyDetails(loyaltyDetailed);
      setSegmentation(segmentationData);
    } catch (e) {
      console.error('Failed to load analytics:', e);
      setError('Не удалось загрузить аналитику');
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(type: string) {
    try {
      let response: Response;
      let filename: string;

      switch (type) {
        case 'loyalty':
          response = await Api.exportLoyaltyReport(timeRange);
          filename = `loyalty_report_${timeRange}.csv`;
          break;
        case 'sales':
          response = await Api.exportSalesReport(timeRange);
          filename = `sales_report_${timeRange}.csv`;
          break;
        case 'customers':
          response = await Api.exportCustomersReport(timeRange);
          filename = `customers_report_${timeRange}.csv`;
          break;
        default:
          throw new Error('Unknown export type');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Export failed:', e);
      alert('Не удалось экспортировать данные');
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Аналитика и Отчеты</h1>
          <p className="text-gray-600 mt-1">Ключевые метрики и отчеты по системе</p>
        </div>
        <div className="flex space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="24h">24 часа</option>
            <option value="7d">7 дней</option>
            <option value="30d">30 дней</option>
            <option value="90d">90 дней</option>
            <option value="1y">1 год</option>
          </select>
          <button
            onClick={() => handleExport('loyalty')}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Экспорт лояльности
          </button>
          <button
            onClick={() => handleExport('sales')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Экспорт продаж
          </button>
          <button
            onClick={() => handleExport('customers')}
            className="btn btnPrimary"
            style={{ 
              background: 'var(--primary)',
              color: 'white',
              borderColor: 'rgba(59, 130, 246, 0.3)',
              fontSize: 13,
              padding: '8px 16px'
            }}
          >
            Экспорт клиентов
          </button>
        </div>
      </div>

       {/* Key Metrics Overview */}
       {overview && (
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{ 
                  width: 32, 
                  height: 32, 
                  background: 'var(--primary)', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <span style={{ color: 'white', fontWeight: 'bold' }}>👥</span>
                </div>
              </div>
              <div style={{ marginLeft: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>Общее число клиентов</p>
                <p style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--text)' }}>
                  {overview.metrics.total_customers}
                </p>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{ 
                  width: 32, 
                  height: 32, 
                  background: 'var(--good)', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <span style={{ color: 'white', fontWeight: 'bold' }}>📈</span>
                </div>
              </div>
              <div style={{ marginLeft: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>Новые клиенты</p>
                <p style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--text)' }}>
                  {overview.metrics.new_customers}
                </p>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{ 
                  width: 32, 
                  height: 32, 
                  background: 'rgba(168, 85, 247, 0.8)', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <span style={{ color: 'white', fontWeight: 'bold' }}>💰</span>
                </div>
              </div>
              <div style={{ marginLeft: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>Выручка</p>
                <p style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--text)' }}>
                  {new Intl.NumberFormat('ru-RU').format(overview.metrics.revenue)} ₽
                </p>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{ 
                  width: 32, 
                  height: 32, 
                  background: 'var(--warn)', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <span style={{ color: 'white', fontWeight: 'bold' }}>🎯</span>
                </div>
              </div>
              <div style={{ marginLeft: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>Средний чек</p>
                <p style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--text)' }}>
                  {new Intl.NumberFormat('ru-RU').format(overview.metrics.avg_check)} ₽
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        {salesChart && (
          <div className="card cardFull" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--text)', marginBottom: 16 }}>
              Динамика продаж
            </h3>
            <ReactECharts
              option={getSalesChartOption(salesChart.data)}
              style={{ height: '300px' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        )}

        {/* Customers Chart */}
        {customerChart && (
          <div className="card cardFull" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--text)', marginBottom: 16 }}>
              Динамика клиентов
            </h3>
            <ReactECharts
              option={getCustomersChartOption(customerChart.data)}
              style={{ height: '300px' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        )}
      </div>

      {/* Loyalty Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loyalty Overview */}
        {loyaltyOverview && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Лояльность</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Начислено баллов</p>
                  <p className="text-xl font-bold text-gray-900">
                    {loyaltyOverview.metrics.points_earned}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Использовано баллов</p>
                  <p className="text-xl font-bold text-gray-900">
                    {loyaltyOverview.metrics.points_redeemed}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Конверсия в вызовы</p>
                  <p className="text-xl font-bold text-gray-900">
                    {loyaltyOverview.metrics.redemption_rate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Средние баллы на транзакцию</p>
                  <p className="text-xl font-bold text-gray-900">
                    {loyaltyOverview.metrics.avg_points_per_transaction.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loyalty Chart */}
        {loyaltyChart && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Лояльность по дням</h3>
            <ReactECharts
              option={getLoyaltyChartOption(loyaltyChart.data)}
              style={{ height: '300px' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        )}
      </div>

      {/* Customer Segmentation */}
      {segmentation && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Сегментация клиентов</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {Object.entries(segmentation.segments).map(([segment, data]) => (
              <div key={segment} className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-600 capitalize">
                  {getSegmentDisplayName(segment)}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{data.count}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {((data.count / segmentation.total_customers) * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loyalty Details Table */}
      {loyaltyDetails && loyaltyDetails.customer_data.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Детализация по клиентам</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Клиент
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Телефон
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Транзакции
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Общая сумма
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Начислено
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Использовано
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Последняя транзакция
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loyaltyDetails.customer_data.slice(0, 10).map((customer) => (
                  <tr key={customer.customer_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{customer.full_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.transaction_count}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Intl.NumberFormat('ru-RU').format(customer.total_spent)} ₽
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.points_earned}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.points_redeemed}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(customer.last_transaction).toLocaleDateString('ru-RU')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loyaltyDetails.customer_data.length > 10 && (
            <div className="mt-4 text-sm text-gray-500">
              Показано {10} из {loyaltyDetails.customer_data.length} записей
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getSegmentDisplayName(segment: string): string {
  const displayNames: Record<string, string> = {
    new: 'Новые',
    active: 'Активные',
    at_risk: 'Риск',
    churned: 'От流失',
    vip: 'VIP',
  };
  return displayNames[segment] || segment;
}

function getSalesChartOption(data: ChartData['data']) {
  const dates = data.map((d) => d.date);
  const revenue = data.map((d) => d.revenue || 0);
  const transactions = data.map((d) => d.transactions || 0);

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#374151' },
      formatter: (params: any) => {
        const date = params[0]?.axisValue;
        const revenueValue = params.find((p: any) => p.seriesName === 'Выручка')?.value;
        const transactionsValue = params.find((p: any) => p.seriesName === 'Транзакции')?.value;
        return `<b>${date}</b><br/>Выручка: ${new Intl.NumberFormat('ru-RU').format(revenueValue)} ₽<br/>Транзакции: ${transactionsValue}`;
      },
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
          formatter: (value: number) => `${(value / 1000).toFixed(0)}k`,
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
        data: revenue,
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

function getCustomersChartOption(data: ChartData['data']) {
  const dates = data.map((d) => d.date);
  const newCustomers = data.map((d) => d.new_customers || 0);
  const activeCustomers = data.map((d) => d.active_customers || 0);

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#374151' },
      formatter: (params: any) => {
        const date = params[0]?.axisValue;
        const newValue = params.find((p: any) => p.seriesName === 'Новые клиенты')?.value;
        const activeValue = params.find((p: any) => p.seriesName === 'Активные клиенты')?.value;
        return `<b>${date}</b><br/>Новые клиенты: ${newValue}<br/>Активные клиенты: ${activeValue}`;
      },
    },
    legend: {
      data: ['Новые клиенты', 'Активные клиенты'],
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
    yAxis: {
      type: 'value',
      name: 'Клиенты',
    },
    series: [
      {
        name: 'Новые клиенты',
        type: 'bar',
        data: newCustomers,
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
          borderRadius: [4, 4, 0, 0],
        },
      },
      {
        name: 'Активные клиенты',
        type: 'line',
        smooth: true,
        data: activeCustomers,
        itemStyle: { color: '#10b981' },
      },
    ],
  };
}

function getLoyaltyChartOption(data: ChartData['data']) {
  const dates = data.map((d) => d.date);
  const pointsEarned = data.map((d) => d.points_earned || 0);
  const pointsRedeemed = data.map((d) => d.points_redeemed || 0);

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#374151' },
      formatter: (params: any) => {
        const date = params[0]?.axisValue;
        const earned = params.find((p: any) => p.seriesName === 'Начислено')?.value;
        const redeemed = params.find((p: any) => p.seriesName === 'Использовано')?.value;
        return `<b>${date}</b><br/>Начислено: ${earned} баллов<br/>Использовано: ${redeemed} баллов`;
      },
    },
    legend: {
      data: ['Начислено', 'Использовано'],
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
    yAxis: {
      type: 'value',
      name: 'Баллы',
    },
    series: [
      {
        name: 'Начислено',
        type: 'line',
        smooth: true,
        data: pointsEarned,
        itemStyle: { color: '#10b981' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.05)' },
            ],
          },
        },
      },
      {
        name: 'Использовано',
        type: 'line',
        smooth: true,
        data: pointsRedeemed,
        itemStyle: { color: '#f59e0b' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(245, 158, 11, 0.3)' },
              { offset: 1, color: 'rgba(245, 158, 11, 0.05)' },
            ],
          },
        },
      },
    ],
  };
}